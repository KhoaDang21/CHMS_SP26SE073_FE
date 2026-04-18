import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

// BE BookingResponseDTO fields (exact match):
// id, homestayId, homestayName, customerId, customerName,
// checkIn, checkOut, totalNights, guestsCount,
// pricePerNight, subTotal, discountAmount, totalPrice,
// status ("PENDING"|"CONFIRMED"|"CANCELLED"|"COMPLETED"|"REJECTED"),
// specialRequests, contactPhone, createdAt

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "REJECTED"
  | "CHECKED_IN";
export type PaymentStatus = "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  homestayImage?: string;
  customerId?: string;
  customerName?: string;
  checkIn: string;
  checkOut: string;
  totalNights?: number;
  guestsCount: number;
  pricePerNight?: number;
  subTotal?: number;
  discountAmount?: number;
  totalPrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number; // Deposit percentage from homestay (e.g., 50 for 50%)
  paymentStatus?: PaymentStatus;
  status: BookingStatus;
  specialRequests?: string;
  contactPhone?: string;
  createdAt?: string;
}

export interface CreateBookingRequest {
  homestayId: string;
  checkIn: string; // "YYYY-MM-DD"
  checkOut: string; // "YYYY-MM-DD"
  guestsCount: number;
  specialRequests?: string;
  contactPhone?: string;
  promotionId?: string;
}

export interface CalculateBookingRequest {
  homestayId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  promotionId?: string;
}

export interface ModifyBookingRequest {
  homestayId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  promotionId?: string;
  contactPhone?: string;
}

export interface CancellationPolicyResponse {
  policy?: string;
  [key: string]: any;
}

// Normalize status về uppercase chuẩn BE
const normalizeStatus = (raw: any): BookingStatus => {
  const v = String(raw || "").toUpperCase();
  if (v === "CONFIRMED") return "CONFIRMED";
  if (v === "CANCELLED") return "CANCELLED";
  if (v === "COMPLETED") return "COMPLETED";
  if (v === "REJECTED") return "REJECTED";
  if (v === "CHECKED_IN") return "CHECKED_IN";
  return "PENDING";
};

const cleanLoadingText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^loading\.\.\.$/i.test(value.trim())) return undefined;
  return value;
};

const mapBooking = (item: any): Booking => {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  };

  return {
    id: String(get('id', 'Id') ?? ''),
    homestayId: String(get('homestayId', 'HomestayId') ?? ''),
    homestayName: cleanLoadingText(get('homestayName', 'HomestayName')),
    homestayImage: cleanLoadingText(
      get(
        'homestayImage',
        'HomestayImage',
        'homestayImageUrl',
        'HomestayImageUrl',
        'imageUrl',
        'ImageUrl',
      ),
    ),
    customerId: get('customerId', 'CustomerId'),
    customerName: cleanLoadingText(get('customerName', 'CustomerName')),
    checkIn: String(get('checkIn', 'CheckIn') ?? ''),
    checkOut: String(get('checkOut', 'CheckOut') ?? ''),
    totalNights: get('totalNights', 'TotalNights'),
    guestsCount: Number(get('guestsCount', 'GuestsCount') ?? 0),
    pricePerNight: get('pricePerNight', 'PricePerNight'),
    subTotal: get('subTotal', 'SubTotal'),
    discountAmount: get('discountAmount', 'DiscountAmount'),
    totalPrice: get('totalPrice', 'TotalPrice'),
    depositAmount: get('depositAmount', 'DepositAmount'),
    remainingAmount: get('remainingAmount', 'RemainingAmount'),
    depositPercentage: get('depositPercentage', 'DepositPercentage') ?? 20,
    paymentStatus: get('paymentStatus', 'PaymentStatus') ?? undefined,
    status: normalizeStatus(get('status', 'Status')),
    specialRequests: get('specialRequests', 'SpecialRequests') ?? undefined,
    contactPhone: get('contactPhone', 'ContactPhone') ?? undefined,
    createdAt: get('createdAt', 'CreatedAt'),
  };
};

