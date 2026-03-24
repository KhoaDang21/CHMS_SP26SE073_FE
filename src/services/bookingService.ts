import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

// BE BookingResponseDTO fields (exact match):
// id, homestayId, homestayName, customerId, customerName,
// checkIn, checkOut, totalNights, guestsCount,
// pricePerNight, subTotal, discountAmount, totalPrice,
// status ("PENDING"|"CONFIRMED"|"CANCELLED"|"COMPLETED"|"REJECTED"),
// specialRequests, contactPhone, createdAt

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REJECTED" | "CHECKED_IN";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
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
  status: BookingStatus;
  specialRequests?: string;
  contactPhone?: string;
  createdAt?: string;
}

export interface CreateBookingRequest {
  homestayId: string;
  checkIn: string;   // "YYYY-MM-DD"
  checkOut: string;  // "YYYY-MM-DD"
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

// Normalize status về uppercase chuẩn BE
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

const mapBooking = (item: any): Booking => ({
  id: item.id,
  homestayId: item.homestayId,
  homestayName: cleanLoadingText(item.homestayName),
  customerId: item.customerId,
  customerName: cleanLoadingText(item.customerName),
  checkIn: item.checkIn,
  checkOut: item.checkOut,
  totalNights: item.totalNights,
  guestsCount: item.guestsCount,
  pricePerNight: item.pricePerNight,
  subTotal: item.subTotal,
  discountAmount: item.discountAmount,
  totalPrice: item.totalPrice,
  status: normalizeStatus(item.status),
  specialRequests: item.specialRequests ?? undefined,
  contactPhone: item.contactPhone ?? undefined,
  createdAt: item.createdAt,
});

export const bookingService = {
  /** GET /api/bookings — danh sách booking của user */
  async getMyBookings(): Promise<Booking[]> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.list);
      const rawList: any[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      return rawList.map(mapBooking);
    } catch (error) {
      console.error("Get my bookings error:", error);
      return [];
    }
  },

  /** GET /api/bookings/:id — chi tiết booking */
  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.detail(id));
      const raw = response?.data ?? response;
      if (!raw?.id) return null;
      return mapBooking(raw);
    } catch (error) {
      console.error("Get booking detail error:", error);
      return null;
    }
  },

  /** POST /api/bookings — tạo booking mới */
  async createBooking(
    data: CreateBookingRequest,
  ): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.create, data);
      // BE: ApiResponse<object>.SuccessResult(bookingResponseDTO, "Đặt phòng thành công!")
      const bookingData = response?.data ?? null;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đặt phòng thành công!",
        data: bookingData ? mapBooking(bookingData) : undefined,
      };
    } catch (error) {
      console.error("Create booking error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Đã xảy ra lỗi khi đặt phòng",
      };
    }
  },

  /** POST /api/bookings/:id/cancel — hủy booking */
  async cancelBooking(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.cancel(id));
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã hủy đơn đặt phòng thành công.",
      };
    } catch (error) {
      console.error("Cancel booking error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Đã xảy ra lỗi khi hủy booking",
      };
    }
  },

  /** POST /api/bookings/calculate — tính giá trước khi đặt */
  async calculate(data: CalculateBookingRequest): Promise<number | null> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.bookings.calculate, data);
      // BE: ApiResponse<decimal>.SuccessResult(price)
      const price = response?.data ?? response;
      return typeof price === "number" ? price : null;
    } catch (error) {
      console.error("Calculate booking error:", error);
      return null;
    }
  },

  /** PUT /api/bookings/:id/modify — sửa booking (chỉ khi PENDING) */
  async modifyBooking(
    id: string,
    data: ModifyBookingRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.bookings.modify(id), data);
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật booking thành công!",
      };
    } catch (error) {
      console.error("Modify booking error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Đã xảy ra lỗi khi sửa booking",
      };
    }
  },

  /** GET /api/bookings/:id/cancellation-policy */
  async getCancellationPolicy(id: string): Promise<CancellationPolicyResponse | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.bookings.cancellationPolicy(id));
      // BE: ApiResponse<object>.SuccessResult(new { Policy = policy })
      return response?.data ?? response;
    } catch (error) {
      console.error("Get cancellation policy error:", error);
      return null;
    }
  },

  /** POST /api/bookings/:id/special-requests — BE nhận raw string */
  async updateSpecialRequests(
    id: string,
    specialRequests: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // BE: [FromBody] string request — phải gửi raw JSON string
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.specialRequests(id),
        specialRequests,
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã ghi nhận yêu cầu đặc biệt.",
      };
    } catch (error) {
      console.error("Update special requests error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Đã xảy ra lỗi khi cập nhật yêu cầu đặc biệt",
      };
    }
  },
};
