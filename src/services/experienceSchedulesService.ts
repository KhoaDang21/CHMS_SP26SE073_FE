import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface ExperienceSchedule {
  id: string;
  experienceId: string;
  experience?: string;
  date: string;
  serviceDate?: string;
  availableDate?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  remainingSlots?: number;
  price?: number;
  status?: string;
  location?: string;
  description?: string;
}

export interface BulkScheduleRequest {
  experienceId: string;
  localExperienceId?: string;
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

export interface ScheduleStepRequest {
  stepOrder: number;
  stepType: string;
  hiddenGemId?: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  checkInRadiusMeters?: number;
  rewardPoints?: number;
  isRequired?: boolean;
}

const normalizeTimeOnly = (value: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;

  // HTML time input trả về HH:mm, nhưng nhiều API .NET TimeOnly cần HH:mm:ss.
  if (/^\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }

  return raw;
};

const unwrapArrayResponse = (input: any, depth = 0): any[] => {
  if (depth > 4 || input === null || input === undefined) return [];
  if (Array.isArray(input)) return input;

  if (typeof input !== 'object') return [];

  const directCandidates = [
    input.data,
    input.items,
    input.Items,
    input.result,
    input.Result,
    input.value,
    input.Value,
    input.$values,
  ];

  for (const candidate of directCandidates) {
    const unwrapped = unwrapArrayResponse(candidate, depth + 1);
    if (unwrapped.length > 0) return unwrapped;
  }

  for (const key of Object.keys(input)) {
    const unwrapped = unwrapArrayResponse(input[key], depth + 1);
    if (unwrapped.length > 0) return unwrapped;
  }

  return [];
};

const mapScheduleItem = (item: any, fallbackExperienceId: string): ExperienceSchedule => {
  const startRaw = item?.startTime ?? item?.start_time ?? "";
  const endRaw = item?.endTime ?? item?.end_time ?? "";

  // derive a date string (YYYY-MM-DD) from available fields; prefer explicit date fields, otherwise extract from start/end datetime
  const explicitDate = item?.date ?? item?.serviceDate ?? item?.scheduleDate ?? item?.availableDate ?? "";
  const derivedFromTime = (() => {
    const s = String(startRaw ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const e = String(endRaw ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(e)) return e;
    return "";
  })();

  const dateVal = explicitDate || derivedFromTime || "";

  const maxP = item?.maxParticipants ?? item?.maxQuantity ?? item?.quantity ?? 0;
  const currentP = item?.currentParticipants ?? item?.bookedQuantity ?? item?.registeredQuantity ?? 0;
  const remaining = item?.remainingSlots ?? item?.availableQuantity ?? (typeof maxP === 'number' ? Math.max(maxP - (currentP ?? 0), 0) : undefined);

  return {
    id: item?.id ?? item?.scheduleId ?? item?.localExperienceScheduleId ?? "",
    experienceId: item?.experienceId ?? item?.localExperienceId ?? fallbackExperienceId,
    experience: item?.experience ?? item?.experienceName ?? item?.name ?? "",
    date: dateVal,
    serviceDate: item?.serviceDate ?? explicitDate ?? dateVal,
    availableDate: item?.availableDate ?? explicitDate ?? dateVal,
    startTime: startRaw ?? "",
    endTime: endRaw ?? "",
    maxParticipants: maxP,
    currentParticipants: currentP,
    remainingSlots: remaining,
    price: item?.price ?? 0,
    status: item?.status ?? "ACTIVE",
    location: item?.location ?? "",
    description: item?.description ?? "",
  };
};

export const experienceSchedulesService = {
  /** GET /api/localexperienceschedule/experience/{experienceId} — danh sách lịch theo experience */
  async getSchedulesByExperienceId(
    experienceId: string,
  ): Promise<ExperienceSchedule[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.experienceSchedules.byExperience(experienceId),
      );
      const rawList = unwrapArrayResponse(response);

      return rawList.map((item: any) => mapScheduleItem(item, experienceId));
    } catch (error) {
      console.error("Get schedules by experience error:", error);
      return [];
    }
  },

  /** POST /api/localexperienceschedule/bulk-create — tạo lịch trình hàng loạt */
  async bulkCreateSchedules(
    data: BulkScheduleRequest,
  ): Promise<{
    success: boolean;
    message: string;
    data?: ExperienceSchedule[];
  }> {
    try {
      const payload = {
        localExperienceId: data.localExperienceId ?? data.experienceId,
        startDate: data.startDate,
        endDate: data.endDate,
        daysOfWeek: data.daysOfWeek,
        startTime: normalizeTimeOnly(data.startTime),
        endTime: normalizeTimeOnly(data.endTime),
        maxQuantity: data.maxQuantity,
      };

      let response: any;
      try {
        response = await apiService.post<any>(
          apiConfig.endpoints.experienceSchedules.bulkCreate,
          payload,
        );
      } catch (firstError) {
        // Fallback cho backend bind model theo tên param "request".
        response = await apiService.post<any>(
          apiConfig.endpoints.experienceSchedules.bulkCreate,
          { request: payload },
        );
      }

      const list = unwrapArrayResponse(response);
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Tạo lịch trình thành công!",
        data: list.map((item: any) => mapScheduleItem(item, data.experienceId)),
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

  /** POST /api/manager/local-experience-schedules/{scheduleId}/steps — thêm chi tiết theo ngày */
  async createScheduleStep(
    scheduleId: string,
    data: ScheduleStepRequest,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.managerExperienceSchedules.createStep(scheduleId),
        data,
      );

      return {
        success: response?.success ?? true,
        message: response?.message ?? 'Tạo chi tiết lịch trình thành công',
        data: response?.data ?? response,
      };
    } catch (error) {
      console.error('Create schedule step error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi tạo chi tiết lịch trình',
      };
    }
  },
};
