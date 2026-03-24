import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

const mapHomestay = (it: any): Homestay => ({
  id: String(it.id ?? it.Id ?? it.HomestayId ?? it.homestayId ?? ""),
  name: it.name ?? it.Name ?? it.HomestayName ?? it.homestayName ?? "",
  description: it.description ?? it.Description ?? "",
  address: it.address ?? it.Address ?? "",
  districtName: it.districtName ?? it.DistrictName ?? "",
  provinceName: it.provinceName ?? it.ProvinceName ?? "",
  city: it.city ?? it.City ?? "",
  country: it.country ?? it.Country ?? "",
  pricePerNight:
    it.pricePerNight ?? it.PricePerNight ?? it.Price ?? it.price ?? 0,
  addedAt:
    it.addedAt ??
    it.AddedAt ??
    it.AddedAt ??
    it.createdAt ??
    it.CreatedAt ??
    "",
  maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
  bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
  bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
  images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
  amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
  rating: it.rating ?? it.Rating ?? null,
  reviewCount: it.reviewCount ?? it.ReviewCount ?? 0,
  ownerId: it.ownerId ?? it.OwnerId ?? "",
  ownerName: it.ownerName ?? it.OwnerName ?? "",
  status: it.status ?? it.Status ?? "ACTIVE",
  createdAt: it.createdAt ?? it.CreatedAt ?? "",
  updatedAt: it.updatedAt ?? it.UpdatedAt ?? "",
});

export const wishlistService = {
  /** GET /api/wishlist */
  async getMyWishlist(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.wishlist.list);
      const list: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      const mapped: Homestay[] = list.map(mapHomestay);

      // If items lack images, fetch homestay details to enrich (BE wishlist may not include images)
      const enriched = await Promise.all(
        mapped.map(async (it) => {
          if (it.images && it.images.length > 0) return it;
          try {
            const detailRes = await apiService.get<any>(
              apiConfig.endpoints.homestays.detail(it.id),
            );
            const detailData = detailRes?.data ?? detailRes ?? {};
            const images =
              detailData.images ??
              detailData.imageUrls ??
              detailData.ImageUrls ??
              [];
            return { ...it, images } as Homestay;
          } catch (e) {
            return it;
          }
        }),
      );

      return enriched;
    } catch (e) {
      console.error("getMyWishlist error:", e);
      return [];
    }
  },

  /** POST /api/wishlist/{homestayId} */
  async add(homestayId: string): Promise<void> {
    await apiService.post<any>(apiConfig.endpoints.wishlist.add(homestayId));
  },

  /** DELETE /api/wishlist/{homestayId} */
  async remove(homestayId: string): Promise<void> {
    await apiService.delete<any>(
      apiConfig.endpoints.wishlist.remove(homestayId),
    );
  },

  /** GET /api/recently-viewed */
  async getRecentlyViewed(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.wishlist.recentlyViewed,
      );
      const list: any[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      return list.map(mapHomestay);
    } catch (e) {
      console.error("getRecentlyViewed error:", e);
      return [];
    }
  },
};