export const bookingService = {
  /** GET /api/bookings — danh sách booking của user */
  async getMyBookings(): Promise<Booking[]> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.list,
      );
      const rawList: any[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      return rawList.map(mapBooking);
    } catch (error) {
      console.error("Get my bookings error:", error);
      return [];
    }
  },

  /** GET /api/bookings/:id — chi tiết booking */
  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.detail(id),
      );
      const raw = response?.data ?? response;
      if (!raw) return null;
      if (raw?.success && raw?.data) {
        const booking = mapBooking(raw.data);
        return booking.id ? booking : null;
      }
      const booking = mapBooking(raw);
      if (!booking.id) return null;
      return booking;
    } catch (error) {
      console.error("Get booking detail error:", error);
      return null;
    }
  },

  /** POST /api/bookings — tạo booking mới */
  async createBooking(
    data: CreateBookingRequest,
  ): Promise<{ success: boolean; message: string; data?: Booking }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.create,
        data,
      );
      // BE: ApiResponse<object>.SuccessResult(bookingResponseDTO, "Đặt phòng thành công!")
      const bookingData = response?.data ?? null;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đặt phòng thành công!",
        data: bookingData ? mapBooking(bookingData) : undefined,
      };
    } catch (error) {
      console.error("Create booking error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi đặt phòng",
      };
    }
  },

  /** POST /api/bookings/:id/cancel — hủy booking */
  async cancelBooking(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.cancel(id),
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã hủy đơn đặt phòng thành công.",
      };
    } catch (error) {
      console.error("Cancel booking error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi hủy booking",
      };
    }
  },

  /** POST /api/bookings/calculate — tính giá trước khi đặt */
  async calculate(data: CalculateBookingRequest): Promise<number | null> {
    try {
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.calculate,
        data,
      );
      // API có thể trả nhiều shape:
      // 1) { success, data: 9000 }
      // 2) { success, data: { totalPrice: 9000 } }
      // 3) trực tiếp number/object
      const candidates = [
        response,
        response?.data,
        response?.data?.data,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "number" && Number.isFinite(candidate)) {
          return candidate;
        }

        if (candidate && typeof candidate === "object") {
          const obj = candidate as Record<string, unknown>;
          const possibleKeys = [
            "totalPrice",
            "finalPrice",
            "price",
            "amount",
            "value",
          ];

          for (const key of possibleKeys) {
            const value = obj[key];
            if (typeof value === "number" && Number.isFinite(value)) {
              return value;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Calculate booking error:", error);
      return null;
    }
  },

  /** PUT /api/bookings/:id/modify — sửa booking (chỉ khi PENDING) */
  async modifyBooking(
    id: string,
    data: ModifyBookingRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.bookings.modify(id),
        data,
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật booking thành công!",
      };
    } catch (error) {
      console.error("Modify booking error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi sửa booking",
      };
    }
  },

  /** GET /api/bookings/:id/cancellation-policy */
  async getCancellationPolicy(
    id: string,
  ): Promise<CancellationPolicyResponse | null> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.bookings.cancellationPolicy(id),
      );
      // BE: ApiResponse<object>.SuccessResult(new { Policy = policy })
      return response?.data ?? response;
    } catch (error) {
      console.error("Get cancellation policy error:", error);
      return null;
    }
  },

  /** POST /api/bookings/:id/special-requests — BE nhận raw string */
  async updateSpecialRequests(
    id: string,
    specialRequests: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // BE: [FromBody] string request — phải gửi raw JSON string
      const response = await apiService.post<any>(
        apiConfig.endpoints.bookings.specialRequests(id),
        specialRequests,
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Đã ghi nhận yêu cầu đặc biệt.",
      };
    } catch (error) {
      console.error("Update special requests error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi cập nhật yêu cầu đặc biệt",
      };
    }
  },

  /** POST /api/bookings/{id}/confirm-cash-payment */
  async confirmCashPayment(
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.post<any>(
      apiConfig.endpoints.bookings.confirmCashPayment(id),
    );
    return {
      success: response?.success ?? true,
      message: response?.message,
    };
  },

  /** PUT /api/bookings/{id}/check-in */
  async checkIn(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.put<any>(
      apiConfig.endpoints.bookings.checkIn(id),
    );
    return {
      success: response?.success ?? true,
      message: response?.message,
    };
  },

  /** PUT /api/bookings/{id}/check-out */
  async checkOut(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiService.put<any>(
      apiConfig.endpoints.bookings.checkOut(id),
    );
    return {
      success: response?.success ?? true,
      message: response?.message,
    };
  },

  /** POST /api/bookings/{id}/experiences — AddBookingExperienceRequestDTO */
  async addExperienceToBooking(
    bookingId: string,
    body: {
      localExperienceScheduleId: string;
      quantity?: number;
      note?: string;
    },
  ): Promise<any> {
    return apiService.post<any>(
      apiConfig.endpoints.bookings.addExperiences(bookingId),
      {
        localExperienceScheduleId: body.localExperienceScheduleId,
        quantity: body.quantity ?? 1,
        note: body.note,
      },
    );
  },

  /** PUT /api/bookings/my-experiences/{experienceBookingId}/cancel */
  async cancelMyExperienceBooking(experienceBookingId: string): Promise<any> {
    return apiService.put<any>(
      apiConfig.endpoints.bookings.cancelMyExperience(experienceBookingId),
    );
  },

  /** PATCH /api/bookings/experiences/{experienceBookingId}/status?status= — Admin */
  async updateExperienceBookingStatus(
    experienceBookingId: string,
    status: string,
  ): Promise<any> {
    const q = new URLSearchParams({ status });
    return apiService.patch<any>(
      `${apiConfig.endpoints.bookings.updateExperienceBookingStatus(experienceBookingId)}?${q.toString()}`,
      {},
    );
  },

  /** GET /api/bookings/homestays/{homestayId}/occupied-dates */
  async getOccupiedDates(homestayId: string): Promise<any> {
    return apiService.get<any>(
      apiConfig.endpoints.bookings.occupiedDates(homestayId),
    );
  },

  /** GET /api/experiencebooking/available-schedules/{bookingId} */
  async getAvailableExperienceSchedules(bookingId: string): Promise<any> {
    return apiService.get<any>(
      apiConfig.endpoints.experienceBooking.availableSchedules(bookingId),
    );
  },
};
