import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface ExperienceSchedule {
  id: string;
  localExperienceId: string;
  localExperienceName?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  maxParticipants?: number;
  maxQuantity?: number;
  currentParticipants?: number;
  price?: number;
  status?: string;
  location?: string;
  description?: string;
}

export interface BulkScheduleRequest {
  localExperienceId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  maxQuantity: number;
}

export interface ScheduleParticipant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  joinedAt?: string;
}

const normalizeTime = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return trimmed;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
};

export const experienceSchedulesService = {
  /** POST /api/localexperienceschedule/bulk-create — tạo lịch trình hàng loạt */
  async bulkCreateSchedules(
    data: BulkScheduleRequest,
  ): Promise<{
    success: boolean;
    message: string;
    data?: ExperienceSchedule[];
  }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.experienceSchedules.bulkCreate,
        {
          localExperienceId: data.localExperienceId,
          startDate: data.startDate,
          endDate: data.endDate,
          daysOfWeek: data.daysOfWeek,
          startTime: normalizeTime(data.startTime),
          endTime: normalizeTime(data.endTime),
          maxQuantity: data.maxQuantity,
        },
      );
      const items = response?.data ?? response;
      const list = Array.isArray(items)
        ? items
        : Array.isArray(items?.items)
          ? items.items
          : Array.isArray(items?.Items)
            ? items.Items
            : [];
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Tạo lịch trình thành công!",
        data: list.map((item: any) => ({
          id: item.id ?? "",
          localExperienceId: item.localExperienceId ?? item.experienceId ?? data.localExperienceId,
          localExperienceName: item.localExperienceName ?? item.experience ?? "",
          date: item.date ?? item.scheduleDate ?? "",
          startDate: item.startDate ?? data.startDate,
          endDate: item.endDate ?? data.endDate,
          startTime: item.startTime ?? "",
          endTime: item.endTime ?? "",
          daysOfWeek: Array.isArray(item.daysOfWeek) ? item.daysOfWeek : data.daysOfWeek,
          maxParticipants: item.maxParticipants ?? 0,
          maxQuantity: item.maxQuantity ?? item.maxParticipants ?? data.maxQuantity,
          currentParticipants: item.currentParticipants ?? 0,
          price: item.price ?? 0,
          status: item.status ?? "ACTIVE",
          location: item.location ?? "",
          description: item.description ?? "",
        })),
      };
    } catch (error) {
      console.error("Bulk create schedules error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi tạo lịch trình",
      };
    }
  },

  /** GET /api/localexperienceschedule/{scheduleId}/participants — danh sách người tham gia */
  async getScheduleParticipants(
    scheduleId: string,
  ): Promise<ScheduleParticipant[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.experienceSchedules.participants(scheduleId),
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        name: item.name ?? item.fullName ?? "",
        email: item.email ?? "",
        phone: item.phone ?? "",
        status: item.status ?? "CONFIRMED",
        joinedAt: item.joinedAt ?? item.createdAt ?? "",
      }));
    } catch (error) {
      console.error("Get schedule participants error:", error);
      return [];
    }
  },
};
