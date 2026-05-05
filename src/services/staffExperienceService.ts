import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface StaffAssignedSchedule {
    scheduleId: string;
    localExperienceId: string;
    localExperienceName: string;
    homestayId: string;
    homestayName: string;
    date: string;
    startTime: string;
    endTime: string;
    currentQuantity: number;
    maxQuantity: number;
    meetingPoint?: string;
    planNote?: string;
    status: string;
    assignedStaffId: string;
    assignedStaffName: string;
}

const mapSchedule = (item: any): StaffAssignedSchedule => ({
    scheduleId: item?.scheduleId ?? item?.id ?? '',
    localExperienceId: item?.localExperienceId ?? '',
    localExperienceName: item?.localExperienceName ?? item?.localExperience ?? '',
    homestayId: item?.homestayId ?? '',
    homestayName: item?.homestayName ?? '',
    date: item?.date ?? '',
    startTime: item?.startTime ?? '',
    endTime: item?.endTime ?? '',
    currentQuantity: item?.currentQuantity ?? 0,
    maxQuantity: item?.maxQuantity ?? 0,
    meetingPoint: item?.meetingPoint ?? undefined,
    planNote: item?.planNote ?? undefined,
    status: item?.status ?? '',
    assignedStaffId: item?.assignedStaffId ?? '',
    assignedStaffName: item?.assignedStaffName ?? '',
});

const unwrap = (res: any): any[] => {
    const raw = res?.data ?? res;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.$values)) return raw.$values;
    return [];
};

export const staffExperienceService = {
    /** GET /api/staff/local-experience-schedules/assigned?date=YYYY-MM-DD */
    async getAssigned(date?: string): Promise<{
        success: boolean;
        data: StaffAssignedSchedule[];
        message?: string;
    }> {
        try {
            const params = date ? { date } : undefined;
            const res = await apiService.get<any>(
                apiConfig.endpoints.staffLocalExperience.assigned,
                params,
            );
            const list = unwrap(res);
            return {
                success: (res as any)?.success ?? true,
                data: list.map(mapSchedule),
                message: (res as any)?.message,
            };
        } catch (error) {
            return {
                success: false,
                data: [],
                message: error instanceof Error ? error.message : 'Không thể tải lịch phân công',
            };
        }
    },

    /** PATCH /api/staff/local-experience-schedules/{scheduleId}/start */
    async startSchedule(scheduleId: string): Promise<{
        success: boolean;
        data?: StaffAssignedSchedule;
        message?: string;
    }> {
        try {
            const res = await apiService.patch<any>(
                apiConfig.endpoints.staffLocalExperience.start(scheduleId),
                {},
            );
            const raw = (res as any)?.data ?? res;
            return {
                success: (res as any)?.success ?? true,
                data: raw ? mapSchedule(raw) : undefined,
                message: (res as any)?.message ?? 'Đã bắt đầu tour',
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Không thể bắt đầu tour',
            };
        }
    },

    /** PATCH /api/staff/local-experience-schedules/{scheduleId}/complete */
    async completeSchedule(scheduleId: string): Promise<{
        success: boolean;
        data?: StaffAssignedSchedule;
        message?: string;
    }> {
        try {
            const res = await apiService.patch<any>(
                apiConfig.endpoints.staffLocalExperience.complete(scheduleId),
                {},
            );
            const raw = (res as any)?.data ?? res;
            return {
                success: (res as any)?.success ?? true,
                data: raw ? mapSchedule(raw) : undefined,
                message: (res as any)?.message ?? 'Đã hoàn thành tour',
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Không thể hoàn thành tour',
            };
        }
    },
};
