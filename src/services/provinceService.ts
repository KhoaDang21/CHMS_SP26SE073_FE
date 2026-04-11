import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Province } from "../types/homestay.types";

class ProvinceService {
  /** GET /api/locations/provinces — đồng bộ BE LocationController */
  async getAllProvinces(): Promise<Province[]> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.locations.provinces,
      );
      const list: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      return list.map((r: any) => ({
        id: String(r.id ?? r.Id ?? ""),
        name: r.name ?? r.Name ?? "",
      }));
    } catch (error) {
      console.error("Error fetching provinces:", error);
      return [];
    }
  }
}

export const provinceService = new ProvinceService();
