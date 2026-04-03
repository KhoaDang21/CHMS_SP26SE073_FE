export type PromotionType = 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'COUPON' | 'FLASH_SALE' | 'SEASONAL';
export type PromotionStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  code?: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minBookingValue?: number;
  startDate: string;
  endDate: string;
  maxUses?: number;
  usedCount: number;
  status: PromotionStatus;
  applicableHomestays?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePromotionDTO {
  name: string;
  description?: string;
  code?: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minBookingValue?: number;
  startDate: string;
  endDate: string;
  maxUses?: number;
  applicableHomestays?: string[];
}

export interface UpdatePromotionDTO {
  name?: string;
  description?: string;
  code?: string;
  type?: PromotionType;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscount?: number;
  minBookingValue?: number;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  applicableHomestays?: string[];
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
