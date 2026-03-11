// Amenity Service - uses apiService and apiConfig to call BE endpoints
import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type {
  Amenity,
  CreateAmenityDTO,
  UpdateAmenityDTO,
} from "../types/amenity.types";

export const amenityService = {
  /**
   * GET /api/amenities (public)
   */
  async getAllAmenities(): Promise<Amenity[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.amenities.list);
      // normalize ApiResponse -> { data: [...] } or direct array
      if (res?.data)
        return Array.isArray(res.data) ? res.data : (res.data.Items ?? []);
      if (Array.isArray(res)) return res;
      return [];
    } catch (error) {
      console.error("Error fetching amenities:", error);
      return [];
    }
  },

  /**
   * POST /api/admin/amenities (admin)
   */
  async createAmenity(
    amenityData: CreateAmenityDTO,
  ): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.post<any>(
        apiConfig.endpoints.adminAmenities.create,
        amenityData,
      );
      return res;
    } catch (error) {
      console.error("Error creating amenity:", error);
      return null;
    }
  },

  /**
   * PUT /api/admin/amenities/{id} (admin)
   */
  async updateAmenity(
    id: string,
    amenityData: UpdateAmenityDTO,
  ): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.put<any>(
        apiConfig.endpoints.adminAmenities.update(id),
        amenityData,
      );
      return res;
    } catch (error) {
      console.error("Error updating amenity:", error);
      return null;
    }
  },

  /**
   * DELETE /api/admin/amenities/{id} (admin)
   */
  async deleteAmenity(
    id: string,
  ): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.delete<any>(
        apiConfig.endpoints.adminAmenities.delete(id),
      );
      return res;
    } catch (error) {
      console.error("Error deleting amenity:", error);
      return null;
    }
  },
};
