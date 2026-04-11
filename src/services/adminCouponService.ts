import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface CouponRequestPayload {
  code: string;
  discountPercent: number;
  maxDiscount: number;
  usageLimit: number;
  expiryDate: string;
  isActive?: boolean;
}

/** AdminCouponsController — /api/admin/coupons */
export const adminCouponService = {
  async list(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.adminCoupons.list);
  },

  async create(body: CouponRequestPayload): Promise<any> {
    return apiService.post<any>(apiConfig.endpoints.adminCoupons.create, body);
  },

  async update(id: string, body: CouponRequestPayload): Promise<any> {
    return apiService.put<any>(apiConfig.endpoints.adminCoupons.update(id), body);
  },

  async remove(id: string): Promise<any> {
    return apiService.delete<any>(apiConfig.endpoints.adminCoupons.delete(id));
  },

  async usageStats(id: string): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.adminCoupons.usage(id));
  },
};
