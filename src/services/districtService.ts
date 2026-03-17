import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { District } from '../types/homestay.types';

const normalizeDistrict = (raw: any): District | null => {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || raw.districtId || raw.districtID || raw.DistrictId || raw.DistrictID;
  const name = raw.name || raw.districtName || raw.district || raw.DistrictName;
  const provinceId =
    raw.provinceId ||
    raw.provinceID ||
    raw.ProvinceId ||
    raw.ProvinceID ||
    raw.cityId ||
    raw.cityID ||
    '';
  const provinceName =
    raw.provinceName ||
    raw.ProvinceName ||
    raw.cityName ||
    raw.CityName ||
    raw.province ||
    raw.city ||
    '';

  if (!id || !name) return null;

  return {
    id: String(id),
    name: String(name),
    provinceId: String(provinceId),
    provinceName: String(provinceName),
  };
};

const extractDistrictList = (res: any): any[] => {
  const tryExtract = (value: any, depth = 0): any[] | null => {
    if (depth > 5 || value == null) return null;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') return null;

    const candidates = [
      value.data,
      value.result,
      value.Items,
      value.items,
      value.districts,
      value.Districts,
      value.records,
      value.list,
    ];

    for (const candidate of candidates) {
      const extracted = tryExtract(candidate, depth + 1);
      if (extracted) return extracted;
    }

    return null;
  };

  return tryExtract(res) || [];
};

class DistrictService {
  async getAllDistricts(): Promise<District[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.districts.list);
      const rawList = extractDistrictList(res);
      if (!Array.isArray(rawList)) return [];

      return rawList
        .map((item) => normalizeDistrict(item))
        .filter((item): item is District => Boolean(item));
    } catch (error) {
      console.error('Error fetching districts:', error);
      return [];
    }
  }

  async getDistrictsByProvince(provinceId: string): Promise<District[]> {
    if (!provinceId) return [];

    try {
      const res = await apiService.get<any>(apiConfig.endpoints.districts.list, {
        provinceId,
      });

      const rawList = extractDistrictList(res);
      if (!Array.isArray(rawList)) return [];

      const normalized = rawList
        .map((item) => normalizeDistrict(item))
        .filter((item): item is District => Boolean(item));

      // Some backends ignore query params and still return all districts.
      return normalized.filter((item) => item.provinceId === provinceId || !item.provinceId);
    } catch (error) {
      console.error('Error fetching districts by province:', error);
      return [];
    }
  }
}

export const districtService = new DistrictService();
