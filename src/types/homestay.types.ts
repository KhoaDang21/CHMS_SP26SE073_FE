// Homestay related types

export interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalBookings: number;
  bookingGrowth: number;
  totalCustomers: number;
  occupancyRate: number;
  pendingBookings: number;
  totalHomestays: number;
  averageRating: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  bookings: number;
}

export interface HomestayRevenueData {
  homestayName: string;
  totalRevenue: number;
  totalBookings: number;
}

export interface OccupancyData {
  month: string;
  occupancyRate: number;
  totalBookedNights: number;
  totalCapacityNights: number;
}

export interface BookingStatusDetail {
  status: string;
  count: number;
  percentage: number;
}

export interface BookingsReportData {
  totalBookings: number;
  statusDetails: BookingStatusDetail[];
}

export interface Homestay {
  id: string;
  name: string;
  description: string;
  address: string;
  districtId?: string;
  city?: string;
  country?: string;
  districtName?: string;
  provinceName?: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
  imageUrls?: string[];
  amenities?: string[];
  amenityIds?: string[];
  amenityNames?: string[];
  rating?: number;
  reviewCount?: number;
  averageRating?: number;
  totalReviews?: number;
  ownerId?: string;
  ownerName?: string;
  status: "ACTIVE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "INACTIVE";
  featured?: boolean;
  cancellationPolicy?: string;
  houseRules?: string;
  depositPercentage?: number; // % cọc theo cấu hình homestay, mặc định 50 từ BE
  createdAt?: string;
  updatedAt?: string;
  addedAt?: string;
}

export interface Booking {
  id: string;
  homestayId: string;
  homestayName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "refunded";
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  totalBookings: number;
  totalSpent: number;
  joinedDate: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "staff" | "manager";
  avatar?: string;
  assignedHomestays: number;
  status: "ACTIVE" | "INACTIVE";
  joinedDate: string;
}

export interface District {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
}

export interface Province {
  id: string;
  name: string;
}

export interface HomestayImage {
  imageUrl: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface CreateHomestayDTO {
  ownerId: string;
  name: string;
  description: string;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area: number;
  cancellationPolicy: string;
  houseRules: string;
  amenityIds: string[];
  address: string;
  districtId: string;
  latitude: number;
  longitude: number;
  images: HomestayImage[];
}

export interface UpdateHomestayDTO {
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  cancellationPolicy: string;
  houseRules: string;
  districtId: string;
  address: string;
  latitude: number;
  longitude: number;
  amenityIds: string[];
  images: HomestayImage[];
}
