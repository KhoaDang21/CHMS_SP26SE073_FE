import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

export interface PagedHomestays {
  Items: Homestay[];
  CurrentPage: number;
  PageSize: number;
  TotalCount: number;
}

export const publicHomestayService = {
  // simple in-memory cache for last fetched list
  _cache: {
    lastList: [] as Homestay[],
  },
  /**
   * GET /api/homestays - list (paged)
   * params: page, pageSize, etc.
   */
  async list(params?: Record<string, any>): Promise<PagedHomestays> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.homestays.list,
        params,
      );

      // Normalize possible response shapes:
      // 1) ApiResponse => { success, message, data: { items, currentPage, ... } }
      // 2) PagedResult directly => { items | Items, currentPage | CurrentPage, ... }
      const paged = res?.data ?? res;

      const items = paged?.items ?? paged?.Items ?? [];
      const currentPage = paged?.currentPage ?? paged?.CurrentPage ?? 1;
      const pageSize = paged?.pageSize ?? paged?.PageSize ?? 10;
      const totalCount = paged?.totalCount ?? paged?.TotalCount ?? 0;

      // Normalize backend DTO field names to frontend `Homestay` shape
      const normalized = (Array.isArray(items) ? items : []).map((it: any) => ({
        id: (it.id ?? it.Id)?.toString?.() ?? String(it.Id ?? it.id ?? ""),
        name: it.name ?? it.Name ?? "",
        description: it.description ?? it.Description ?? "",
        address: it.address ?? it.Address ?? "",
        districtName: it.districtName ?? it.DistrictName ?? "",
        provinceName: it.provinceName ?? it.ProvinceName ?? "",
        city: it.city ?? it.City ?? "",
        country: it.country ?? it.Country ?? "",
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating: it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews: it.totalReviews ?? it.TotalReviews ?? it.reviewCount ?? it.ReviewCount ?? 0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount: it.reviewCount ?? it.ReviewCount ?? it.totalReviews ?? it.TotalReviews ?? 0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        createdAt: it.createdAt ?? it.CreatedAt ?? "",
        updatedAt: it.updatedAt ?? it.UpdatedAt ?? "",
      }));

      // store cache
      try {
        this._cache.lastList = normalized;
      } catch {}

      return {
        Items: normalized,
        CurrentPage: currentPage,
        PageSize: pageSize,
        TotalCount: totalCount,
      };
    } catch (error) {
      console.error("Error fetching homestays list:", error);
      return { Items: [], CurrentPage: 1, PageSize: 10, TotalCount: 0 };
    }
  },

  /**
   * GET /api/homestays/{id}
   */
  async getById(id: string): Promise<Homestay | null> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.homestays.detail(id),
      );
      const payload = res?.data ?? res;
      if (!payload) return null;

      const it = payload?.item ?? payload ?? {};
      // Normalize fields to frontend Homestay shape
      const normalized = {
        id: (it.id ?? it.Id)?.toString?.() ?? String(it.Id ?? it.id ?? ""),
        name: it.name ?? it.Name ?? "",
        description: it.description ?? it.Description ?? "",
        address: it.address ?? it.Address ?? "",
        districtName: it.districtName ?? it.DistrictName ?? "",
        provinceName: it.provinceName ?? it.ProvinceName ?? "",
        city: it.city ?? it.City ?? "",
        country: it.country ?? it.Country ?? "",
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating: it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews: it.totalReviews ?? it.TotalReviews ?? it.reviewCount ?? it.ReviewCount ?? 0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount: it.reviewCount ?? it.ReviewCount ?? it.totalReviews ?? it.TotalReviews ?? 0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        createdAt: it.createdAt ?? it.CreatedAt ?? "",
        updatedAt: it.updatedAt ?? it.UpdatedAt ?? "",
      } as Homestay;

      return normalized;
    } catch (error) {
      console.error("Error fetching homestay detail:", error);
      return null;
    }
  },

  /**
   * GET /api/homestays/search
   * params: search query params
   */
  async search(params?: Record<string, any>): Promise<PagedHomestays> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.homestays.search,
        params,
      );
      const paged = res?.data ?? res;
      const items = paged?.items ?? paged?.Items ?? [];
      const currentPage = paged?.currentPage ?? paged?.CurrentPage ?? 1;
      const pageSize = paged?.pageSize ?? paged?.PageSize ?? 10;
      const totalCount = paged?.totalCount ?? paged?.TotalCount ?? 0;

      // do not normalize here because search is used internally for filters; caller can normalize if needed
      const normalized = (Array.isArray(items) ? items : []).map((it: any) => ({
        id: (it.id ?? it.Id)?.toString?.() ?? String(it.Id ?? it.id ?? ""),
        name: it.name ?? it.Name ?? "",
        description: it.description ?? it.Description ?? "",
        address: it.address ?? it.Address ?? "",
        districtName: it.districtName ?? it.DistrictName ?? "",
        provinceName: it.provinceName ?? it.ProvinceName ?? "",
        city: it.city ?? it.City ?? "",
        country: it.country ?? it.Country ?? "",
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating: it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews: it.totalReviews ?? it.TotalReviews ?? it.reviewCount ?? it.ReviewCount ?? 0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount: it.reviewCount ?? it.ReviewCount ?? it.totalReviews ?? it.TotalReviews ?? 0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        createdAt: it.createdAt ?? it.CreatedAt ?? "",
        updatedAt: it.updatedAt ?? it.UpdatedAt ?? "",
      }));

      try {
        this._cache.lastList = normalized;
      } catch {}

      return {
        Items: normalized,
        CurrentPage: currentPage,
        PageSize: pageSize,
        TotalCount: totalCount,
      };
    } catch (error) {
      console.error("Error searching homestays:", error);
      return { Items: [], CurrentPage: 1, PageSize: 10, TotalCount: 0 };
    }
  },
};
