import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REJECTED" | "CHECKED_IN";
export type PaymentStatus = "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  homestayImage?: string;
  customerId?: string;
  customerName?: string;
  checkIn: string;
  checkOut: string;
  totalNights?: number;
  guestsCount: number;
  pricePerNight?: number;
  subTotal?: number;
  discountAmount?: number;
  totalPrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number;
  paymentStatus?: PaymentStatus;
  status: BookingStatus;
  specialRequests?: string;
  contactPhone?: string;
  createdAt?: string;
}

export interface CreateBookingRequest {
  homestayId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  specialRequests?: string;
  contactPhone?: string;
  promotionId?: string;
}

export interface CalculateBookingRequest {
  homestayId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  promotionId?: string;
}

export interface ModifyBookingRequest {
  homestayId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  promotionId?: string;
  contactPhone?: string;
}

export interface CancellationPolicyResponse {
  policy?: string;
  [key: string]: any;
}

const normalizeStatus = (raw: any): BookingStatus => {
  const v = String(raw || "").toUpperCase();
  if (v === "CONFIRMED") return "CONFIRMED";
  if (v === "CANCELLED") return "CANCELLED";
  if (v === "COMPLETED") return "COMPLETED";
  if (v === "REJECTED") return "REJECTED";
  if (v === "CHECKED_IN") return "CHECKED_IN";
  return "PENDING";
};

const cleanLoadingText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^loading\.\.\.$/i.test(value.trim())) return undefined;
  return value;
};

const mapBooking = (item: any): Booking => {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  };
  return {
    id: String(get("id", "Id") ?? ""),
    homestayId: String(get("homestayId", "HomestayId") ?? ""),
    homestayName: cleanLoadingText(get("homestayName", "HomestayName")),
    homestayImage: cleanLoadingText(
      get("homestayImage", "HomestayImage", "homestayImageUrl", "HomestayImageUrl", "imageUrl", "ImageUrl"),
    ),
    customerId: get("customerId", "CustomerId"),
    customerName: cleanLoadingText(get("customerName", "CustomerName")),
    checkIn: String(get("checkIn", "CheckIn") ?? ""),
    checkOut: String(get("checkOut", "CheckOut") ?? ""),
    totalNights: get("totalNights", "TotalNights"),
    guestsCount: Number(get("guestsCount", "GuestsCount") ?? 0),
    pricePerNight: get("pricePerNight", "PricePerNight"),
    subTotal: get("subTotal", "SubTotal"),
    discountAmount: get("discountAmount", "DiscountAmount"),
    totalPrice: get("totalPrice", "TotalPrice"),
    depositAmount: get("depositAmount", "DepositAmount"),
    remainingAmount: get("remainingAmount", "RemainingAmount"),
    depositPercentage: get("depositPercentage", "DepositPercentage") ?? 20,
    paymentStatus: get("paymentStatus", "PaymentStatus") ?? undefined,
    status: normalizeStatus(get("status", "Status")),
    specialRequests: get("specialRequests", "SpecialRequests") ?? undefined,
    contactPhone: get("contactPhone", "ContactPhone") ?? undefined,
    createdAt: get("createdAt", "CreatedAt"),
  };
};

