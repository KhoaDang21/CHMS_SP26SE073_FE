import { apiConfig } from "../config/apiConfig";
import { apiService } from "./apiService";

export interface ExtraCharge {
  id: string;
  bookingId: string;
  amount: number;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CreateExtraChargeRequest {
  bookingId: string;
  amount: number;
  note: string;
}

export interface UpdatePaymentRequest {
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
}

const extractList = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res as T[];

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data as T[];

  return (data?.items ?? data?.Items ?? data?.extraCharges ?? []) as T[];
};

const toExtraCharge = (item: any): ExtraCharge => ({
  id: String(item?.id ?? ""),
  bookingId: String(item?.bookingId ?? item?.BookingId ?? ""),
  amount: Number(item?.amount ?? item?.Amount ?? 0),
  note:
    item?.description ??
    item?.Description ??
    item?.note ??
    item?.Note ??
    undefined,
  createdAt: item?.createdAt ?? item?.CreatedAt ?? undefined,
  createdBy: item?.createdBy ?? item?.CreatedBy ?? undefined,
});

export const extraChargeService = {
  async create(
    data: CreateExtraChargeRequest,
  ): Promise<{ success: boolean; message: string; data?: ExtraCharge }> {
    try {
      // BE validation requires Description field (C# model), keep note for FE readability.
      const payload = {
        bookingId: data.bookingId,
        amount: data.amount,
        description: data.note,
      };

      const response = await apiService.post<any>(
        apiConfig.endpoints.extraCharges.create,
        payload,
      );
      const responsePayload = response?.data ?? response?.result ?? response;

      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã lưu phí phát sinh",
        data: responsePayload?.id ? responsePayload : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu phí phát sinh",
      };
    }
  },

  async listByBooking(bookingId: string): Promise<ExtraCharge[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.extraCharges.byBooking(bookingId),
      );
      return extractList<any>(response)
        .map(toExtraCharge)
        .filter((item) => Boolean(item.id || item.amount || item.note));
    } catch {
      return [];
    }
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete<any>(
        apiConfig.endpoints.extraCharges.delete(id),
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã xóa phí phát sinh",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể xóa phí phát sinh",
      };
    }
  },

  /** PUT /api/extra-charges/{id}/payment — cập nhật trạng thái thanh toán phí phát sinh */
  async updatePayment(
    id: string,
    data: UpdatePaymentRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.extraCharges.updatePayment(id),
        {
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          notes: data.notes,
        },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã cập nhật trạng thái thanh toán",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật thanh toán",
      };
    }
  },
};
