import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type { DashboardStats, RevenueData } from '../types/homestay.types';

const getPayload = <T>(res: any): T => {
  return (res?.data ?? res?.result ?? res) as T;
};

const normalizeRevenueData = (raw: any[]): RevenueData[] => {
  return raw.map((item, index) => ({
    month: String(item?.month ?? item?.label ?? `Th${index + 1}`),
    revenue: Number(item?.revenue ?? item?.totalRevenue ?? item?.amount ?? 0),
    bookings: Number(item?.bookings ?? item?.bookingCount ?? item?.totalBookings ?? 0),
  }));
};

const normalizeOverview = (raw: any): DashboardStats => {
  return {
    totalRevenue: Number(raw?.totalRevenue ?? raw?.revenue ?? 0),
    revenueGrowth: Number(raw?.revenueGrowth ?? raw?.revenueGrowthRate ?? 0),
    totalBookings: Number(raw?.totalBookings ?? raw?.bookings ?? 0),
    bookingGrowth: Number(raw?.bookingGrowth ?? raw?.bookingGrowthRate ?? 0),
    totalCustomers: Number(raw?.totalCustomers ?? raw?.customers ?? 0),
    occupancyRate: Number(raw?.occupancyRate ?? 0),
    pendingBookings: Number(raw?.pendingBookings ?? raw?.pending ?? 0),
    totalHomestays: Number(raw?.totalHomestays ?? raw?.homestays ?? 0),
    averageRating: Number(raw?.averageRating ?? raw?.avgRating ?? 0),
  };
};

export const adminDashboardService = {
  async getOverview(): Promise<DashboardStats> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminDashboard.overview);
      return normalizeOverview(getPayload<any>(res) || {});
    } catch {
      return normalizeOverview({});
    }
  },

  async getToday(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.today);
  },

  async getRevenueReport(params?: Record<string, any>): Promise<RevenueData[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminDashboard.revenue, params);
      const payload = getPayload<any>(res);
      const list = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.Items ?? payload?.data ?? [];
      return normalizeRevenueData(Array.isArray(list) ? list : []);
    } catch {
      return [];
    }
  },

  async getRevenueByHomestay(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.revenueByHomestay, params);
  },

  async getRevenueByPeriod(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.revenueByPeriod, params);
  },

  async getBookingsReport(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.bookings, params);
  },

  async getOccupancyReport(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.occupancy, params);
  },

  async getCustomersReport(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminDashboard.customers, params);
  },

  async exportReports(payload: any) {
    return apiService.post<any>(apiConfig.endpoints.adminDashboard.exportReports, payload);
  },
};
