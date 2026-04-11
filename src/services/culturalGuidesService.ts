import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface CulturalGuide {
  id: string;
  title: string;
  description: string;
  location?: string;
  type?: string;
  author?: string;
  rating?: number;
  views?: number;
  status?: string;
  image?: string;
  createdAt?: string;
}

export interface GuideApproval {
  id: string;
  customerName: string;
  customerEmail: string;
  title: string;
  description: string;
  location: string;
  status: string;
  submittedAt: string;
}

export interface CreateGuideRequest {
  title: string;
  description: string;
  location: string;
  type?: string;
  image?: File;
}

export const culturalGuidesService = {
  /** GET /api/public/cultural-guides — danh sách hướng dẫn công khai */
  async getPublicGuides(
    locationId?: string,
    type?: string,
  ): Promise<CulturalGuide[]> {
    try {
      const params = new URLSearchParams();
      if (locationId) params.append("locationId", locationId);
      if (type) params.append("type", type);

      const response = await apiService.get<any>(
        `${apiConfig.endpoints.culturalGuides.publicList}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        location: item.location ?? "",
        type: item.type ?? "",
        author: item.author ?? item.authorName ?? "",
        rating: item.rating ?? 0,
        views: item.views ?? 0,
        status: item.status ?? "PUBLISHED",
        image: item.image ?? item.imageUrl ?? "",
        createdAt: item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Get public guides error:", error);
      return [];
    }
  },

  /** GET /api/public/cultural-guides/{id} — chi tiết hướng dẫn */
  async getGuideDetail(id: string): Promise<CulturalGuide | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.culturalGuides.publicDetail(id),
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        id: data.id ?? "",
        title: data.title ?? "",
        description: data.description ?? "",
        location: data.location ?? "",
        type: data.type ?? "",
        author: data.author ?? data.authorName ?? "",
        rating: data.rating ?? 0,
        views: data.views ?? 0,
        status: data.status ?? "PUBLISHED",
        image: data.image ?? data.imageUrl ?? "",
        createdAt: data.createdAt ?? "",
      };
    } catch (error) {
      console.error("Get guide detail error:", error);
      return null;
    }
  },

  /** GET /api/public/homestays/{homestayId}/cultural-guides — hướng dẫn cho homestay */
  async getGuidesByHomestay(homestayId: string): Promise<CulturalGuide[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.culturalGuides.publicByHomestay(homestayId),
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        location: item.location ?? "",
        type: item.type ?? "",
        author: item.author ?? item.authorName ?? "",
        rating: item.rating ?? 0,
        views: item.views ?? 0,
        status: item.status ?? "PUBLISHED",
        image: item.image ?? item.imageUrl ?? "",
        createdAt: item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Get homestay guides error:", error);
      return [];
    }
  },

  /** POST /api/customer/cultural-guides — tạo hướng dẫn */
  async createGuide(
    data: CreateGuideRequest,
  ): Promise<{ success: boolean; message: string; data?: CulturalGuide }> {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      if (data.type) formData.append("type", data.type);
      if (data.image) formData.append("image", data.image);

      const response = await apiService.postForm<any>(
        apiConfig.endpoints.culturalGuides.customerCreate,
        formData,
      );
      const item = response?.data ?? response;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Tạo hướng dẫn thành công!",
        data: item?.id
          ? {
              id: item.id ?? "",
              title: item.title ?? "",
              description: item.description ?? "",
              location: item.location ?? "",
              type: item.type ?? "",
              author: item.author ?? "",
              rating: item.rating ?? 0,
              views: item.views ?? 0,
              status: item.status ?? "PENDING",
              image: item.image ?? item.imageUrl ?? "",
              createdAt: item.createdAt ?? "",
            }
          : undefined,
      };
    } catch (error) {
      console.error("Create guide error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi tạo hướng dẫn",
      };
    }
  },

  /** GET /api/customer/cultural-guides/my-guides — hướng dẫn của tôi */
  async getMyGuides(): Promise<CulturalGuide[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.culturalGuides.customerMyGuides,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        location: item.location ?? "",
        type: item.type ?? "",
        author: item.author ?? "",
        rating: item.rating ?? 0,
        views: item.views ?? 0,
        status: item.status ?? "PENDING",
        image: item.image ?? item.imageUrl ?? "",
        createdAt: item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Get my guides error:", error);
      return [];
    }
  },

  // Admin methods
  /** POST /api/admin/cultural-guides — admin tạo hướng dẫn */
  async adminCreateGuide(
    data: CreateGuideRequest,
  ): Promise<{ success: boolean; message: string; data?: CulturalGuide }> {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      if (data.type) formData.append("type", data.type);
      if (data.image) formData.append("image", data.image);

      const response = await apiService.postForm<any>(
        apiConfig.endpoints.culturalGuides.adminCreate,
        formData,
      );
      const item = response?.data ?? response;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Hướng dẫn đã tạo thành công!",
        data: item?.id
          ? {
              id: item.id ?? "",
              title: item.title ?? "",
              description: item.description ?? "",
              location: item.location ?? "",
              type: item.type ?? "",
              author: item.author ?? "",
              rating: item.rating ?? 0,
              views: item.views ?? 0,
              status: item.status ?? "PUBLISHED",
              image: item.image ?? item.imageUrl ?? "",
              createdAt: item.createdAt ?? "",
            }
          : undefined,
      };
    } catch (error) {
      console.error("Admin create guide error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi tạo hướng dẫn",
      };
    }
  },

  /** DELETE /api/admin/cultural-guides/{id} — xóa hướng dẫn */
  async adminDeleteGuide(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete<any>(
        apiConfig.endpoints.culturalGuides.adminDelete(id),
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Xóa hướng dẫn thành công!",
      };
    } catch (error) {
      console.error("Admin delete guide error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi xóa hướng dẫn",
      };
    }
  },

  // Manager methods
  /** GET /api/manager/cultural-guides/pending — danh sách hướng dẫn chờ duyệt */
  async managerGetPendingGuides(): Promise<GuideApproval[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.managerCulturalGuides.pending,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        customerName: item.customerName ?? item.authorName ?? "",
        customerEmail: item.customerEmail ?? item.authorEmail ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        location: item.location ?? "",
        status: item.status ?? "PENDING",
        submittedAt: item.submittedAt ?? item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Get pending guides error:", error);
      return [];
    }
  },

  /** PATCH /api/manager/cultural-guides/{id}/status — duyệt/từ chối hướng dẫn */
  async managerUpdateGuideStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.patch<any>(
        apiConfig.endpoints.managerCulturalGuides.updateStatus(id),
        {
          status,
          reason,
        },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật trạng thái thành công!",
      };
    } catch (error) {
      console.error("Update guide status error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lỗi khi cập nhật trạng thái",
      };
    }
  },
};
