// BE flow: pending -> confirmed -> completed; keep checked_in/checked_out for backward compatibility.
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

// Matches BE PaymentStatus: UNPAID → pending, DEPOSIT_PAID → deposit_paid, FULLY_PAID → paid, REFUNDED → refunded
export type PaymentStatus = "pending" | "deposit_paid" | "paid" | "refunded";

export interface ExtraCharge {
  id: string;
  bookingId: string;
  amount: number;
  description?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface BookedExperience {
  id: string;
  experienceName: string;
  imageUrl?: string;
  serviceDate: string;
  startTime?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  note?: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  homestayId?: string;
  homestayName: string;
  homestayImage?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfNights: number;
  pricePerNight: number;
  subTotal?: number; // Total before discount
  discountAmount?: number; // Applied discount
  totalPrice: number; // Final price
  depositAmount?: number; // Amount of deposit payment
  remainingAmount?: number; // Remaining balance after deposit
  depositPercentage?: number; // Deposit percentage (e.g., 50 for 50%)
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  specialRequests?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  extraCharges?: ExtraCharge[];
  bookedExperiences?: BookedExperience[];
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  totalRevenue: number;
  averageBookingValue: number;
}

export interface UpdateBookingDTO {
  status: BookingStatus;
  cancellationReason?: string;
}
