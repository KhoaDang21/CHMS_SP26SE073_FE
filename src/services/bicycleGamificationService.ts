import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface ServiceResult<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface RentBicyclePayload {
  bookingId: string;
  bicycleId: string;
}

export interface ReturnBicyclePayload {
  rentalId: string;
  damageCatalogIds: string[];
}

export interface CreateBicyclePayload {
  homestayId?: string;
  bicycleCode: string;
  type: string;
  pricePerDay: number;
  status?: string;
}

export interface CreateDamageCatalogPayload {
  homestayId?: string;
  damageName: string;
  fineAmount: number;
}

export interface HiddenGemPayload {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  rewardPoints?: number;
}

export interface CreateLocalRoutePayload {
  homestayId?: string;
  routeName: string;
  description?: string;
  totalDistanceKm: number;
  estimatedMinutes: number;
  polylineMap: string;
  hiddenGems: HiddenGemPayload[];
}

const toMessage = (error: unknown) => (error instanceof Error ? error.message : 'Có lỗi xảy ra');

const unwrapArray = (response: any): any[] => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const toServiceResult = <T = any>(response: any, fallbackMessage: string): ServiceResult<T> => {
  const success = Boolean(response?.success ?? response?.isSuccess ?? true);
  const message = String(response?.message || response?.Message || fallbackMessage);
  const data = (response?.data ?? response?.result ?? response) as T;
  return { success, message, data };
};

export const bicycleGamificationService = {
  async rent(payload: RentBicyclePayload): Promise<ServiceResult> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.gamificationBicycles.rent, payload);
      return toServiceResult(response, 'Bàn giao xe thành công');
    } catch (error) {
      return { success: false, message: toMessage(error) };
    }
  },

  async returnBicycle(payload: ReturnBicyclePayload): Promise<ServiceResult> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.gamificationBicycles.return, payload);
      return toServiceResult(response, 'Thu hồi xe thành công');
    } catch (error) {
      return { success: false, message: toMessage(error) };
    }
  },

  async listBicycles(homestayId: string): Promise<any[]> {
    if (!homestayId) return [];
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.managerBicycles.list(homestayId));
      return unwrapArray(response);
    } catch {
      return [];
    }
  },

  async createBicycle(payload: CreateBicyclePayload): Promise<ServiceResult> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.managerBicycles.create, payload);
      return toServiceResult(response, 'Thêm xe thành công');
    } catch (error) {
      return { success: false, message: toMessage(error) };
    }
  },

  async listDamageCatalogs(homestayId: string): Promise<any[]> {
    if (!homestayId) return [];
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.managerBicycles.damageCatalogs(homestayId));
      return unwrapArray(response);
    } catch {
      return [];
    }
  },

  async createDamageCatalog(payload: CreateDamageCatalogPayload): Promise<ServiceResult> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.managerBicycles.createDamageCatalog, payload);
      return toServiceResult(response, 'Thêm mức phạt thành công');
    } catch (error) {
      return { success: false, message: toMessage(error) };
    }
  },

  async listLocalRoutes(homestayId: string): Promise<any[]> {
    if (!homestayId) return [];
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.managerBicycles.localRoutes(homestayId));
      return unwrapArray(response);
    } catch {
      return [];
    }
  },

  async createLocalRoute(payload: CreateLocalRoutePayload): Promise<ServiceResult> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.managerBicycles.createLocalRoute, payload);
      return toServiceResult(response, 'Tạo lộ trình thành công');
    } catch (error) {
      return { success: false, message: toMessage(error) };
    }
  },
};
