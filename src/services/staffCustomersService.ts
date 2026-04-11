import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface StaffCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  address?: string;
  status?: string;
  totalBookings?: number;
  totalSpent?: number;
  joinDate?: string;
}

export const staffCustomersService = {
  /** GET /api/staff/customers/search — tìm kiếm khách hàng */
  async searchCustomers(keyword: string): Promise<StaffCustomer[]> {
    try {
      const params = new URLSearchParams();
      if (keyword) params.append("keyword", keyword);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.staffCustomers.search}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        fullName: item.fullName ?? item.name ?? "",
        email: item.email ?? "",
        phone: item.phone ?? "",
        avatar: item.avatar ?? item.avatarUrl ?? "",
        address: item.address ?? "",
        status: item.status ?? "ACTIVE",
        totalBookings: item.totalBookings ?? 0,
        totalSpent: item.totalSpent ?? 0,
        joinDate: item.joinDate ?? item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Search customers error:", error);
      return [];
    }
  },

  /** GET /api/staff/customers/{id} — chi tiết khách hàng */
  async getCustomerDetail(customerId: string): Promise<StaffCustomer | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.staffCustomers.detail(customerId),
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        id: data.id ?? "",
        fullName: data.fullName ?? data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        avatar: data.avatar ?? data.avatarUrl ?? "",
        address: data.address ?? "",
        status: data.status ?? "ACTIVE",
        totalBookings: data.totalBookings ?? 0,
        totalSpent: data.totalSpent ?? 0,
        joinDate: data.joinDate ?? data.createdAt ?? "",
      };
    } catch (error) {
      console.error("Get customer detail error:", error);
      return null;
    }
  },
};
