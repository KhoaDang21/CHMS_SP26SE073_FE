import { apiService } from './apiService';

// BE: POST /api/payment/create-link (controller route: api/[controller] = api/payment)
// Request: { BookingId: Guid, CancelUrl: string, ReturnUrl: string }
// Response: ApiResponse<object> { data: { checkoutUrl: string } }

export interface CreatePaymentLinkRequest {
  bookingId: string;
  cancelUrl: string;
  returnUrl: string;
}

export interface CreatePaymentLinkResponse {
  checkoutUrl: string;
}

// BE: PaymentResponseDTO
export interface Payment {
  id: string;
  bookingId: string;
  transactionId: string;
  method: string;
  amount: number;
  status: string;
  gatewayResponse?: string;
  createdAt: string;
  paidAt?: string;
}

export const paymentService = {
  /** POST /api/payment/create-link */
  async createLink(payload: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse> {
    const res = await apiService.post<any>('/api/payment/create-link', {
      BookingId: payload.bookingId,
      CancelUrl: payload.cancelUrl,
      ReturnUrl: payload.returnUrl,
    });
    // BE: ApiResponse<object>.SuccessResult(data: new { checkoutUrl })
    const checkoutUrl = res?.data?.checkoutUrl ?? res?.checkoutUrl ?? '';
    if (!checkoutUrl) throw new Error('Không lấy được link thanh toán từ server');
    return { checkoutUrl };
  },

  /** GET /api/payment/:id — lấy chi tiết payment */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const res = await apiService.get<any>(`/api/payment/${paymentId}`);
      const raw = res?.data ?? res;
      if (!raw?.id) return null;
      return {
        id: raw.id,
        bookingId: raw.bookingId,
        transactionId: raw.transactionId,
        method: raw.method,
        amount: raw.amount,
        status: raw.status,
        gatewayResponse: raw.gatewayResponse,
        createdAt: raw.createdAt,
        paidAt: raw.paidAt,
      };
    } catch (error) {
      console.error('Get payment by id error:', error);
      return null;
    }
  },

  /** GET /api/payment/history — lịch sử thanh toán */
  async getPaymentHistory(): Promise<Payment[]> {
    try {
      const res = await apiService.get<any>('/api/payment/history');
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(raw => ({
        id: raw.id,
        bookingId: raw.bookingId,
        transactionId: raw.transactionId,
        method: raw.method,
        amount: raw.amount,
        status: raw.status,
        gatewayResponse: raw.gatewayResponse,
        createdAt: raw.createdAt,
        paidAt: raw.paidAt,
      }));
    } catch (error) {
      console.error('Get payment history error:', error);
      return [];
    }
  },
};
