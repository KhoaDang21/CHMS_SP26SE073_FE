import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Booking } from "./bookingService";

export interface BookingStatistics {
  totalBookings?: number;
  confirmedBookings?: number;
  pendingBookings?: number;
  cancelledBookings?: number;
  completedBookings?: number;
  totalRevenue?: number;
  averageBooking?: number;
}

export interface CalendarBooking {
  id: string;
  homestayId?: string;
  homestayName?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  customerName?: string;
  totalPrice?: number;
}

export const managerBookingService = {
  /** GET /api/manager/bookings — danh sách booking cho manager */
  async getBookings(
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<Booking[]> {
    try {
      const params = new URLSearchParams();
      if (page) params.append("page", String(page));
      if (limit) params.append("limit", String(limit));
      if (status) params.append("status", status);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerBookings.list}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      return rawList;
    } catch (error) {
      console.error("Get manager bookings error:", error);
      return [];
    }
  },

  /** GET /api/manager/bookings/calendar — xem calendar booking */
  async getBookingCalendar(
    fromDate: string,
    toDate: string,
  ): Promise<CalendarBooking[]> {
    try {
      const params = new URLSearchParams();
      params.append("fromDate", fromDate);
      params.append("toDate", toDate);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerBookings.calendar}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      return rawList;
    } catch (error) {
      console.error("Get booking calendar error:", error);
      return [];
    }
  },

  /** GET /api/manager/bookings/statistics — thống kê booking */
  async getBookingStatistics(): Promise<BookingStatistics | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.managerBookings.statistics,
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        totalBookings: data.totalBookings ?? 0,
        confirmedBookings: data.confirmedBookings ?? 0,
        pendingBookings: data.pendingBookings ?? 0,
        cancelledBookings: data.cancelledBookings ?? 0,
        completedBookings: data.completedBookings ?? 0,
        totalRevenue: data.totalRevenue ?? 0,
        averageBooking: data.averageBooking ?? 0,
      };
    } catch (error) {
      console.error("Get booking statistics error:", error);
      return null;
    }
  },

  /** GET /api/manager/arrivals */
  async getArrivalsToday(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.managerBookings.arrivals);
  },

  /** GET /api/manager/departures */
  async getDeparturesToday(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.managerBookings.departures);
  },

  /** GET /api/manager/in-house */
  async getInHouse(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.managerBookings.inHouse);
  },
};
