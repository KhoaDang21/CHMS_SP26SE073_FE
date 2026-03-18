import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const paymentService = {
  async create(paymentData: any) {
    return apiService.post<any>(apiConfig.endpoints.payments.create, paymentData);
  },

  async createLink(payload: any) {
    return apiService.post<any>(apiConfig.endpoints.payments.createLink, payload);
  },

  async verify(payload: any) {
    return apiService.post<any>(apiConfig.endpoints.payments.verify, payload);
  },

  async history(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.payments.history, params);
  },
};
