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

export interface Homestay {
  id: string;
  name: string;
  description: string;
  address: string;
  city?: string;
  country?: string;
  districtName?: string;
  provinceName?: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  images?: string[];
  imageUrls?: string[];
  amenities?: string[];
  amenityNames?: string[];
  rating?: number;
  reviewCount?: number;
  ownerId?: string;
  ownerName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'MAINTENANCE';
  featured?: boolean;
  cancellationPolicy?: string;
  houseRules?: string;
  createdAt?: string;
  updatedAt?: string;
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
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
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'staff' | 'manager';
  avatar?: string;
  assignedHomestays: number;
  status: 'ACTIVE' | 'INACTIVE';
  joinedDate: string;
}

export interface District {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
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
