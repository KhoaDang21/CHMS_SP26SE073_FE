import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  location?: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  image?: string;
  totalPrice?: number;
  specialRequests?: string;
  contactPhone?: string;
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
      if (Array.isArray(response)) {
        return response;
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
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

      // Xử lý response
      if (response.data) {
        return response.data;
      }
      if (response.id) {
        return response;
      }

      return null;
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
    body?: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{
        success: boolean;
        message: string;
      }>(apiConfig.endpoints.bookings.cancel(id), body);
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
