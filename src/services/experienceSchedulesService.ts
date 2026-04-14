import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface ExperienceSchedule {
  id: string;
  experienceId: string;
  experience?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  price?: number;
  status?: string;
  location?: string;
  description?: string;
}

export interface BulkScheduleRequest {
  experienceId: string;
  schedules: Array<{
    date: string;
    startTime?: string;
    endTime?: string;
    maxParticipants?: number;
    price?: number;
  }>;
}

export interface ScheduleParticipant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  joinedAt?: string;
}

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
          experienceId: data.experienceId,
          schedules: data.schedules,
        },
      );
      const items = response?.data ?? response;
      const list = Array.isArray(items) ? items : [];
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Tạo lịch trình thành công!",
        data: list.map((item: any) => ({
          id: item.id ?? "",
          experienceId: item.experienceId ?? data.experienceId,
          experience: item.experience ?? "",
          date: item.date ?? "",
          startTime: item.startTime ?? "",
          endTime: item.endTime ?? "",
          maxParticipants: item.maxParticipants ?? 0,
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
