import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface Province {
  id: string;
  name: string;
}

export interface LocationDistrict {
  id: string;
  name: string;
  provinceId?: string;
}

export interface Ward {
  id: string;
  name: string;
  districtId?: string;
}

export const locationService = {
  /** GET /api/locations/provinces */
  async getProvinces(): Promise<Province[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.locations.provinces);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((r: any): Province => ({
        id: String(r.id ?? r.Id ?? ''),
        name: r.name ?? r.Name ?? '',
      }));
    } catch (e) {
      console.error('getProvinces error:', e);
      return [];
    }
  },

  /** GET /api/locations/districts/{provinceId} */
  async getDistrictsByProvince(provinceId: string): Promise<LocationDistrict[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.locations.districts(provinceId));
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((r: any): LocationDistrict => ({
        id: String(r.id ?? r.Id ?? ''),
        name: r.name ?? r.Name ?? '',
        provinceId,
      }));
    } catch (e) {
      console.error('getDistrictsByProvince error:', e);
      return [];
    }
  },

  /** GET /api/locations/wards/{districtId} */
  async getWardsByDistrict(districtId: string): Promise<Ward[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.locations.wards(districtId));
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((r: any): Ward => ({
        id: String(r.id ?? r.Id ?? ''),
        name: r.name ?? r.Name ?? '',
        districtId,
      }));
    } catch (e) {
      console.error('getWardsByDistrict error:', e);
      return [];
    }
  },

  /** GET /api/locations/coastal-areas */
  async getCoastalAreas(): Promise<any[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.locations.coastalAreas);
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error('getCoastalAreas error:', e);
      return [];
    }
  },
};
