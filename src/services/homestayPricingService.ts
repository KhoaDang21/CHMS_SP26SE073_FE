import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface BasePrice {
  pricePerNight: number;
  minStay?: number;
  maxGuests?: number;
}

export interface SeasonalPricing {
  id: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  description?: string;
  status?: string;
}

export interface BulkPricingUpdate {
  homestayId: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
}

export const homestayPricingService = {
  /** GET /api/admin/homestays/{homestayId}/pricing — lấy giá cơ bản */
  async getBasePrice(homestayId: string): Promise<BasePrice | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.homestayPricing.get(homestayId),
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        pricePerNight: data.pricePerNight ?? data.price ?? 0,
        minStay: data.minStay ?? 1,
        maxGuests: data.maxGuests ?? 10,
      };
    } catch (error) {
      console.error("Get base price error:", error);
      return null;
    }
  },

  /** PUT /api/admin/homestays/{homestayId}/pricing — cập nhật giá cơ bản */
  async updateBasePrice(
    homestayId: string,
    data: BasePrice,
  ): Promise<{ success: boolean; message: string }> {
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
        message:
          error instanceof Error ? error.message : "Lỗi khi cập nhật giá",
      };
    }
  },

  /** POST /api/admin/pricing/bulk-update — cập nhật giá hàng loạt */
  async bulkUpdatePricing(
    updates: BulkPricingUpdate[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.homestayPricing.bulkUpdate,
        { pricings: updates },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật giá hàng loạt thành công!",
      };
    } catch (error) {
      console.error("Bulk update pricing error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lỗi khi cập nhật giá hàng loạt",
      };
    }
  },

  /** GET /api/admin/homestays/{homestayId}/seasonal-pricing — danh sách giá theo mùa */
  async getSeasonalPricings(homestayId: string): Promise<SeasonalPricing[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.homestayPricing.getSeasonalPricing(homestayId),
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        pricePerNight: item.pricePerNight ?? item.price ?? 0,
        description: item.description ?? item.name ?? "",
        status: item.status ?? "ACTIVE",
      }));
    } catch (error) {
      console.error("Get seasonal pricings error:", error);
      return [];
    }
  },

  /** POST /api/admin/homestays/{homestayId}/seasonal-pricing — thêm giá theo mùa */
  async createSeasonalPricing(
    homestayId: string,
    data: Omit<SeasonalPricing, "id">,
  ): Promise<{ success: boolean; message: string; data?: SeasonalPricing }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.homestayPricing.createSeasonalPricing(homestayId),
        {
          startDate: data.startDate,
          endDate: data.endDate,
          pricePerNight: data.pricePerNight,
          description: data.description,
          status: data.status ?? "ACTIVE",
        },
      );
      const item = response?.data ?? response;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Thêm giá theo mùa thành công!",
        data: item?.id
          ? {
              id: item.id ?? "",
              startDate: item.startDate ?? "",
              endDate: item.endDate ?? "",
              pricePerNight: item.pricePerNight ?? 0,
              description: item.description ?? "",
              status: item.status ?? "ACTIVE",
            }
          : undefined,
      };
    } catch (error) {
      console.error("Create seasonal pricing error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi thêm giá theo mùa",
      };
    }
  },

  /** PUT /api/admin/homestays/{homestayId}/seasonal-pricing/{priceId} — cập nhật giá theo mùa */
  async updateSeasonalPricing(
    homestayId: string,
    priceId: string,
    data: Partial<SeasonalPricing>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.homestayPricing.updateSeasonalPricing(
          homestayId,
          priceId,
        ),
        {
          startDate: data.startDate,
          endDate: data.endDate,
          pricePerNight: data.pricePerNight,
          description: data.description,
          status: data.status,
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
        message:
          error instanceof Error
            ? error.message
            : "Lỗi khi cập nhật giá theo mùa",
      };
    }
  },

  /** DELETE /api/admin/homestays/{homestayId}/seasonal-pricing/{priceId} — xóa giá theo mùa */
  async deleteSeasonalPricing(
    homestayId: string,
    priceId: string,
  ): Promise<{ success: boolean; message: string }> {
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
        message:
          error instanceof Error ? error.message : "Lỗi khi xóa giá theo mùa",
      };
    }
  },
};
