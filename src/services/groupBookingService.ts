import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface HomestayOption {
  homestayId: string;
  homestayName: string;
  capacity?: number;
  address?: string;
  pricePerNight: number;
  availableRooms?: number;
  images?: string[];
  ratings?: number;
}

export interface SearchCombinationRequest {
  districtId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
}

export interface HomestayCondition {
  homestayId: string;
  roomCount: number; // Số phòng cần đặt tại homestay này
  pricePerNight?: number;
}

export interface CreateGroupBookingRequest {
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  selectedHomestayIds: string[];
  note?: string;
  contactPhone?: string;
  promotionId?: string;
  couponCode?: string;
}

export interface CalculateGroupBookingRequest {
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  selectedHomestayIds: string[];
  promotionId?: string;
}

export interface GroupBookingBreakdown {
  homestayId: string;
  homestayName: string;
  roomCount: number;
  nightsCount: number;
  pricePerNight: number;
  subtotal: number;
}

export interface GroupBookingCalculation {
  breakdowns: GroupBookingBreakdown[];
  subTotal: number;
  discountAmount: number;
  totalPrice: number;
  depositAmount: number;
  remainingAmount: number;
  depositPercentage?: number;
  taxes?: number;
}

export interface GroupBooking {
  id: string;
  homestays: HomestayCondition[];
  checkIn: string;
  checkOut: string;
  totalGuestCount: number;
  totalPrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  status: string;
  specialRequests?: string;
  contactPhone?: string;
  createdAt?: string;
}

export interface SearchCombinationResponse {
  success?: boolean;
  totalCapacity?: number;
  totalPricePerNight?: number;
  homestays?: HomestayOption[];
  alternativeHomestays?: HomestayOption[];
  recommendations?: HomestayOption[];
  message?: string;
}

const normalizeCalculationNumber = (value: any): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeGroupBookingCalculation = (response: any): GroupBookingCalculation => {
  if (!response) return {} as GroupBookingCalculation;

  const raw = response?.data ?? response?.Data ?? response?.a ?? response?.A ?? response?.result ?? response?.Result ?? response;
  const breakdownsRaw = raw?.breakdowns ?? raw?.Breakdowns ?? raw?.items ?? raw?.Items ?? [];

  return {
    breakdowns: Array.isArray(breakdownsRaw)
      ? breakdownsRaw.map((item: any) => ({
          homestayId: String(item?.homestayId ?? item?.HomestayId ?? ''),
          homestayName: String(item?.homestayName ?? item?.HomestayName ?? ''),
          roomCount: Number(item?.roomCount ?? item?.RoomCount ?? 0) || 0,
          nightsCount: Number(item?.nightsCount ?? item?.NightsCount ?? 0) || 0,
          pricePerNight: Number(item?.pricePerNight ?? item?.PricePerNight ?? 0) || 0,
          subtotal: Number(item?.subtotal ?? item?.SubTotal ?? item?.amount ?? item?.Amount ?? 0) || 0,
        }))
      : [],
    subTotal: normalizeCalculationNumber(raw?.subTotal ?? raw?.SubTotal ?? raw?.subtotal ?? raw?.Subtotal) ?? 0,
    discountAmount: normalizeCalculationNumber(raw?.discountAmount ?? raw?.DiscountAmount ?? raw?.discount ?? raw?.Discount) ?? 0,
    totalPrice: normalizeCalculationNumber(raw?.totalPrice ?? raw?.TotalPrice ?? raw?.total ?? raw?.Total) ?? 0,
    depositAmount: normalizeCalculationNumber(raw?.depositAmount ?? raw?.DepositAmount ?? raw?.deposit ?? raw?.Deposit) ?? 0,
    remainingAmount: normalizeCalculationNumber(raw?.remainingAmount ?? raw?.RemainingAmount ?? raw?.remaining ?? raw?.Remaining) ?? 0,
    depositPercentage: normalizeCalculationNumber(raw?.depositPercentage ?? raw?.DepositPercentage),
    taxes: normalizeCalculationNumber(raw?.taxes ?? raw?.Taxes),
  };
};

const mapHomestayOption = (item: any): HomestayOption => {
  const result = {
    homestayId: String(item?.id ?? item?.Id ?? item?.homestayId ?? item?.HomestayId ?? ''),
    homestayName: String(item?.name ?? item?.Name ?? item?.homestayName ?? item?.HomestayName ?? ''),
    capacity: Number(item?.capacity ?? item?.Capacity ?? 0) || undefined,
    address: item?.address ?? item?.Address ?? undefined,
    pricePerNight: Number(item?.pricePerNight ?? item?.PricePerNight ?? item?.price ?? item?.Price ?? 0),
    availableRooms: Number(item?.availableRooms ?? item?.AvailableRooms ?? 0) || undefined,
    images: Array.isArray(item?.images ?? item?.Images) ? (item?.images ?? item?.Images) : [],
    ratings: item?.ratings ?? item?.Ratings ?? item?.averageRating ?? item?.AverageRating,
  };
  console.log('Raw API item:', item);
  console.log('Mapped homestay:', result);
  return result;
};

