import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { District } from '../types/homestay.types';

class DistrictService {
  async getAllDistricts(): Promise<District[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.districts.list);
      // normalize ApiResponse -> { data: [...] } or direct array
      if (res?.data)
        return Array.isArray(res.data) ? res.data : (res.data.Items ?? []);
      if (Array.isArray(res)) return res;
      return [];
    } catch (error) {
      console.error('Error fetching districts:', error);
      return [];
    }
  }
}

export const districtService = new DistrictService();
