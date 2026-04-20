import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface CulturalGuide {
  id: string;
  title: string;
  description: string;
  content?: string;
  location?: string;
  locationId?: string;
  homestayId?: string;
  type?: string;
  author?: string;
  rating?: number;
  views?: number;
  status?: string;
  image?: string;
  imageUrls?: string[];
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
  homestayId?: string;
  title: string;
  description?: string;
  content?: string;
  location?: string;
  type?: string;
  image?: File;
  imageFiles?: File[];
}

const splitImageUrls = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  const value = String(raw || '').trim();
  if (!value) return [];

  return value
    .split('|')
    .map((url) => url.trim())
    .filter(Boolean);
};

const mapGuide = (item: any): CulturalGuide => {
  const imageUrls = splitImageUrls(
    item?.imageUrls
      ?? item?.ImageUrls
      ?? item?.imageUrl
      ?? item?.ImageUrl
      ?? item?.image
      ?? item?.Image,
  );

  const content = item?.content ?? item?.Content ?? item?.description ?? item?.Description ?? '';

  return {
    id: item?.id ?? item?.Id ?? '',
    title: item?.title ?? item?.Title ?? '',
    description: content,
    content,
    location: item?.location ?? item?.Location ?? item?.locationName ?? item?.LocationName ?? '',
    locationId: item?.locationId ?? item?.LocationId ?? undefined,
    homestayId: item?.homestayId ?? item?.HomestayId ?? undefined,
    type: item?.type ?? item?.Type ?? '',
    author: item?.author ?? item?.authorName ?? item?.customerName ?? item?.AuthorName ?? '',
    rating: Number(item?.rating ?? item?.Rating ?? 0),
    views: Number(item?.views ?? item?.Views ?? 0),
    status: item?.status ?? item?.Status ?? 'PUBLISHED',
    image: imageUrls[0] ?? '',
    imageUrls,
    createdAt: item?.createdAt ?? item?.CreatedAt ?? item?.submittedAt ?? item?.SubmittedAt ?? '',
  };
};

const unwrapList = (response: any): any[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const unwrapItem = (response: any): any => {
  return response?.data ?? response?.result ?? response ?? null;
};

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
      const rawList = unwrapList(response);

      return rawList.map(mapGuide);
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
      const data = unwrapItem(response);
      if (!data) return null;

      return mapGuide(data);
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
      const rawList = unwrapList(response);

      return rawList.map(mapGuide);
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
      if (data.homestayId) formData.append("homestayId", data.homestayId);
      formData.append("title", data.title);
      formData.append("content", data.content ?? data.description ?? "");
      if (data.type) formData.append("type", data.type);
      if (data.imageFiles?.length) {
        data.imageFiles.forEach((file) => formData.append("imageFiles", file));
      } else if (data.image) {
        formData.append("imageFiles", data.image);
      }

      const response = await apiService.postForm<any>(
        apiConfig.endpoints.culturalGuides.customerCreate,
        formData,
      );
      const item = unwrapItem(response);
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Tạo hướng dẫn thành công!",
        data: item?.id ? mapGuide(item) : undefined,
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
      const rawList = unwrapList(response);

      return rawList.map(mapGuide);
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
      if (data.homestayId) formData.append("homestayId", data.homestayId);
      formData.append("title", data.title);
      formData.append("content", data.content ?? data.description ?? "");
      if (data.type) formData.append("type", data.type);
      if (data.imageFiles?.length) {
        data.imageFiles.forEach((file) => formData.append("imageFiles", file));
      } else if (data.image) {
        formData.append("imageFiles", data.image);
      }

      const response = await apiService.postForm<any>(
        apiConfig.endpoints.culturalGuides.adminCreate,
        formData,
      );
      const item = unwrapItem(response);
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Hướng dẫn đã tạo thành công!",
        data: item?.id ? mapGuide(item) : undefined,
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
          rejectReason: reason,
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
