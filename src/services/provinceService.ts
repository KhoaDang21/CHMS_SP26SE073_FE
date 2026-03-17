import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { Province } from '../types/homestay.types';

const normalizeProvince = (raw: any): Province | null => {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || raw.provinceId || raw.cityId;
  const name = raw.name || raw.provinceName || raw.cityName;

  if (!id || !name) return null;

  return {
    id: String(id),
    name: String(name),
  };
};

const extractProvinceList = (res: any): any[] => {
  if (Array.isArray(res)) return res;

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data;

  return data?.Items || data?.items || data?.provinces || data?.Provinces || [];
};

class ProvinceService {
  async getAllProvinces(): Promise<Province[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.provinces.list);
      const rawList = extractProvinceList(res);
      if (!Array.isArray(rawList)) return [];

      return rawList
        .map((item) => normalizeProvince(item))
        .filter((item): item is Province => Boolean(item));
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }
}

export const provinceService = new ProvinceService();
