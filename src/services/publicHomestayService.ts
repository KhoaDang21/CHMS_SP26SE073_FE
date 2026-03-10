import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";

export interface PagedHomestays {
  Items: Homestay[];
  CurrentPage: number;
  PageSize: number;
  TotalCount: number;
}

export const publicHomestayService = {
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

      return {
        Items: Array.isArray(items) ? items : [],
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
      if (payload) return payload as Homestay;
      return null;
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

      return {
        Items: Array.isArray(items) ? items : [],
        CurrentPage: currentPage,
        PageSize: pageSize,
        TotalCount: totalCount,
      };
    } catch (error) {
      console.error("Error searching homestays:", error);
      return { Items: [], CurrentPage: 1, PageSize: 10, TotalCount: 0 };
    }
  },
};
