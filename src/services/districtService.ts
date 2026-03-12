import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { District } from '../types/homestay.types';

class DistrictService {
  async getAllDistricts(): Promise<District[]> {
    try {
      const response = await apiService.get<District[]>(apiConfig.endpoints.districts.list);
      return response;
    } catch (error) {
      console.error('Error fetching districts:', error);
      throw error;
    }
  }
}

export const districtService = new DistrictService();