const normalizeSearchResponse = (response: any): SearchCombinationResponse => {
  if (!response) return {};

  if (Array.isArray(response)) {
    return { alternativeHomestays: response };
  }

  if (typeof response === 'string') {
    try {
      const parsed = JSON.parse(response);
      return normalizeSearchResponse(parsed);
    } catch {
      return { message: response };
    }
  }

  if (response?.success && response?.data) {
    return normalizeSearchResponse(response.data);
  }

  const homestaysRaw = response.homestays ?? response.Homestays ?? response.alternativeHomestays ?? response.AlternativeHomestays ?? [];

  return {
    success: response.success ?? response.Success,
    totalCapacity: Number(response.totalCapacity ?? response.TotalCapacity ?? 0) || undefined,
    totalPricePerNight: Number(response.totalPricePerNight ?? response.TotalPricePerNight ?? 0) || undefined,
    homestays: Array.isArray(homestaysRaw) ? homestaysRaw.map(mapHomestayOption) : [],
    alternativeHomestays: Array.isArray(homestaysRaw) ? homestaysRaw.map(mapHomestayOption) : [],
    recommendations: Array.isArray(response.recommendations ?? response.Recommendations)
      ? (response.recommendations ?? response.Recommendations).map(mapHomestayOption)
      : undefined,
    message: response.message,
  };
};

const mapGroupBooking = (item: any): GroupBooking => {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  };

  return {
    id: String(get("id", "Id") ?? ""),
    homestays: get("homestays", "Homestays") || [],
    checkIn: String(get("checkIn", "CheckIn", "checkInDate", "CheckInDate") ?? ""),
    checkOut: String(get("checkOut", "CheckOut", "checkOutDate", "CheckOutDate") ?? ""),
    totalGuestCount: Number(get("totalGuestCount", "TotalGuestCount", "totalGuests", "TotalGuests") ?? 0),
    // API may return totalAmount / totalPrice - prefer totalAmount
    totalPrice: Number(get("totalPrice", "TotalPrice", "totalAmount", "TotalAmount") ?? undefined),
    depositAmount: Number(get("depositAmount", "DepositAmount", "depositAmount", "DepositAmount") ?? undefined),
    remainingAmount: Number(get("remainingAmount", "RemainingAmount", "remainingAmount", "RemainingAmount") ?? undefined),
    paymentStatus: get("paymentStatus", "PaymentStatus") ?? undefined,
    status: String(get("status", "Status") ?? "PENDING"),
    specialRequests: get("specialRequests", "SpecialRequests"),
    contactPhone: get("contactPhone", "ContactPhone"),
    createdAt: get("createdAt", "CreatedAt"),
  };
};

export const groupBookingService = {
  /**
   * Tìm kiếm các homestay khác cùng địa điểm/tỉnh để book thêm
   * Dùng khi một homestay không đủ chỗ cho nhóm
   */
  async searchCombination(
    params: SearchCombinationRequest,
  ): Promise<SearchCombinationResponse> {
    try {
      const response = await apiService.post<SearchCombinationResponse>(
        apiConfig.endpoints.groupBooking.searchCombination,
        params,
      );
      return normalizeSearchResponse(response);
    } catch (error) {
      console.error("Search combination error:", error);
      throw error;
    }
  },

  /**
   * Tính toán giá cho group booking
   * Sử dụng trước khi tạo booking để show tổng giá cho khách
   */
  async calculateGroupBooking(
    data: CalculateGroupBookingRequest,
  ): Promise<GroupBookingCalculation> {
    try {
      const response = await apiService.post<GroupBookingCalculation>(
        apiConfig.endpoints.groupBooking.calculate,
        data,
      );
      return normalizeGroupBookingCalculation(response);
    } catch (error) {
      console.error("Calculate group booking error:", error);
      throw error;
    }
  },

  /**
   * Tạo group booking mới (book nhiều homestay cùng lúc)
   */
  async createGroupBooking(
    data: CreateGroupBookingRequest,
  ): Promise<{ success: boolean; message: string; data?: GroupBooking }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.groupBooking.create,
        data,
      );
      const groupBookingData = response?.data ?? null;

      return {
        success: response?.success ?? true,
        message: response?.message ?? "Group booking created successfully",
        data: groupBookingData ? mapGroupBooking(groupBookingData) : undefined,
      };
    } catch (error) {
      console.error("Create group booking error:", error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết group booking
   */
  async getGroupBookingDetail(id: string): Promise<GroupBooking | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.groupBooking.detail(id),
      );
      const raw = response?.data ?? response;
      if (!raw) return null;

      if (raw?.success && raw?.data) {
        const booking = mapGroupBooking(raw.data);
        return booking.id ? booking : null;
      }

      const booking = mapGroupBooking(raw);
      return booking.id ? booking : null;
    } catch (error) {
      console.error("Get group booking detail error:", error);
      return null;
    }
  },

  /**
   * Hủy group booking
   */
  async cancelGroupBooking(
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.groupBooking.cancel(id),
        { reason },
      );

      return {
        success: response?.success ?? true,
        message: response?.message ?? "Group booking cancelled successfully",
      };
    } catch (error) {
      console.error("Cancel group booking error:", error);
      throw error;
    }
  },
};
