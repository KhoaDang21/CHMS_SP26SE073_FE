import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface ManagerDashboard {
  totalRevenue?: number;
  totalBookings?: number;
  occupancyRate?: number;
  averageRating?: number;
  checkins?: number;
  checkouts?: number;
  arrivals?: number;
  departures?: number;
  inHouse?: number;
}

export interface RevenueReport {
  date?: string;
  revenue?: number;
  bookings?: number;
  guests?: number;
}

export interface OccupancyReport {
  homestayId?: string;
  homestayName?: string;
  totalDays?: number;
  bookedDays?: number;
  occupancyRate?: number;
}

export interface ReviewsReport {
  totalReviews?: number;
  averageRating?: number;
  byRating?: Record<number, number>;
  recentReviews?: Array<{
    homestayName: string;
    customerName: string;
    rating: number;
  }>;
}

export const managerDashboardService = {
  /** GET /api/manager/dashboard — dashboard manager */
  async getDashboard(): Promise<ManagerDashboard | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.managerDashboard.dashboard,
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        totalRevenue: data.totalRevenue ?? 0,
        totalBookings: data.totalBookings ?? 0,
        occupancyRate: data.occupancyRate ?? 0,
        averageRating: data.averageRating ?? 0,
        checkins: data.checkins ?? 0,
        checkouts: data.checkouts ?? 0,
        arrivals: data.arrivals ?? 0,
        departures: data.departures ?? 0,
        inHouse: data.inHouse ?? 0,
      };
    } catch (error) {
      console.error("Get manager dashboard error:", error);
      return null;
    }
  },

  /** GET /api/manager/reports/revenue — báo cáo doanh thu */
  async getRevenueReport(
    startDate?: string,
    endDate?: string,
  ): Promise<RevenueReport[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerDashboard.revenueReport}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        date: item.date ?? "",
        revenue: item.revenue ?? 0,
        bookings: item.bookings ?? 0,
        guests: item.guests ?? 0,
      }));
    } catch (error) {
      console.error("Get revenue report error:", error);
      return [];
    }
  },

  /** GET /api/manager/reports/occupancy — báo cáo chiếm dụng */
  async getOccupancyReport(
    startDate?: string,
    endDate?: string,
  ): Promise<OccupancyReport[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerDashboard.occupancyReport}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        homestayId: item.homestayId ?? "",
        homestayName: item.homestayName ?? "",
        totalDays: item.totalDays ?? 0,
        bookedDays: item.bookedDays ?? 0,
        occupancyRate: item.occupancyRate ?? 0,
      }));
    } catch (error) {
      console.error("Get occupancy report error:", error);
      return [];
    }
  },

  /** GET /api/manager/reports/reviews — báo cáo đánh giá */
  async getReviewsReport(
    startDate?: string,
    endDate?: string,
  ): Promise<ReviewsReport | null> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerDashboard.reviewsReport}?${params.toString()}`,
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        totalReviews: data.totalReviews ?? 0,
        averageRating: data.averageRating ?? 0,
        byRating: data.byRating ?? {},
        recentReviews: data.recentReviews ?? [],
      };
    } catch (error) {
      console.error("Get reviews report error:", error);
      return null;
    }
  },

  /** POST /api/manager/reports/export — xuất báo cáo */
  async exportReports(
    reportType: "revenue" | "occupancy" | "reviews",
    startDate?: string,
    endDate?: string,
  ): Promise<Blob | null> {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const response = await fetch(
        `${apiConfig.baseURL}${apiConfig.endpoints.managerDashboard.exportReports}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            reportType,
            startDate,
            endDate,
          }),
        },
      );

      if (!response.ok) {
        console.error("Export failed:", response.status);
        return null;
      }

      return await response.blob();
    } catch (error) {
      console.error("Export reports error:", error);
      return null;
    }
  },
};
