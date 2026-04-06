import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type { ExperienceCategory, ServiceCategoryPayload } from '../types/experience.types';

const normalizeCategory = (raw: any): ExperienceCategory => {
  const statusRaw = String(raw?.status ?? raw?.Status ?? '').toUpperCase();
  return {
    id: String(raw?.id ?? raw?.Id ?? ''),
    name: String(raw?.name ?? raw?.Name ?? ''),
    type: raw?.type ?? raw?.Type ?? '',
    description: raw?.description ?? raw?.Description ?? '',
    iconUrl: raw?.iconUrl ?? raw?.IconUrl ?? '',
    status: raw?.status ?? raw?.Status,
    isActive: (raw?.isActive ?? raw?.IsActive ?? (statusRaw ? statusRaw === 'ACTIVE' : true)) === true,
  };
};

export const serviceCategoryService = {
  async list(): Promise<ExperienceCategory[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.serviceCategory.list);
      const payload = res?.data ?? res;
      const list = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.Items ?? [];
      return (Array.isArray(list) ? list : []).map(normalizeCategory).filter((x) => Boolean(x.id));
    } catch (error) {
      console.error('Load service categories error:', error);
      return [];
    }
  },

  async create(payload: ServiceCategoryPayload): Promise<{ success: boolean; message?: string; data?: ExperienceCategory }> {
    try {
      const body = {
        name: payload.name,
        type: payload.type ?? '',
        description: payload.description ?? '',
        iconUrl: payload.iconUrl ?? '',
        isActive: payload.isActive ?? true,
      };
      const res = await apiService.post<any>(apiConfig.endpoints.serviceCategory.create, body);
      const item = res?.data ?? res;
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Tao danh muc thanh cong',
        data: item?.id || item?.Id ? normalizeCategory(item) : undefined,
      };
    } catch (error) {
      console.error('Create service category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Khong the tao danh muc',
      };
    }
  },

  async update(id: string, payload: ServiceCategoryPayload): Promise<{ success: boolean; message?: string; data?: ExperienceCategory }> {
    try {
      const body = {
        name: payload.name,
        type: payload.type ?? '',
        description: payload.description ?? '',
        iconUrl: payload.iconUrl ?? '',
        isActive: payload.isActive ?? true,
      };
      const res = await apiService.put<any>(apiConfig.endpoints.serviceCategory.update(id), body);
      const item = res?.data ?? res;
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Cap nhat danh muc thanh cong',
        data: item?.id || item?.Id ? normalizeCategory(item) : undefined,
      };
    } catch (error) {
      console.error('Update service category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Khong the cap nhat danh muc',
      };
    }
  },

  async remove(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiService.delete<any>(apiConfig.endpoints.serviceCategory.delete(id));
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Xoa danh muc thanh cong',
      };
    } catch (error) {
      console.error('Delete service category error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Khong the xoa danh muc',
      };
    }
  },
};
