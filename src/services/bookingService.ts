import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  totalNights?: number;
  pricePerNight?: number;
  subTotal?: number;
  discountAmount?: number;
  totalPrice?: number;
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
  specialRequests?: string;
  contactPhone?: string;
  promotionId?: string;
}

export type CalculateBookingResponse = any;

export interface ModifyBookingRequest {
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  promotionId?: string;
  contactPhone?: string;
}

export interface CancellationPolicyResponse {
  [key: string]: any;
}

const normalizeStatus = (rawStatus: any): Booking["status"] => {
  const v = String(rawStatus || "").toLowerCase();
  if (v === "confirmed") return "confirmed";
  if (v === "cancelled") return "cancelled";
  if (v === "completed") return "completed";
  return "pending";
};

const cleanLoadingText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/loading/i.test(value) || /đang cập nhật/i.test(value)) return undefined;
  return value;
};

export const bookingService = {
  /**
   * Lấy danh sách booking của user
   */
  async getMyBookings(): Promise<Booking[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.list,
      );

      // Xử lý cả 2 trường hợp: response.data hoặc response trực tiếp là array
      const rawList: any[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : response?.success && Array.isArray(response.data)
            ? response.data
            : [];

      return rawList.map((item) => {
        const normalized: Booking = {
          id: item.id,
          homestayId: item.homestayId,
          homestayName: cleanLoadingText(item.homestayName),
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          guestsCount: item.guestsCount,
          status: normalizeStatus(item.status),
          totalNights: item.totalNights,
          pricePerNight: item.pricePerNight,
          subTotal: item.subTotal,
          discountAmount: item.discountAmount,
          totalPrice: item.totalPrice,
          specialRequests: item.specialRequests ?? undefined,
          contactPhone: item.contactPhone ?? undefined,
          createdAt: item.createdAt,
        };
        return normalized;
      });
    } catch (error) {
      console.error("Get my bookings error:", error);
      return [];
    }
  },

  /**
   * Lấy chi tiết booking
   */
  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.detail(id),
      );

      const raw = response?.data ?? response;
      if (!raw?.id) return null;

      const normalized: Booking = {
        id: raw.id,
        homestayId: raw.homestayId,
        homestayName: cleanLoadingText(raw.homestayName),
        checkIn: raw.checkIn,
        checkOut: raw.checkOut,
        guestsCount: raw.guestsCount,
        status: normalizeStatus(raw.status),
        totalNights: raw.totalNights,
        pricePerNight: raw.pricePerNight,
        subTotal: raw.subTotal,
        discountAmount: raw.discountAmount,
        totalPrice: raw.totalPrice,
        specialRequests: raw.specialRequests ?? undefined,
        contactPhone: raw.contactPhone ?? undefined,
        createdAt: raw.createdAt,
      };

      return normalized;
    } catch (error) {
      console.error("Get booking detail error:", error);
      return null;
    }
  },

  /**
   * Tạo booking mới
   */
  async createBooking(
    data: CreateBookingRequest,
  ): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.post<{
        success: boolean;
        message: string;
        data: Booking;
      }>(apiConfig.endpoints.bookings.create, data);
      return response;
    } catch (error) {
      console.error("Create booking error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi đặt phòng",
      };
    }
  },

  /**
   * Hủy booking
   */
  async cancelBooking(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{
        success: boolean;
        message: string;
      }>(apiConfig.endpoints.bookings.cancel(id));
      return response;
    } catch (error) {
      console.error("Cancel booking error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi hủy booking",
      };
    }
  },

  /**
   * Tính giá / kiểm tra khả dụng (BE: POST /bookings/calculate)
   */
  async calculate(
    data: CalculateBookingRequest,
  ): Promise<CalculateBookingResponse | null> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.calculate,
        data,
      );
      return response?.data ?? response;
    } catch (error) {
      console.error("Calculate booking error:", error);
      return null;
    }
  },

  /**
   * Sửa booking (BE: PUT /bookings/{id}/modify)
   */
  async modifyBooking(
    id: string,
    data: ModifyBookingRequest,
  ): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.bookings.modify(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Modify booking error:", error);
      return { success: false, message: "Đã xảy ra lỗi khi sửa booking" };
    }
  },

  /**
   * Lấy chính sách hủy (BE: GET /bookings/{id}/cancellation-policy)
   */
  async getCancellationPolicy(
    id: string,
  ): Promise<CancellationPolicyResponse | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.cancellationPolicy(id),
      );
      return response?.data ?? response;
    } catch (error) {
      console.error("Get cancellation policy error:", error);
      return null;
    }
  },

  /**
   * Cập nhật yêu cầu đặc biệt (BE: POST /bookings/{id}/special-requests)
   */
  async updateSpecialRequests(
    id: string,
    specialRequests: string,
  ): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.specialRequests(id),
        { specialRequests },
      );
      return response;
    } catch (error) {
      console.error("Update special requests error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi cập nhật yêu cầu đặc biệt",
      };
    }
  },
};
