import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface CancellationPolicy {
  id: string;
  daysBefore: number;
  refundPercentage: number;
  isActive: boolean;
}

export interface UpsertPolicyRequest {
  daysBefore: number;
  refundPercentage: number;
  isActive: boolean;
}

const mapPolicy = (raw: any): CancellationPolicy => ({
  id: raw?.Id ?? raw?.id ?? '',
  daysBefore: raw?.DaysBefore ?? raw?.daysBefore ?? 0,
  refundPercentage: raw?.RefundPercentage ?? raw?.refundPercentage ?? 0,
  isActive: raw?.IsActive ?? raw?.isActive ?? true,
});

export const cancellationPolicyService = {
  async getAll(): Promise<CancellationPolicy[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.cancellationPolicies.list);
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map(mapPolicy);
    } catch {
      // 403 nếu không phải admin — trả về mảng rỗng, UI tự fallback
      return [];
    }
  },

  async create(data: UpsertPolicyRequest): Promise<CancellationPolicy> {
    const res = await apiService.post<any>(apiConfig.endpoints.cancellationPolicies.create, data);
    return mapPolicy(res?.data ?? res);
  },

  async update(id: string, data: UpsertPolicyRequest): Promise<CancellationPolicy> {
    const res = await apiService.put<any>(apiConfig.endpoints.cancellationPolicies.update(id), data);
    return mapPolicy(res?.data ?? res);
  },

  async delete(id: string): Promise<boolean> {
    const res = await apiService.delete<any>(apiConfig.endpoints.cancellationPolicies.delete(id));
    return res?.success ?? true;
  },
};
