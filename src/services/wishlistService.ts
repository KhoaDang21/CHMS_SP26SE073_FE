import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type { Homestay } from '../types/homestay.types';

const mapHomestay = (it: any): Homestay => ({
  id: String(it.id ?? it.Id ?? ''),
  name: it.name ?? it.Name ?? '',
  description: it.description ?? it.Description ?? '',
  address: it.address ?? it.Address ?? '',
  districtName: it.districtName ?? it.DistrictName ?? '',
  provinceName: it.provinceName ?? it.ProvinceName ?? '',
  city: it.city ?? it.City ?? '',
  country: it.country ?? it.Country ?? '',
  pricePerNight: it.pricePerNight ?? it.PricePerNight ?? 0,
  maxGuests: it.maxGuests ?? it.MaxGuests ?? 0,
  bedrooms: it.bedrooms ?? it.Bedrooms ?? 0,
  bathrooms: it.bathrooms ?? it.Bathrooms ?? 0,
  images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
  amenities: it.amenities ?? it.AmenityNames ?? it.amenityNames ?? [],
  rating: it.rating ?? it.Rating ?? null,
  reviewCount: it.reviewCount ?? it.ReviewCount ?? 0,
  ownerId: it.ownerId ?? it.OwnerId ?? '',
  ownerName: it.ownerName ?? it.OwnerName ?? '',
  status: it.status ?? it.Status ?? 'ACTIVE',
  createdAt: it.createdAt ?? it.CreatedAt ?? '',
  updatedAt: it.updatedAt ?? it.UpdatedAt ?? '',
});

export const wishlistService = {
  /** GET /api/wishlist */
  async getMyWishlist(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.wishlist.list);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(mapHomestay);
    } catch (e) {
      console.error('getMyWishlist error:', e);
      return [];
    }
  },

  /** POST /api/wishlist/{homestayId} */
  async add(homestayId: string): Promise<void> {
    await apiService.post<any>(apiConfig.endpoints.wishlist.add(homestayId));
  },

  /** DELETE /api/wishlist/{homestayId} */
  async remove(homestayId: string): Promise<void> {
    await apiService.delete<any>(apiConfig.endpoints.wishlist.remove(homestayId));
  },

  /** GET /api/recently-viewed */
  async getRecentlyViewed(): Promise<Homestay[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.wishlist.recentlyViewed);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(mapHomestay);
    } catch (e) {
      console.error('getRecentlyViewed error:', e);
      return [];
    }
  },
};
