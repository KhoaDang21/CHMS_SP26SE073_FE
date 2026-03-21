import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

// Khớp 100% với ReviewResponseDTO từ BE
export interface Review {
  id: string;
  bookingId: string;
  homestayId: string;
  homestayName: string;
  customerName: string;
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
  comment: string;
  replyFromOwner?: string;
  replyAt?: string;
  isVerified?: boolean;
  createdAt: string;
}

// Khớp với CreateReviewRequestDTO
export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
  comment: string;
}

// Khớp với UpdateReviewRequestDTO (không có bookingId)
export type UpdateReviewPayload = Omit<CreateReviewPayload, 'bookingId'>;

const mapReview = (raw: any): Review => ({
  id: raw.id,
  bookingId: raw.bookingId,
  homestayId: raw.homestayId,
  homestayName: raw.homestayName ?? '',
  customerName: raw.customerName ?? '',
  rating: raw.rating ?? 0,
  cleanlinessRating: raw.cleanlinessRating ?? 0,
  locationRating: raw.locationRating ?? 0,
  valueRating: raw.valueRating ?? 0,
  communicationRating: raw.communicationRating ?? 0,
  comment: raw.comment ?? '',
  replyFromOwner: raw.replyFromOwner ?? undefined,
  replyAt: raw.replyAt ?? undefined,
  isVerified: raw.isVerified ?? undefined,
  createdAt: raw.createdAt ?? '',
});

export const reviewService = {
  /** POST /api/reviews — tạo review mới (booking phải COMPLETED) */
  async create(payload: CreateReviewPayload): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.reviews.create, payload);
      return { success: res?.success ?? true, message: res?.message ?? 'Gửi đánh giá thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Gửi đánh giá thất bại.' };
    }
  },

  /** GET /api/reviews/my-reviews */
  async getMyReviews(): Promise<Review[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.reviews.myReviews);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(mapReview);
    } catch {
      return [];
    }
  },

  /** PUT /api/reviews/{id} */
  async update(id: string, payload: UpdateReviewPayload): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.put<any>(apiConfig.endpoints.reviews.update(id), payload);
      return { success: res?.success ?? true, message: res?.message ?? 'Sửa đánh giá thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Sửa đánh giá thất bại.' };
    }
  },

  /** DELETE /api/reviews/{id} */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.delete<any>(apiConfig.endpoints.reviews.delete(id));
      return { success: res?.success ?? true, message: res?.message ?? 'Xóa đánh giá thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Xóa đánh giá thất bại.' };
    }
  },

  // ── Manager ──────────────────────────────────────────────
  async managerList(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.reviews.managerList, params);
  },
  async managerRespond(id: string, payload: { replyFromOwner: string }) {
    return apiService.post<any>(apiConfig.endpoints.reviews.managerRespond(id), payload);
  },
  async managerUpdateRespond(id: string, payload: { replyFromOwner: string }) {
    return apiService.put<any>(apiConfig.endpoints.reviews.managerUpdateRespond(id), payload);
  },

  // ── Staff ─────────────────────────────────────────────────
  async staffList(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.reviews.staffList, params);
  },
  async staffApprove(id: string) {
    return apiService.post<any>(apiConfig.endpoints.reviews.staffApprove(id));
  },
  async staffReject(id: string) {
    return apiService.post<any>(apiConfig.endpoints.reviews.staffReject(id));
  },
};
