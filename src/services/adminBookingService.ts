import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Booking, BookingStats, BookingStatus, PaymentStatus, UpdateBookingDTO } from "../types/booking.types";

const extractList = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res as T[];

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data as T[];

  return (data?.items ?? data?.Items ?? data?.bookings ?? []) as T[];
};

const toISO = (value: any): string => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeStatus = (value: any): BookingStatus => {
  const raw = String(value || "").toUpperCase();
  if (raw === "CONFIRMED") return "confirmed";
  if (raw === "CHECKED_IN" || raw === "CHECKEDIN" || raw === "IN_PROGRESS") return "checked_in";
  if (raw === "CHECKED_OUT" || raw === "CHECKEDOUT" || raw === "COMPLETED") return "checked_out";
  if (raw === "CANCELLED" || raw === "REJECTED") return "cancelled";
  return "pending";
};

const normalizePaymentStatus = (value: any): PaymentStatus => {
  const raw = String(value || "").toUpperCase();
  if (raw === "DEPOSIT_PAID") return "deposit_paid";
  if (raw === "FULLY_PAID" || raw === "PAID") return "paid";
  if (raw === "REFUNDED") return "refunded";
  return "pending";
};

const calcNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
};

const toBooking = (item: any): Booking => {
  const id = String(item?.id || "");
  const fallbackCode = id ? id.slice(0, 8) : "";
  const checkInDate = toISO(item?.checkInDate || item?.checkIn);
  const checkOutDate = toISO(item?.checkOutDate || item?.checkOut);
  const numberOfNights = Number(item?.numberOfNights ?? item?.totalNights ?? calcNights(checkInDate, checkOutDate));
  const totalPrice = Number(item?.totalPrice ?? item?.amount ?? 0);
  const fallbackPricePerNight = totalPrice / Math.max(numberOfNights, 1);
  const pricePerNight = Number(item?.pricePerNight ?? fallbackPricePerNight);

  return {
    id,
    bookingCode: String(item?.bookingCode || item?.code || fallbackCode || "N/A"),
    homestayId: item?.homestayId ? String(item.homestayId) : undefined,
    homestayName: String(item?.homestayName || item?.name || item?.propertyName || "Homestay"),
    homestayImage: item?.homestayImage || item?.imageUrl || item?.homestay?.imageUrls?.[0],
    customerName: String(item?.customerName || item?.guestName || "Khách hàng"),
    customerEmail: String(item?.customerEmail || item?.email || ""),
    customerPhone: String(item?.customerPhone || item?.contactPhone || item?.phoneNumber || ""),
    checkInDate,
    checkOutDate,
    numberOfGuests: Number(item?.numberOfGuests ?? item?.guestsCount ?? 1),
    numberOfNights,
    totalPrice,
    pricePerNight,
    status: normalizeStatus(item?.status),
    paymentStatus: normalizePaymentStatus(item?.paymentStatus),
    paymentMethod: item?.paymentMethod,
    specialRequests: item?.specialRequests,
    notes: item?.notes,
    cancellationReason: item?.cancellationReason,
    createdAt: toISO(item?.createdAt),
    confirmedAt: item?.confirmedAt ? toISO(item.confirmedAt) : undefined,
    cancelledAt: item?.cancelledAt ? toISO(item.cancelledAt) : undefined,
  };
};

const toBackendStatus = (status: BookingStatus): string => {
  if (status === "confirmed") return "CONFIRMED";
  if (status === "checked_in") return "CHECKED_IN";
  if (status === "checked_out") return "COMPLETED";
  if (status === "cancelled") return "CANCELLED";
  return "PENDING";
};

const toStats = (bookings: Booking[]): BookingStats => {
  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const checkedIn = bookings.filter((b) => b.status === "checked_in").length;
  const checkedOut = bookings.filter((b) => b.status === "checked_out").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

  return {
    total,
    pending,
    confirmed,
    checkedIn,
    checkedOut,
    cancelled,
    totalRevenue,
    averageBookingValue: total > 0 ? totalRevenue / total : 0,
  };
};

export const adminBookingService = {
  async list<T = any>(params?: Record<string, any>): Promise<T[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.adminBookings.list, params);
    return extractList<T>(res);
  },

  // Same endpoint as list(), named explicitly for admin use-case: bookings of managed homestays.
  async getManagedHomestayBookings<T = any>(params?: Record<string, any>): Promise<T[]> {
    return this.list<T>(params);
  },

  async detail(id: string) {
    return apiService.get<any>(apiConfig.endpoints.adminBookings.detail(id));
  },

  async getAllBookings(params?: Record<string, any>): Promise<Booking[]> {
    const raw = await this.list<any>(params);
    return raw
      .map(toBooking)
      .filter((x) => Boolean(x.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getBookingById(id: string): Promise<Booking | null> {
    try {
      const res = await this.detail(id);
      const payload = res?.data ?? res?.result ?? res;
      if (!payload) return null;
      return toBooking(payload);
    } catch {
      return null;
    }
  },

  async getBookingStats(): Promise<BookingStats> {
    const bookings = await this.getAllBookings();
    return toStats(bookings);
  },

  async updateBooking(id: string, payload: UpdateBookingDTO): Promise<{ success: boolean; message?: string }> {
    try {
      const status = toBackendStatus(payload.status);
      const res = await this.updateStatus(id, status);
      return {
        success: res?.success ?? true,
        message: res?.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Không thể cập nhật đơn đặt phòng",
      };
    }
  },

  /** PUT /api/admin/bookings/{id} — BE expects raw string status [FromBody] */
  async updateStatus(id: string, status: string) {
    return apiService.put<any>(
      apiConfig.endpoints.adminBookings.update(id),
      status,
    );
  },
};
