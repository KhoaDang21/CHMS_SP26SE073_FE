import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

const logDevError = (message: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
};

/** ManagerHomestayController — api/manager/homestays */
export const managerHomestayService = {
  async list(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.managerHomestays.list,
      );
      const payload = res?.data ?? res;
      return Array.isArray(payload)
        ? payload
        : (payload?.items ?? payload?.Items ?? []);
    } catch (error) {
      logDevError("Error fetching manager homestays:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Homestay | null> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.managerHomestays.detail(id),
      );
      return res?.data ?? res ?? null;
    } catch (error) {
      logDevError("Error fetching manager homestay detail:", error);
      return null;
    }
  },

  async update(id: string, data: unknown): Promise<any> {
    try {
      return await apiService.put<any>(
        apiConfig.endpoints.managerHomestays.update(id),
        data,
      );
    } catch (error) {
      logDevError("Error updating manager homestay:", error);
      return null;
    }
  },
};
