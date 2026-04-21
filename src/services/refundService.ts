import { apiService } from "./apiService";

export interface PendingRefund {
  id: string;
  bookingId: string;
  refundAmount: number;
  refundStatus: "PENDING" | "COMPLETED";
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  createdAt: string;
  refundedAt?: string;
  vietQRUrl?: string;
}

const mapRefund = (raw: any): PendingRefund => ({
  id: raw?.Id ?? raw?.id ?? "",
  bookingId: raw?.BookingId ?? raw?.bookingId ?? "",
  refundAmount: raw?.RefundAmount ?? raw?.refundAmount ?? 0,
  refundStatus: raw?.RefundStatus ?? raw?.refundStatus ?? "PENDING",
  bankName: raw?.BankName ?? raw?.bankName ?? "",
  accountNumber: raw?.AccountNumber ?? raw?.accountNumber ?? "",
  accountHolderName: raw?.AccountHolderName ?? raw?.accountHolderName ?? "",
  createdAt: raw?.CreatedAt ?? raw?.createdAt ?? new Date().toISOString(),
  refundedAt: raw?.RefundedAt ?? raw?.refundedAt ?? undefined,
  vietQRUrl: raw?.VietQRUrl ?? raw?.vietQRUrl ?? "",
});

export const refundService = {
  /** GET /api/admin/cancellation-policies/pending-refunds — chỉ PENDING */
  async getPendingRefunds(): Promise<PendingRefund[]> {
    try {
      const res = await apiService.get<any>("/api/admin/cancellation-policies/pending-refunds");
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map(mapRefund);
    } catch (error) {
      console.error("Get pending refunds error:", error);
      return [];
    }
  },

  /** GET /api/admin/cancellation-policies/all-refunds — tất cả (PENDING + COMPLETED) */
  async getAllRefunds(): Promise<PendingRefund[]> {
    try {
      const res = await apiService.get<any>("/api/admin/cancellation-policies/all-refunds");
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map(mapRefund);
    } catch (error) {
      console.error("Get all refunds error:", error);
      return [];
    }
  },

  /** GET /api/bookings/my-refunds — customer xem refund của mình */
  async getMyRefunds(): Promise<PendingRefund[]> {
    try {
      const res = await apiService.get<any>("/api/bookings/my-refunds");
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map(mapRefund);
    } catch (error) {
      console.error("Get my refunds error:", error);
      return [];
    }
  },

  async getRefundDetail(id: string): Promise<PendingRefund | null> {
    try {
      const res = await apiService.get<any>(`/api/admin/cancellation-policies/refund-detail/${id}`);
      const data = res?.data ?? res;
      return data ? mapRefund(data) : null;
    } catch (error) {
      console.error("Get refund detail error:", error);
      return null;
    }
  },

  async confirmRefund(id: string): Promise<boolean> {
    try {
      const res = await apiService.put<any>(`/api/admin/cancellation-policies/confirm-refund/${id}`, {});
      return res?.success ?? true;
    } catch (error) {
      console.error("Confirm refund error:", error);
      return false;
    }
  },
};
