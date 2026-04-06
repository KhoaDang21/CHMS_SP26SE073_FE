import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type { ExperienceCategory, ExperiencePayload, LocalExperience } from '../types/experience.types';

const toNumber = (v: any): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeExperience = (it: any): LocalExperience => {
  const statusRaw = String(it?.status ?? it?.Status ?? '').toUpperCase();
  const isActiveByStatus = statusRaw ? statusRaw === 'ACTIVE' : undefined;

  return {
    id: String(it?.id ?? it?.Id ?? ''),
    homestayId: String(it?.homestayId ?? it?.HomestayId ?? ''),
    homestayName: it?.homestayName ?? it?.HomestayName ?? '',
    categoryId: String(it?.categoryId ?? it?.CategoryId ?? ''),
    categoryName: it?.categoryName ?? it?.CategoryName ?? it?.category ?? it?.Category ?? '',
    name: String(it?.name ?? it?.Name ?? ''),
    description: it?.description ?? it?.Description ?? '',
    price: toNumber(it?.price ?? it?.Price),
    unit: it?.unit ?? it?.Unit ?? '',
    imageUrl: it?.imageUrl ?? it?.ImageUrl ?? '',
    status: it?.status ?? it?.Status,
    isActive: (it?.isActive ?? it?.IsActive ?? isActiveByStatus ?? true) === true,
  };
};

export const experienceService = {
  async list(params?: Record<string, any>): Promise<LocalExperience[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.experiences.list, params);
      const payload = res?.data ?? res;
      const rawList = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.Items ?? [];

      return (Array.isArray(rawList) ? rawList : []).map(normalizeExperience);
    } catch (error) {
      console.error('Load experiences error:', error);
      return [];
    }
  },

  async getCategories(): Promise<ExperienceCategory[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.experiences.categories);
      const payload = res?.data ?? res;
      const list = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.Items ?? [];
      return (Array.isArray(list) ? list : [])
        .map((x: any) => ({
          id: String(x?.id ?? x?.Id ?? ''),
          name: String(x?.name ?? x?.Name ?? '').trim(),
        }))
        .filter((x: ExperienceCategory) => Boolean(x.id) && Boolean(x.name));
    } catch (error) {
      console.error('Load experience categories error:', error);
      return [];
    }
  },

  async create(payload: ExperiencePayload): Promise<{ success: boolean; message?: string; data?: LocalExperience }> {
    try {
      const body = {
        homestayId: payload.homestayId,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description ?? '',
        price: payload.price ?? 0,
        unit: payload.unit ?? '',
        imageUrl: payload.imageUrl ?? '',
      };
      const res = await apiService.post<any>(apiConfig.endpoints.experiences.create, body);
      const item = res?.data ?? res;
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Tạo dịch vụ thành công',
        data: item?.id || item?.Id ? normalizeExperience(item) : undefined,
      };
    } catch (error) {
      console.error('Create experience error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể tạo dịch vụ',
      };
    }
  },

  async update(id: string, payload: ExperiencePayload): Promise<{ success: boolean; message?: string; data?: LocalExperience }> {
    try {
      const body = {
        homestayId: payload.homestayId,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description ?? '',
        price: payload.price ?? 0,
        unit: payload.unit ?? '',
        imageUrl: payload.imageUrl ?? '',
      };
      const res = await apiService.put<any>(apiConfig.endpoints.experiences.update(id), body);
      const item = res?.data ?? res;
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Cập nhật dịch vụ thành công',
        data: item?.id || item?.Id ? normalizeExperience(item) : undefined,
      };
    } catch (error) {
      console.error('Update experience error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể cập nhật dịch vụ',
      };
    }
  },

  async remove(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiService.delete<any>(apiConfig.endpoints.experiences.delete(id));
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Xóa dịch vụ thành công',
      };
    } catch (error) {
      console.error('Delete experience error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể xóa dịch vụ',
      };
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<{ success: boolean; message?: string }> {
    try {
      const status = isActive ? 'ACTIVE' : 'INACTIVE';
      const res = await apiService.patch<any>(apiConfig.endpoints.experiences.updateStatus(id), { status });
      return {
        success: res?.success ?? true,
        message: res?.message ?? 'Cập nhật trạng thái thành công',
      };
    } catch (error) {
      console.error('Update experience status error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái',
      };
    }
  },
};
