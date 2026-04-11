import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export interface Invoice {
  id: string;
  bookingId: string;
  bookingCode?: string;
  homestayName?: string;
  customerName?: string;
  checkIn: string;
  checkOut: string;
  totalNights?: number;
  guestsCount?: number;
  unitPrice?: number;
  subtotal?: number;
  discountAmount?: number;
  tax?: number;
  totalAmount: number;
  paymentStatus?: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
}

export const invoiceService = {
  /** GET /api/invoice/booking/{bookingId} — lấy chi tiết hóa đơn */
  async getInvoice(bookingId: string): Promise<Invoice | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.invoices.detail(bookingId),
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        id: data.id ?? "",
        bookingId: data.bookingId ?? bookingId,
        bookingCode: data.bookingCode ?? "",
        homestayName: data.homestayName ?? "",
        customerName: data.customerName ?? "",
        checkIn: data.checkIn ?? "",
        checkOut: data.checkOut ?? "",
        totalNights: data.totalNights ?? 0,
        guestsCount: data.guestsCount ?? 0,
        unitPrice: data.unitPrice ?? 0,
        subtotal: data.subtotal ?? 0,
        discountAmount: data.discountAmount ?? 0,
        tax: data.tax ?? 0,
        totalAmount: data.totalAmount ?? 0,
        paymentStatus: data.paymentStatus ?? "",
        invoiceDate: data.invoiceDate ?? "",
        dueDate: data.dueDate ?? "",
        notes: data.notes ?? "",
      };
    } catch (error) {
      console.error("Get invoice error:", error);
      return null;
    }
  },

  /** GET /api/invoice/booking/{bookingId}/download — tải PDF hóa đơn */
  async downloadInvoice(bookingId: string): Promise<Blob | null> {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const response = await fetch(
        `${apiConfig.baseURL}${apiConfig.endpoints.invoices.download(bookingId)}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        console.error("Download failed:", response.status);
        return null;
      }

      return await response.blob();
    } catch (error) {
      console.error("Download invoice error:", error);
      return null;
    }
  },

  /** POST /api/invoice/booking/{bookingId}/send-email — gửi hóa đơn qua email */
  async sendInvoiceEmail(
    bookingId: string,
    _recipientEmail?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.invoices.sendEmail(bookingId),
        {},
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Gửi hóa đơn thành công!",
      };
    } catch (error) {
      console.error("Send invoice email error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Lỗi khi gửi hóa đơn",
      };
    }
  },

  /** POST /api/invoice/staff/invoices/{bookingId}/add-charge — AddExtraChargeRequestDTO */
  async staffAddExtraCharge(
    bookingId: string,
    payload: { description: string; amount: number },
  ): Promise<any> {
    return apiService.post<any>(
      apiConfig.endpoints.invoices.staffAddCharge(bookingId),
      payload,
    );
  },

  /** GET /api/invoice/admin/all */
  async getAllInvoicesAdmin(): Promise<any> {
    return apiService.get<any>(apiConfig.endpoints.invoices.adminAll);
  },

  /** GET /api/invoice/admin/export — Excel */
  async exportInvoicesAdminExcel(): Promise<Blob | null> {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const response = await fetch(
        `${apiConfig.baseURL}${apiConfig.endpoints.invoices.adminExport}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      if (!response.ok) return null;
      return await response.blob();
    } catch (e) {
      console.error("exportInvoicesAdminExcel error:", e);
      return null;
    }
  },
};
