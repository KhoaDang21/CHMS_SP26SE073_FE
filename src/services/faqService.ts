import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface FaqPayload {
  question: string;
  answer: string;
  isActive?: boolean;
}

/** FaqController — /api/faqs (+ public active); khác với GET /api/ai/faq của CustomerAi */
export const faqService = {
  async getActive(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.faqs.active);
  },

  async listAll(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.faqs.list);
  },

  async create(body: FaqPayload): Promise<any> {
    return apiService.post<any>(apiConfig.endpoints.faqs.create, body);
  },

  async update(id: string, body: FaqPayload): Promise<any> {
    return apiService.put<any>(apiConfig.endpoints.faqs.update(id), body);
  },

  async remove(id: string): Promise<any> {
    return apiService.delete<any>(apiConfig.endpoints.faqs.delete(id));
  },

  async toggleStatus(id: string): Promise<any> {
    return apiService.patch<any>(
      apiConfig.endpoints.faqs.toggleStatus(id),
      {},
    );
  },
};
