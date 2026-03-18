import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const promotionService = {
  async getAdminList(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.promotions.adminList, params);
  },

  async getAdminDetail(id: string) {
    return apiService.get<any>(apiConfig.endpoints.promotions.adminDetail(id));
  },

  async createPromotion(data: any) {
    return apiService.post<any>(apiConfig.endpoints.promotions.adminCreate, data);
  },

  async updatePromotion(id: string, data: any) {
    return apiService.put<any>(apiConfig.endpoints.promotions.adminUpdate(id), data);
  },

  async deletePromotion(id: string) {
    return apiService.delete<any>(apiConfig.endpoints.promotions.adminDelete(id));
  },

  async toggleStatus(id: string) {
    return apiService.patch<any>(apiConfig.endpoints.promotions.adminToggleStatus(id));
  },

  async validateCoupon(payload: any) {
    return apiService.post<any>(apiConfig.endpoints.promotions.validateCoupon, payload);
  },

  async getActiveForCustomer() {
    return apiService.get<any>(apiConfig.endpoints.promotions.activeForCustomer);
  },
};
