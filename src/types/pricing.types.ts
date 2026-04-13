export interface BasePrice {
  pricePerNight: number;
  minStay?: number;
  maxGuests?: number;
}

export interface SeasonalPricing {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price: number;
  pricePerNight?: number;
  description?: string;
  status?: string;
}

export interface PricingOverviewResponse {
  basePrice: BasePrice;
  seasonalPrices: SeasonalPricing[];
}

export interface BulkBasePriceUpdateRequest {
  homestayIds: string[];
  newBasePrice: number;
}

export interface BulkPricingUpdateLegacy {
  homestayId: string;
  startDate?: string;
  endDate?: string;
  pricePerNight: number;
}

export interface SeasonalPricingCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
  price: number;
  pricePerNight?: number;
  description?: string;
  status?: string;
}

export interface SeasonalPricingUpdateRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  price?: number;
  pricePerNight?: number;
  description?: string;
  status?: string;
}

export interface ServiceResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}
