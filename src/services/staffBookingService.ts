import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type { Booking, BookingStats, PaymentStatus } from '../types/booking.types';

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

const normalizeStatus = (value: any): Booking['status'] => {
  const raw = String(value || '').toUpperCase();
  if (raw === 'CONFIRMED') return 'confirmed';
  if (raw === 'COMPLETED' || raw === 'CHECKED_OUT' || raw === 'CHECKEDOUT') return 'completed';
  if (raw === 'CHECKED_IN' || raw === 'CHECKEDIN' || raw === 'IN_PROGRESS') return 'checked_in';
  if (raw === 'CANCELLED' || raw === 'REJECTED') return 'cancelled';
  return 'pending';
};

const normalizePaymentStatus = (value: any): PaymentStatus => {
  const raw = String(value || '').toUpperCase();
  if (raw === 'DEPOSIT_PAID') return 'deposit_paid';
  if (raw === 'FULLY_PAID' || raw === 'PAID') return 'paid';
  if (raw === 'REFUNDED') return 'refunded';
  return 'pending';
};

const calcNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
};

const toBooking = (item: any): Booking => {
  const id = String(item?.id || '');
  const fallbackCode = id ? id.slice(0, 8) : '';
  const checkInDate = toISO(item?.checkInDate || item?.checkIn);
  const checkOutDate = toISO(item?.checkOutDate || item?.checkOut);
  const numberOfNights = Number(item?.numberOfNights ?? item?.totalNights ?? calcNights(checkInDate, checkOutDate));
  const totalPrice = Number(item?.totalPrice ?? item?.amount ?? 0);
  const fallbackPricePerNight = totalPrice / Math.max(numberOfNights, 1);
  const pricePerNight = Number(item?.pricePerNight ?? fallbackPricePerNight);

  return {
    id,
    bookingCode: String(item?.bookingCode || item?.code || fallbackCode || 'N/A'),
    homestayId: item?.homestayId ? String(item.homestayId) : undefined,
    homestayName: String(item?.homestayName || item?.name || item?.propertyName || 'Homestay'),
    homestayImage: item?.homestayImage || item?.imageUrl || item?.homestay?.imageUrls?.[0],
    customerName: String(item?.customerName || item?.guestName || 'Khách hàng'),
    customerEmail: String(item?.customerEmail || item?.email || ''),
    customerPhone: String(item?.customerPhone || item?.contactPhone || item?.phoneNumber || ''),
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

const toStats = (bookings: Booking[]): BookingStats => {
  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const checkedIn = bookings.filter((b) => b.status === 'checked_in').length;
  const checkedOut = bookings.filter((b) => b.status === 'completed' || b.status === 'checked_out').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
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

export const staffBookingService = {
  async list<T = any>(params?: Record<string, any>): Promise<T[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.staffBookings.list, params);
    return extractList<T>(res);
  },

  async getToday<T = any>(params?: Record<string, any>): Promise<T[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.staffBookings.today, params);
    return extractList<T>(res);
  },

  async detail(id: string) {
    return apiService.get<any>(apiConfig.endpoints.staffBookings.detail(id));
  },

  async create(payload: Record<string, any>) {
    return apiService.post<any>(apiConfig.endpoints.staffBookings.create, payload);
  },

  async confirm(id: string) {
    return apiService.post<any>(apiConfig.endpoints.staffBookings.confirm(id));
  },

  async cancel(id: string) {
    return apiService.post<any>(apiConfig.endpoints.staffBookings.cancel(id));
  },

  async checkIn(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.staffBookings.checkIn(id));
      return {
        success: res?.success ?? true,
        message: res?.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể check-in booking',
      };
    }
  },

  async checkOut(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.staffBookings.checkOut(id));
      return {
        success: res?.success ?? true,
        message: res?.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể check-out booking',
      };
    }
  },

  async extend(id: string, payload: Record<string, any>) {
    return apiService.post<any>(apiConfig.endpoints.staffBookings.extend(id), payload);
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
};
