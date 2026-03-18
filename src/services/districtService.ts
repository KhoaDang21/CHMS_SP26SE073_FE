import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { District } from '../types/homestay.types';

// Backend contract: DistrictResponseDTO { Id, Name, ProvinceName }
interface DistrictResponseDTO {
  Id: string;
  Name: string;
  ProvinceName: string;
}

const mapDistrict = (dto: DistrictResponseDTO): District => ({
  id: String(dto.Id),
  name: dto.Name,
  // BE không cung cấp provinceId, chỉ có ProvinceName
  provinceId: '',
  provinceName: dto.ProvinceName,
});

class DistrictService {
  async getAllDistricts(): Promise<District[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.districts.list);
    const data: DistrictResponseDTO[] =
      (res?.data as DistrictResponseDTO[]) ?? (res as DistrictResponseDTO[]) ?? [];

    if (!Array.isArray(data)) return [];

    return data.map(mapDistrict);
  }

  async getDistrictsByProvince(_provinceId: string): Promise<District[]> {
    // Backend hiện tại không hỗ trợ filter theo provinceId, API chỉ có GET /api/districts
    // Để không gọi API dư, tái sử dụng getAllDistricts duy nhất một lần ở tầng trên nếu cần filter client-side.
    return this.getAllDistricts();
  }
}

export const districtService = new DistrictService();
