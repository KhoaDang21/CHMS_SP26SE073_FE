import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

export const homestayService = {
  /**
   * GET /api/admin/homestays
   */
  async getAllAdminHomestays(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.adminHomestays.list,
      );
      const payload = res?.data ?? res;
      return Array.isArray(payload)
        ? payload
        : (payload?.items ?? payload?.Items ?? []);
    } catch (error) {
      console.error("Error fetching admin homestays:", error);
      return [];
    }
  },

  /**
   * GET /api/admin/homestays/{id}
   */
  async getAdminHomestayById(id: string): Promise<Homestay | null> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.adminHomestays.detail(id),
      );
      return res?.data ?? res ?? null;
    } catch (error) {
      console.error("Error fetching admin homestay by id:", error);
      return null;
    }
  },

  /**
   * POST /api/admin/homestays
   */
  async createAdminHomestay(data: any): Promise<any> {
    try {
      const res = await apiService.post<any>(
        apiConfig.endpoints.adminHomestays.create,
        data,
      );
      return res;
    } catch (error) {
      console.error("Error creating homestay:", error);
      return null;
    }
  },

  /**
   * PUT /api/admin/homestays/{id}
   */
  async updateAdminHomestay(id: string, data: any): Promise<any> {
    try {
      const res = await apiService.put<any>(
        apiConfig.endpoints.adminHomestays.update(id),
        data,
      );
      return res;
    } catch (error) {
      console.error("Error updating homestay:", error);
      return null;
    }
  },

  /**
   * PATCH /api/admin/homestays/{id}/status
   */
  async updateAdminHomestayStatus(id: string, status: string): Promise<any> {
    try {
      const res = await apiService.patch<any>(
        apiConfig.endpoints.adminHomestays.updateStatus(id),
        status,
      );
      return res;
    } catch (error) {
      console.error("Error updating homestay status:", error);
      return null;
    }
  },

  /**
   * DELETE /api/admin/homestays/{id}
   */
  async deleteAdminHomestay(id: string): Promise<any> {
    try {
      const res = await apiService.delete<any>(
        apiConfig.endpoints.adminHomestays.delete(id),
      );
      return res;
    } catch (error) {
      console.error("Error deleting homestay:", error);
      return null;
    }
  },

  /**
   * PUT /api/admin/homestays/{id}/amenities
   */
  async updateAdminHomestayAmenities(
    id: string,
    amenityIds: string[],
  ): Promise<any> {
    try {
      const res = await apiService.put<any>(
        apiConfig.endpoints.adminHomestays.updateAmenities(id),
        amenityIds,
      );
      return res;
    } catch (error) {
      console.error("Error updating homestay amenities:", error);
      return null;
    }
  },

  /**
   * POST /api/admin/homestays/{id}/photos - upload file
   */
  async uploadAdminHomestayPhoto(id: string, file: File): Promise<any> {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiService.postForm<any>(
        apiConfig.endpoints.adminHomestays.uploadPhotos(id),
        form,
      );
      return res;
    } catch (error) {
      console.error("Error uploading homestay photo:", error);
      return null;
    }
  },

  /**
   * PUT /api/admin/homestays/{id}/photos/reorder
   */
  async reorderAdminHomestayPhotos(
    id: string,
    sortedImageIds: string[],
  ): Promise<any> {
    try {
      const res = await apiService.put<any>(
        apiConfig.endpoints.adminHomestays.reorderPhotos(id),
        sortedImageIds,
      );
      return res;
    } catch (error) {
      console.error("Error reordering homestay photos:", error);
      return null;
    }
  },
};
