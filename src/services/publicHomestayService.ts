import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

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

export interface PagedHomestays {
  Items: Homestay[];
  CurrentPage: number;
  PageSize: number;
  TotalCount: number;
}

export interface OccupiedDateRange {
  checkIn: string;
  checkOut: string;
}

export interface HomestayCompareScore {
  homestayId: string;
  homestayName?: string;
  matchScore?: number;
  priceScore?: number;
  amenityScore?: number;
  locationScore?: number;
}

export interface HomestayCompareResult {
  homestays: Homestay[];
  aiAnalysisMarkdown?: string;
  scores?: HomestayCompareScore[];
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
        latitude: it.latitude ?? it.Latitude,
        longitude: it.longitude ?? it.Longitude,
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating:
          it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews:
          it.totalReviews ??
          it.TotalReviews ??
          it.reviewCount ??
          it.ReviewCount ??
          0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount:
          it.reviewCount ??
          it.ReviewCount ??
          it.totalReviews ??
          it.TotalReviews ??
          0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        seasonalPricings: normalizeSeasonalPricings(it),
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
        latitude: it.latitude ?? it.Latitude,
        longitude: it.longitude ?? it.Longitude,
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating:
          it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews:
          it.totalReviews ??
          it.TotalReviews ??
          it.reviewCount ??
          it.ReviewCount ??
          0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount:
          it.reviewCount ??
          it.ReviewCount ??
          it.totalReviews ??
          it.TotalReviews ??
          0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        seasonalPricings: normalizeSeasonalPricings(it),
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
        latitude: it.latitude ?? it.Latitude,
        longitude: it.longitude ?? it.Longitude,
        pricePerNight:
          it.pricePerNight ?? it.PricePerNight ?? Number(it.price ?? 0),
        maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
        bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
        bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        averageRating:
          it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews:
          it.totalReviews ??
          it.TotalReviews ??
          it.reviewCount ??
          it.ReviewCount ??
          0,
        rating: it.rating ?? it.Rating ?? null,
        reviewCount:
          it.reviewCount ??
          it.ReviewCount ??
          it.totalReviews ??
          it.TotalReviews ??
          0,
        ownerId: it.ownerId ?? it.OwnerId ?? "",
        ownerName: it.ownerName ?? it.OwnerName ?? "",
        status: it.status ?? it.Status ?? "ACTIVE",
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        seasonalPricings: normalizeSeasonalPricings(it),
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

  /** GET /api/bookings/homestays/{homestayId}/occupied-dates */
  async getOccupiedDates(homestayId: string): Promise<OccupiedDateRange[]> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.bookings.occupiedDates(homestayId),
      );

      const rawList: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      return rawList
        .map((item) => ({
          checkIn: String(item?.checkIn ?? item?.CheckIn ?? "").slice(0, 10),
          checkOut: String(item?.checkOut ?? item?.CheckOut ?? "").slice(0, 10),
        }))
        .filter((item) => item.checkIn && item.checkOut);
    } catch (error) {
      console.error("Error fetching occupied dates:", error);
      return [];
    }
  },

  /** POST /api/public/homestays/compare — so sánh nhiều homestay */
  async compare(
    homestayIds: string[],
    customerPreferences?: string,
  ): Promise<HomestayCompareResult | null> {
    try {
      const payload = {
        homestayIds: homestayIds.filter(id => id?.trim()),
        customerPreferences: customerPreferences?.trim() || undefined,
      };

      if (payload.homestayIds.length === 0) {
        console.warn('compare: no homestay IDs provided');
        return { homestays: [] };
      }

      const res = await apiService.post<any>(
        apiConfig.endpoints.publicHomestays.compare,
        payload,
      );

      // Handle multiple BE response shapes:
      // 1) []
      // 2) { data: [] }
      // 3) { data: { homestaysData: [] } }
      // 4) { homestaysData: [] }
      const rawList: any[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.homestaysData)
            ? res.data.homestaysData
            : Array.isArray(res?.data?.items)
              ? res.data.items
              : Array.isArray(res?.homestaysData)
                ? res.homestaysData
                : Array.isArray(res?.items)
                  ? res.items
                  : [];

      const aiAnalysisMarkdown =
        res?.data?.aiAnalysisMarkdown ??
        res?.aiAnalysisMarkdown ??
        undefined;

      const rawScores: any[] = Array.isArray(res?.data?.scores)
        ? res.data.scores
        : Array.isArray(res?.scores)
          ? res.scores
          : [];

      if (rawList.length === 0) {
        return {
          homestays: [],
          aiAnalysisMarkdown,
          scores: rawScores.map((s) => ({
            homestayId: String(s?.homestayId ?? ''),
            homestayName: s?.homestayName,
            matchScore: Number(s?.matchScore ?? 0),
            priceScore: Number(s?.priceScore ?? 0),
            amenityScore: Number(s?.amenityScore ?? 0),
            locationScore: Number(s?.locationScore ?? 0),
          })),
        };
      }

      // Normalize response to Homestay format
      const homestays = rawList.map((it: any) => ({
        id: (it.id ?? it.Id)?.toString?.() ?? String(it.Id ?? it.id ?? ''),
        name: it.name ?? it.Name ?? '',
        description: it.description ?? it.Description ?? '',
        address: it.address ?? it.Address ?? '',
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
        area: it.area ?? it.Area,
        images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
        amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
        amenityIds: it.amenityIds ?? it.AmenityIds ?? [],
        averageRating: it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
        totalReviews: it.totalReviews ?? it.TotalReviews ?? it.reviewCount ?? it.ReviewCount ?? 0,
        ownerId: it.ownerId ?? it.OwnerId ?? '',
        ownerName: it.ownerName ?? it.OwnerName ?? '',
        status: it.status ?? it.Status ?? 'ACTIVE',
        depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 20,
        cancellationPolicy: it.cancellationPolicy ?? it.CancellationPolicy ?? '',
        houseRules: it.houseRules ?? it.HouseRules ?? '',
        seasonalPricings: normalizeSeasonalPricings(it),
        createdAt: it.createdAt ?? it.CreatedAt ?? '',
        updatedAt: it.updatedAt ?? it.UpdatedAt ?? '',
      } as Homestay));

      return {
        homestays,
        aiAnalysisMarkdown,
        scores: rawScores.map((s) => ({
          homestayId: String(s?.homestayId ?? ''),
          homestayName: s?.homestayName,
          matchScore: Number(s?.matchScore ?? 0),
          priceScore: Number(s?.priceScore ?? 0),
          amenityScore: Number(s?.amenityScore ?? 0),
          locationScore: Number(s?.locationScore ?? 0),
        })),
      };
    } catch (error) {
      console.error('Error comparing homestays:', error);
      return null;
    }
  },
};
