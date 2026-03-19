import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const reviewService = {
  async create(payload: any) {
    return apiService.post<any>(apiConfig.endpoints.reviews.create, payload);
  },

  async getMyReviews(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.reviews.myReviews, params);
  },

  async update(id: string, payload: any) {
    return apiService.put<any>(apiConfig.endpoints.reviews.update(id), payload);
  },

  async delete(id: string) {
    return apiService.delete<any>(apiConfig.endpoints.reviews.delete(id));
  },

  // Manager
  async managerList(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.reviews.managerList, params);
  },

  async managerRespond(id: string, payload: any) {
    return apiService.post<any>(
      apiConfig.endpoints.reviews.managerRespond(id),
      payload,
    );
  },

  async managerUpdateRespond(id: string, payload: any) {
    return apiService.put<any>(
      apiConfig.endpoints.reviews.managerUpdateRespond(id),
      payload,
    );
  },

  // Staff
  async staffList(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.reviews.staffList, params);
  },

  async staffApprove(id: string) {
    return apiService.post<any>(apiConfig.endpoints.reviews.staffApprove(id));
  },

  async staffReject(id: string) {
    return apiService.post<any>(apiConfig.endpoints.reviews.staffReject(id));
  },
};