export const bookingService = {
  async getMyBookings(): Promise<Booking[]> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.list);
      const rawList: any[] = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      return rawList.map(mapBooking);
    } catch (error) {
      console.error("Get my bookings error:", error);
      return [];
    }
  },

  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.detail(id));
      const raw = response?.data ?? response;
      if (!raw) return null;
      if (raw?.success && raw?.data) {
        const booking = mapBooking(raw.data);
        return booking.id ? booking : null;
      }
      const booking = mapBooking(raw);
      return booking.id ? booking : null;
    } catch (error) {
      console.error("Get booking detail error:", error);
      return null;
    }
  },

  async createBooking(data: CreateBookingRequest): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.create, data);
      const bookingData = response?.data ?? null;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Dat phong thanh cong!",
        data: bookingData ? mapBooking(bookingData) : undefined,
      };
    } catch (error) {
      console.error("Create booking error:", error);
      return { success: false, message: error instanceof Error ? error.message : "Da xay ra loi khi dat phong" };
    }
  },

  async cancelBooking(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.cancel(id));
      return { success: response?.success ?? true, message: response?.message ?? "Da huy don dat phong thanh cong." };
    } catch (error) {
      console.error("Cancel booking error:", error);
      return { success: false, message: error instanceof Error ? error.message : "Da xay ra loi khi huy booking" };
    }
  },

  async calculate(data: CalculateBookingRequest): Promise<number | null> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.calculate, data);
      const candidates = [response, response?.data, response?.data?.data];
      for (const candidate of candidates) {
        if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
        if (candidate && typeof candidate === "object") {
          for (const key of ["totalPrice", "finalPrice", "price", "amount", "value"]) {
            const value = (candidate as any)[key];
            if (typeof value === "number" && Number.isFinite(value)) return value;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Calculate booking error:", error);
      return null;
    }
  },

  async modifyBooking(id: string, data: ModifyBookingRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.bookings.modify(id), data);
      return { success: response?.success ?? true, message: response?.message ?? "Cap nhat booking thanh cong!" };
    } catch (error) {
      console.error("Modify booking error:", error);
      return { success: false, message: error instanceof Error ? error.message : "Da xay ra loi khi sua booking" };
    }
  },

  async getCancellationPolicy(id: string): Promise<CancellationPolicyResponse | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.cancellationPolicy(id));
      return response?.data ?? response;
    } catch (error) {
      console.error("Get cancellation policy error:", error);
      return null;
    }
  },

  async updateSpecialRequests(id: string, specialRequests: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.specialRequests(id), specialRequests);
      return { success: response?.success ?? true, message: response?.message ?? "Da ghi nhan yeu cau dac biet." };
    } catch (error) {
      console.error("Update special requests error:", error);
      return { success: false, message: error instanceof Error ? error.message : "Da xay ra loi khi cap nhat yeu cau dac biet" };
    }
  },

  async confirmCashPayment(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.post<any>(apiConfig.endpoints.bookings.confirmCashPayment(id));
    return { success: response?.success ?? true, message: response?.message };
  },

  async checkIn(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.put<any>(apiConfig.endpoints.bookings.checkIn(id));
    return { success: response?.success ?? true, message: response?.message };
  },

  async checkOut(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.put<any>(apiConfig.endpoints.bookings.checkOut(id));
    return { success: response?.success ?? true, message: response?.message };
  },

  async addExperienceToBooking(
    bookingId: string,
    body: { localExperienceScheduleId: string; quantity?: number; note?: string },
  ): Promise<any> {
    return apiService.post<any>(apiConfig.endpoints.bookings.addExperiences(bookingId), {
      localExperienceScheduleId: body.localExperienceScheduleId,
      quantity: body.quantity ?? 1,
      note: body.note,
    });
  },

  async cancelMyExperienceBooking(experienceBookingId: string): Promise<any> {
    return apiService.put<any>(apiConfig.endpoints.bookings.cancelMyExperience(experienceBookingId));
  },

  async updateExperienceBookingStatus(experienceBookingId: string, status: string): Promise<any> {
    const q = new URLSearchParams({ status });
    return apiService.patch<any>(
      `${apiConfig.endpoints.bookings.updateExperienceBookingStatus(experienceBookingId)}?${q.toString()}`,
      {},
    );
  },

  async getOccupiedDates(homestayId: string): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.bookings.occupiedDates(homestayId));
  },

  async previewRefund(id: string): Promise<{ estimatedRefund: number; message: string } | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.previewRefund(id));
      const data = response?.data ?? response;
      return {
        estimatedRefund: data?.EstimatedRefund ?? data?.estimatedRefund ?? 0,
        message: data?.Message ?? data?.message ?? "",
      };
    } catch (error) {
      console.error("Preview refund error:", error);
      return null;
    }
  },

  async cancelAndRefund(
    bookingId: string,
    reason: string,
    bankInfo: { bankName: string; accountNumber: string; accountHolderName: string },
  ): Promise<{ isSuccess: boolean; refundAmount: number; message: string }> {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const payload: Record<string, any> = {
      bookingId,
      reason,
      bankName: bankInfo.bankName,
      accountNumber: bankInfo.accountNumber,
      accountHolderName: bankInfo.accountHolderName,
    };
    try {
      const res = await fetch(`${apiConfig.baseURL}${apiConfig.endpoints.bookings.cancelAndRefund}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      const data = body?.data ?? body;
      const isSuccess: boolean = data?.isSuccess ?? data?.IsSuccess ?? body?.success ?? res.ok;
      const refundAmount: number = data?.refundAmount ?? data?.RefundAmount ?? 0;
      const message: string = data?.message ?? data?.Message ?? body?.message ?? (res.ok ? "Huy phong thanh cong." : `Loi ${res.status}`);
      return { isSuccess, refundAmount, message };
    } catch (error) {
      console.error("Cancel and refund error:", error);
      return { isSuccess: false, refundAmount: 0, message: error instanceof Error ? error.message : "Da xay ra loi khi huy booking" };
    }
  },

  async getAvailableExperienceSchedules(bookingId: string): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.experienceBooking.availableSchedules(bookingId));
  },
};
