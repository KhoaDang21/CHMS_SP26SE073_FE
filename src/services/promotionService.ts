import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type {
  Promotion,
  CreatePromotionDTO,
  UpdatePromotionDTO,
  CouponValidationRequest,
  CouponValidationResponse,
  PromotionListResponse,
} from "../types/promotion.types";

export const promotionService = {
  async getAdminList(params?: Record<string, any>) {
    return apiService.get<PromotionListResponse>(
      apiConfig.endpoints.promotions.adminList,
      params,
    );
  },

  async getAdminDetail(id: string) {
    return apiService.get<Promotion>(
      apiConfig.endpoints.promotions.adminDetail(id),
    );
  },

  async createPromotion(data: CreatePromotionDTO) {
    return apiService.post<Promotion>(
      apiConfig.endpoints.promotions.adminCreate,
      data,
    );
  },

  async updatePromotion(id: string, data: UpdatePromotionDTO) {
    return apiService.put<Promotion>(
      apiConfig.endpoints.promotions.adminUpdate(id),
      data,
    );
  },

  async deletePromotion(id: string) {
    return apiService.delete<void>(
      apiConfig.endpoints.promotions.adminDelete(id),
    );
  },

  async toggleStatus(id: string) {
    return apiService.patch<Promotion>(
      apiConfig.endpoints.promotions.adminToggleStatus(id),
    );
  },

  async validateCoupon(payload: CouponValidationRequest) {
    return apiService.post<CouponValidationResponse>(
      apiConfig.endpoints.promotions.validateCoupon,
      payload,
    );
  },

  async getActiveForCustomer() {
    return apiService.get<Promotion[]>(
      apiConfig.endpoints.promotions.activeForCustomer,
    );
  },
};
