import { districtService } from './districtService';
import type { Province } from '../types/homestay.types';

class ProvinceService {
  async getAllProvinces(): Promise<Province[]> {
    try {
      const districts = await districtService.getAllDistricts();
      // Extract unique province names from districts
      const seen = new Set<string>();
      const provinces: Province[] = [];
      for (const d of districts) {
        if (d.provinceName && !seen.has(d.provinceName)) {
          seen.add(d.provinceName);
          provinces.push({ id: d.provinceName, name: d.provinceName });
        }
      }
      return provinces.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } catch (error) {
      console.error('Error fetching provinces:', error);
      return [];
    }
  }
}

export const provinceService = new ProvinceService();
