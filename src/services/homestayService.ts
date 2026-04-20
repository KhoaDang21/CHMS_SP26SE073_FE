import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

const logDevError = (message: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
};

const normalizeSeasonalPricings = (item: any) => {
  const raw = item?.seasonalPricings ?? item?.SeasonalPricings ?? item?.seasonalPrices ?? item?.SeasonalPrices ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((price: any) => ({
      name: price?.name ?? price?.Name ?? undefined,
      startDate: String(price?.startDate ?? price?.StartDate ?? '').slice(0, 10),
      endDate: String(price?.endDate ?? price?.EndDate ?? '').slice(0, 10),
      price: Number(price?.price ?? price?.Price ?? 0),
      minStay: Number(price?.minStay ?? price?.MinStay ?? 0) || undefined,
    }))
    .filter((price: any) => price.startDate && price.endDate && Number.isFinite(price.price) && price.price > 0);
};

const normalizeHomestay = (it: any): Homestay => ({
  id: (it.id ?? it.Id)?.toString?.() ?? String(it.Id ?? it.id ?? ''),
  name: it.name ?? it.Name ?? '',
  description: it.description ?? it.Description ?? '',
  address: it.address ?? it.Address ?? '',
  districtId: it.districtId ?? it.DistrictId ?? '',
  districtName: it.districtName ?? it.DistrictName ?? '',
  provinceName: it.provinceName ?? it.ProvinceName ?? '',
  city: it.city ?? it.City ?? '',
  country: it.country ?? it.Country ?? '',
  latitude: it.latitude ?? it.Latitude,
  longitude: it.longitude ?? it.Longitude,
  pricePerNight: it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
  maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
  bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
  bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
  area: it.area ?? it.Area ?? 0,
  images: Array.isArray(it.images) ? [...it.images] : Array.isArray(it.ImageUrls) ? [...it.ImageUrls] : Array.isArray(it.imageUrls) ? [...it.imageUrls] : [],
  imageUrls: Array.isArray(it.imageUrls) ? [...it.imageUrls] : Array.isArray(it.ImageUrls) ? [...it.ImageUrls] : Array.isArray(it.images) ? [...it.images] : [],
  amenities: Array.isArray(it.amenities) ? [...it.amenities] : Array.isArray(it.AmenityNames) ? [...it.AmenityNames] : Array.isArray(it.amenityNames) ? [...it.amenityNames] : [],
  amenityIds: Array.isArray(it.amenityIds) ? [...it.amenityIds] : Array.isArray(it.AmenityIds) ? [...it.AmenityIds] : [],
  amenityNames: Array.isArray(it.amenityNames) ? [...it.amenityNames] : Array.isArray(it.AmenityNames) ? [...it.AmenityNames] : [],
  averageRating: it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
  totalReviews: it.totalReviews ?? it.TotalReviews ?? it.reviewCount ?? it.ReviewCount ?? 0,
  rating: it.rating ?? it.Rating ?? null,
  reviewCount: it.reviewCount ?? it.ReviewCount ?? it.totalReviews ?? it.TotalReviews ?? 0,
  ownerId: it.ownerId ?? it.OwnerId ?? '',
  ownerName: it.ownerName ?? it.OwnerName ?? '',
  status: it.status ?? it.Status ?? 'ACTIVE',
  featured: it.featured ?? it.Featured ?? false,
  cancellationPolicy: it.cancellationPolicy ?? it.CancellationPolicy ?? '',
  houseRules: it.houseRules ?? it.HouseRules ?? '',
  depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
  seasonalPricings: normalizeSeasonalPricings(it),
  createdAt: it.createdAt ?? it.CreatedAt ?? '',
  updatedAt: it.updatedAt ?? it.UpdatedAt ?? '',
  addedAt: it.addedAt ?? it.AddedAt ?? '',
});

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
      const items = Array.isArray(payload)
        ? payload
        : (payload?.items ?? payload?.Items ?? []);

      return (Array.isArray(items) ? items : []).map(normalizeHomestay);
    } catch (error) {
      logDevError("Error fetching admin homestays:", error);
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
      const payload = res?.data ?? res ?? null;
      if (!payload) return null;
      return normalizeHomestay(payload?.item ?? payload);
    } catch (error) {
      logDevError("Error fetching admin homestay by id:", error);
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
      logDevError("Error creating homestay:", error);
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
      logDevError("Error updating homestay:", error);
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
      logDevError("Error updating homestay status:", error);
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
      logDevError("Error deleting homestay:", error);
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
      logDevError("Error updating homestay amenities:", error);
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
      logDevError("Error uploading homestay photo:", error);
      return null;
    }
  },

  async uploadAdminHomestayPhotos(id: string, files: File[]): Promise<{ total: number; success: number; failed: number }> {
    const uploads = await Promise.allSettled(files.map((file) => this.uploadAdminHomestayPhoto(id, file)));
    const success = uploads.filter(
      (item) => item.status === 'fulfilled' && item.value && item.value?.success !== false,
    ).length;

    return {
      total: files.length,
      success,
      failed: files.length - success,
    };
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
      logDevError("Error reordering homestay photos:", error);
      return null;
    }
  },
};
