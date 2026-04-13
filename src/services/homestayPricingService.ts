import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type {
  BasePrice,
  BulkBasePriceUpdateRequest,
  BulkPricingUpdateLegacy,
  PricingOverviewResponse,
  SeasonalPricing,
  SeasonalPricingCreateRequest,
  SeasonalPricingUpdateRequest,
  ServiceResult,
} from "../types/pricing.types";

const mapBasePrice = (raw: any): BasePrice => ({
  pricePerNight: Number(raw?.pricePerNight ?? raw?.price ?? 0),
  minStay: raw?.minStay,
  maxGuests: raw?.maxGuests,
});

const mapSeasonalPricing = (item: any): SeasonalPricing => ({
  id: item?.id ?? "",
  name: item?.name ?? item?.description ?? "",
  startDate: item?.startDate ?? "",
  endDate: item?.endDate ?? "",
  price: Number(item?.price ?? item?.pricePerNight ?? 0),
  pricePerNight: Number(item?.pricePerNight ?? item?.price ?? 0),
  description: item?.description ?? item?.name ?? "",
  status: item?.status ?? "ACTIVE",
});

const extractSeasonalPrices = (payload: any): SeasonalPricing[] => {
  const rawList = Array.isArray(payload?.seasonalPrices)
    ? payload.seasonalPrices
    : Array.isArray(payload?.seasonalPricings)
      ? payload.seasonalPricings
      : Array.isArray(payload)
        ? payload
        : [];

  return rawList.map(mapSeasonalPricing);
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message?.trim()) {
    return error.message;
  }
  return fallback;
};

export type BulkPricingUpdate = BulkPricingUpdateLegacy;

export type {
  BasePrice,
  BulkBasePriceUpdateRequest,
  PricingOverviewResponse,
  SeasonalPricing,
  SeasonalPricingCreateRequest,
  SeasonalPricingUpdateRequest,
};

export const homestayPricingService = {
  /** GET /api/admin/homestays/{homestayId}/pricing — lấy overview (base + seasonal) */
  async getPricingOverview(
    homestayId: string,
  ): Promise<PricingOverviewResponse | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.homestayPricing.get(homestayId),
      );
      const payload = response?.data ?? response;
      if (!payload) return null;

      const baseCandidate =
        payload?.basePrice ?? payload?.basePricing ?? payload?.base ?? payload;

      return {
        basePrice: mapBasePrice(baseCandidate),
        seasonalPrices: extractSeasonalPrices(payload),
      };
    } catch (error) {
      console.error("Get pricing overview error:", error);
      return null;
    }
  },

  /** Backward-compatible wrapper: chỉ lấy base price từ API overview */
  async getBasePrice(homestayId: string): Promise<BasePrice | null> {
    const overview = await this.getPricingOverview(homestayId);
    return overview?.basePrice ?? null;
  },

  /** PUT /api/admin/homestays/{homestayId}/pricing — cập nhật giá cơ bản */
  async updateBasePrice(
    homestayId: string,
    data: BasePrice,
  ): Promise<ServiceResult> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.homestayPricing.update(homestayId),
        {
          pricePerNight: data.pricePerNight,
          minStay: data.minStay,
          maxGuests: data.maxGuests,
        },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật giá thành công!",
      };
    } catch (error) {
      console.error("Update base price error:", error);
      return {
        success: false,
        message: getErrorMessage(error, "Lỗi khi cập nhật giá"),
      };
    }
  },

  /**
   * POST /api/admin/pricing/bulk-update — cập nhật giá hàng loạt
   * Preferred payload: { homestayIds: string[], newBasePrice: number }
   * Legacy payload is still accepted for compatibility.
   */
  async bulkUpdatePricing(
    request: BulkBasePriceUpdateRequest | BulkPricingUpdateLegacy[],
  ): Promise<ServiceResult> {
    try {
      const payload = Array.isArray(request)
        ? {
            homestayIds: request.map((item) => item.homestayId).filter(Boolean),
            newBasePrice: Number(request[0]?.pricePerNight ?? 0),
          }
        : {
            homestayIds: request.homestayIds,
            newBasePrice: Number(request.newBasePrice),
          };

      const response = await apiService.post<any>(
        apiConfig.endpoints.homestayPricing.bulkUpdate,
        payload,
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật giá hàng loạt thành công!",
      };
    } catch (error) {
      console.error("Bulk update pricing error:", error);
      return {
        success: false,
        message: getErrorMessage(error, "Lỗi khi cập nhật giá hàng loạt"),
      };
    }
  },

  /** GET /api/admin/homestays/{homestayId}/seasonal-pricing — danh sách giá theo mùa */
  async getSeasonalPricings(homestayId: string): Promise<SeasonalPricing[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.homestayPricing.getSeasonalPricing(homestayId),
      );
      const payload = response?.data ?? response;
      return extractSeasonalPrices(payload);
    } catch (error) {
      console.error("Get seasonal pricings error:", error);
      return [];
    }
  },

  /** POST /api/admin/homestays/{homestayId}/seasonal-pricing — thêm giá theo mùa */
  async createSeasonalPricing(
    homestayId: string,
    data: SeasonalPricingCreateRequest,
  ): Promise<ServiceResult<SeasonalPricing>> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.homestayPricing.createSeasonalPricing(homestayId),
        {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          price: data.price ?? data.pricePerNight,
        },
      );
      const item = response?.data ?? response;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Thêm giá theo mùa thành công!",
        data: item?.id ? mapSeasonalPricing(item) : undefined,
      };
    } catch (error) {
      console.error("Create seasonal pricing error:", error);
      return {
        success: false,
        message: getErrorMessage(error, "Lỗi khi thêm giá theo mùa"),
      };
    }
  },

  /** PUT /api/admin/homestays/{homestayId}/seasonal-pricing/{priceId} — cập nhật giá theo mùa */
  async updateSeasonalPricing(
    homestayId: string,
    priceId: string,
    data: SeasonalPricingUpdateRequest,
  ): Promise<ServiceResult> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.homestayPricing.updateSeasonalPricing(
          homestayId,
          priceId,
        ),
        {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          price: data.price ?? data.pricePerNight,
        },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật giá theo mùa thành công!",
      };
    } catch (error) {
      console.error("Update seasonal pricing error:", error);
      return {
        success: false,
        message: getErrorMessage(error, "Lỗi khi cập nhật giá theo mùa"),
      };
    }
  },

  /** DELETE /api/admin/homestays/{homestayId}/seasonal-pricing/{priceId} — xóa giá theo mùa */
  async deleteSeasonalPricing(
    homestayId: string,
    priceId: string,
  ): Promise<ServiceResult> {
    try {
      const response = await apiService.delete<any>(
        apiConfig.endpoints.homestayPricing.deleteSeasonalPricing(
          homestayId,
          priceId,
        ),
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Xóa giá theo mùa thành công!",
      };
    } catch (error) {
      console.error("Delete seasonal pricing error:", error);
      return {
        success: false,
        message: getErrorMessage(error, "Lỗi khi xóa giá theo mùa"),
      };
    }
  },
};
