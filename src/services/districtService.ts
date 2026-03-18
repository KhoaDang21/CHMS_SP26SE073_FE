import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { District } from '../types/homestay.types';

// Backend contract: { id, name, provinceName }
const mapDistrict = (dto: any): District => ({
  id: String(dto.id ?? dto.Id ?? ''),
  name: dto.name ?? dto.Name ?? '',
  provinceId: '',
  provinceName: dto.provinceName ?? dto.ProvinceName ?? '',
});

class DistrictService {
  async getAllDistricts(): Promise<District[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.districts.list);
      const data: any[] =
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res) ? res : [];

      if (!Array.isArray(data)) return [];
      return data.map(mapDistrict).filter(d => d.id && d.name);
    } catch (error) {
      console.error('Error fetching districts:', error);
      return [];
    }
  }
}

export const districtService = new DistrictService();
