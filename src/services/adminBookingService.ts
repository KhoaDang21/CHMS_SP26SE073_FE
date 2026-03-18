import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const adminBookingService = {
  async list(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminBookings.list, params);
  },

  async detail(id: string) {
    return apiService.get<any>(apiConfig.endpoints.adminBookings.detail(id));
  },

  async update(id: string, payload: any) {
    return apiService.put<any>(apiConfig.endpoints.adminBookings.update(id), payload);
  },
};
