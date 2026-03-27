// BE flow: pending -> confirmed -> completed; keep checked_in/checked_out for backward compatibility.
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'checked_in' | 'checked_out' | 'cancelled';

// Matches BE PaymentStatus: UNPAID → pending, DEPOSIT_PAID → deposit_paid, FULLY_PAID → paid, REFUNDED → refunded
export type PaymentStatus = 'pending' | 'deposit_paid' | 'paid' | 'refunded';

export interface Booking {
  id: string;
  bookingCode: string;
  homestayId?: string;
  homestayName: string;
  homestayImage?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfNights: number;
  totalPrice: number;
  pricePerNight: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  specialRequests?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
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
