import { apiService } from "./apiService";

// Backend contract: PaymentController exposes POST /api/payment/create-link only.
interface CreatePaymentRequestDTO {
  bookingId: string;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

interface CreatePaymentLinkResponse {
  checkoutUrl: string;
}

export const paymentService = {
  async createLink(payload: CreatePaymentRequestDTO): Promise<CreatePaymentLinkResponse> {
    // Route fixed to match [Route("api/[controller]")] => /api/payment/create-link
    return apiService.post<CreatePaymentLinkResponse>(
      "/api/payment/create-link",
      payload,
    );
  },
};
