export type CustomerStatus = 'active' | 'inactive' | 'vip' | 'blocked';
export type CustomerType = 'domestic' | 'international';

export interface CustomerPreferences {
  roomType?: string;
  specialRequests?: string[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  type: CustomerType;
  avatar?: string;
  city?: string;
  country?: string;
  nationality?: string;
  address?: string;
  dateOfBirth?: string;
  identityNumber?: string;
  passportNumber?: string;
  notes?: string;
  preferences?: CustomerPreferences;
  totalBookings: number;
  totalSpent: number;
  loyaltyPoints: number;
  registeredDate: string;
  lastBookingDate?: string;
}

export interface CustomerBookingHistory {
  id: string;
  bookingCode: string;
  homestayName: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  blocked: number;
  domestic: number;
  international: number;
  totalRevenue: number;
  averageSpending: number;
  totalLoyaltyPoints: number;
}

export interface UpdateCustomerDTO {
  name?: string;
  email?: string;
  phone?: string;
  status?: CustomerStatus;
}
