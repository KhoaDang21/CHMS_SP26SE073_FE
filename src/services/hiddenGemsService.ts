import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface HiddenGem {
  id: string;
  localRouteId?: string;
  localRouteName?: string;
  provinceId?: string;
  provinceName?: string;
  managedProvinceId?: string;
  managedProvinceName?: string;
  assignedProvinceId?: string;
  assignedProvinceName?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  rewardPoints?: number;
  checkInRadiusMeters?: number;
  isRequired?: boolean;
  isUsedInThisSchedule?: boolean;
  usedStepId?: string;
  usedStepOrder?: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHiddenGemRequest {
  localRouteId?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  rewardPoints?: number;
  createStep?: boolean;
  stepOrder?: number;
  checkInRadiusMeters?: number;
  isRequired?: boolean;
}

export interface UpdateHiddenGemRequest {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  rewardPoints?: number;
  checkInRadiusMeters?: number;
  isRequired?: boolean;
}

class HiddenGemsService {
  async listHiddenGems(): Promise<{
    success: boolean;
    data: HiddenGem[];
    message?: string;
  }> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.managerHiddenGems.list);
      const data = response as any;

      const items =
        data?.data ||
        data?.Data ||
        data?.items ||
        data?.Items ||
        data?.$values ||
        data?.result ||
        data?.Result ||
        [];
      const hiddenGems = Array.isArray(items) ? items : [];

      return {
        success: true,
        data: hiddenGems,
        message: data?.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch hidden gems',
      };
    }
  }

  async createHiddenGem(payload: CreateHiddenGemRequest): Promise<{
    success: boolean;
    data?: HiddenGem;
    message?: string;
  }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.managerHiddenGems.create, payload);
      const data = response as any;

      const hiddenGem = data?.data || data?.result || {};

      return {
        success: !!hiddenGem.id,
        data: hiddenGem,
        message: data?.message || 'Hidden gem created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create hidden gem',
      };
    }
  }

  async updateHiddenGem(
    id: string,
    payload: UpdateHiddenGemRequest
  ): Promise<{
    success: boolean;
    data?: HiddenGem;
    message?: string;
  }> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.managerHiddenGems.update(id), payload);
      const data = response as any;

      const hiddenGem = data?.data || data?.result || {};

      return {
        success: !!hiddenGem.id,
        data: hiddenGem,
        message: data?.message || 'Hidden gem updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update hidden gem',
      };
    }
  }

  async deleteHiddenGem(id: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const response = await apiService.delete<any>(apiConfig.endpoints.managerHiddenGems.delete(id));
      const data = response as any;

      return {
        success: true,
        message: data?.message || 'Hidden gem deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete hidden gem',
      };
    }
  }

  async getHiddenGemsBySchedule(scheduleId: string): Promise<{
    success: boolean;
    data: HiddenGem[];
    message?: string;
  }> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.managerHiddenGems.bySchedule(scheduleId));
      const data = response as any;

      const items = data?.data || data?.items || data?.$values || data?.result || [];
      const hiddenGems = Array.isArray(items) ? items : [];

      return {
        success: true,
        data: hiddenGems,
        message: data?.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch hidden gems by schedule',
      };
    }
  }

  async getAvailableHiddenGemsBySchedule(
    scheduleId: string,
    unusedOnly = true,
  ): Promise<{
    success: boolean;
    data: HiddenGem[];
    message?: string;
  }> {
    try {
      const response = await apiService.get<any>(
        `${apiConfig.endpoints.managerHiddenGems.availableBySchedule(scheduleId)}?unusedOnly=${unusedOnly}`,
      );
      const data = response as any;

      const items =
        data?.data ||
        data?.Data ||
        data?.items ||
        data?.Items ||
        data?.$values ||
        data?.result ||
        data?.Result ||
        [];
      const hiddenGems = Array.isArray(items) ? items : [];

      return {
        success: true,
        data: hiddenGems,
        message: data?.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch available hidden gems',
      };
    }
  }

  async createHiddenGemBySchedule(
    scheduleId: string,
    payload: CreateHiddenGemRequest
  ): Promise<{
    success: boolean;
    data?: HiddenGem;
    message?: string;
  }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.managerHiddenGems.createBySchedule(scheduleId),
        payload
      );
      const data = response as any;

      const hiddenGem = data?.data || data?.result || {};

      return {
        success: !!hiddenGem.id,
        data: hiddenGem,
        message: data?.message || 'Hidden gem created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create hidden gem for schedule',
      };
    }
  }
}

export default new HiddenGemsService();
