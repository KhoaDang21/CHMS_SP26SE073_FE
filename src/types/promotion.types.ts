export type PromotionType = 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'COUPON' | 'FLASH_SALE' | 'SEASONAL';
export type PromotionStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: string;
  name?: string;
  description?: string;
  code: string;
  // BE-aligned fields
  discountPercent: number;
  discountAmount: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate: string;
  endDate: string;
  maxUsage?: number;
  isActive: boolean;
  // Optional fields returned by some BE variants
  usedCount?: number;
  status?: PromotionStatus;
  // Legacy fields kept for compatibility
  type?: PromotionType;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscount?: number;
  minBookingValue?: number;
  maxUses?: number;
  applicableHomestays?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePromotionDTO {
  code: string;
  description?: string;
  discountPercent: number;
  discountAmount: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate: string;
  endDate: string;
  maxUsage?: number;
  isActive: boolean;
}

export interface UpdatePromotionDTO {
  code?: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
  startDate?: string;
  endDate?: string;
  maxUsage?: number;
  isActive?: boolean;
}

export interface CouponValidationRequest {
  code: string;
  bookingTotal: number;
  homestayId?: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  promotion?: Promotion;
  discountAmount: number;
  finalPrice: number;
  message?: string;
}

export interface PromotionListResponse {
  data: Promotion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PromotionStats {
  totalPromotions: number;
  activePromotions: number;
  totalDiscountGiven: number;
  averageDiscount: number;
}
