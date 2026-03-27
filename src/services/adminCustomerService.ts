import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type {
  Customer,
  CustomerBookingHistory,
  CustomerStats,
  CustomerStatus,
  CustomerType,
  UpdateCustomerDTO,
} from '../types/customer.types';

const extractList = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res as T[];

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data as T[];

  return (data?.items ?? data?.Items ?? data?.customers ?? data?.bookings ?? []) as T[];
};

const toISO = (value: any): string => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeStatus = (value: any): CustomerStatus => {
  const raw = String(value || '').toLowerCase();
  if (raw === 'vip') return 'vip';
  if (raw === 'blocked' || raw === 'suspended' || raw === 'disabled' || raw === 'banned') return 'blocked';
  if (raw === 'inactive') return 'inactive';
  return 'active';
};

const normalizeType = (value: any, country?: string): CustomerType => {
  const raw = String(value || '').toLowerCase();
  if (raw === 'international') return 'international';
  if (raw === 'domestic') return 'domestic';

  const countryRaw = String(country || '').toLowerCase();
  if (!countryRaw || countryRaw.includes('việt') || countryRaw.includes('vietnam')) return 'domestic';
  return 'international';
};

const toOptionalText = (value: any): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text || text === '-' || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') {
    return undefined;
  }
  return text;
};

const toNumber = (value: any): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapCustomer = (item: any): Customer => {
  const country = toOptionalText(item?.country || item?.countryName) || 'Việt Nam';
  const city = toOptionalText(item?.city || item?.province || item?.district);
  const nationality = toOptionalText(item?.nationality) || country;
  const status = normalizeStatus(item?.status ?? (item?.isActive === false ? 'inactive' : 'active'));

  const rawBookingsList = Array.isArray(item?.bookings)
    ? item.bookings
    : Array.isArray(item?.bookingHistory)
      ? item.bookingHistory
      : [];

  const totalBookings = toNumber(
    item?.totalBookings ??
      item?.bookingCount ??
      item?.bookingsCount ??
      item?.totalBooking ??
      item?.orderCount ??
      item?.reservationCount ??
      rawBookingsList.length ??
      0,
  );

  const computedSpentFromBookings = rawBookingsList.reduce(
    (sum: number, booking: any) => sum + toNumber(booking?.totalPrice ?? booking?.amount ?? booking?.totalAmount),
    0,
  );

  const totalSpent = toNumber(
    item?.totalSpent ??
      item?.spentAmount ??
      item?.totalAmount ??
      item?.totalSpending ??
      item?.totalPayment ??
      item?.spending ??
      item?.totalPaid ??
      computedSpentFromBookings ??
      0,
  );

  return {
    id: String(item?.id || ''),
    name: String(item?.fullName || 'Khách hàng'),
    email: String(item?.email || ''),
    phone: String(item?.phone || ''),
    status,
    type: normalizeType(item?.type, country),
    avatar: item?.avatar || item?.avatarUrl,
    city,
    country,
    nationality,
    address: toOptionalText(item?.address),
    dateOfBirth: item?.dateOfBirth,
    identityNumber: item?.identityNumber || item?.identityNo || item?.nationalId,
    passportNumber: item?.passportNumber,
    notes: item?.notes,
    preferences: item?.preferences,
    totalBookings,
    totalSpent,
    loyaltyPoints: Number(item?.loyaltyPoints ?? Math.floor(totalSpent / 1000000)),
    registeredDate: toISO(item?.registeredDate || item?.createdAt),
    lastBookingDate: item?.lastBookingDate ? toISO(item.lastBookingDate) : undefined,
  };
};

const normalizeBookingStatus = (value: any): CustomerBookingHistory['status'] => {
  const raw = String(value || '').toUpperCase();
  if (raw === 'CONFIRMED') return 'confirmed';
  if (raw === 'CHECKED_IN' || raw === 'CHECKEDIN' || raw === 'IN_PROGRESS') return 'checked_in';
  if (raw === 'COMPLETED') return 'completed';
  if (raw === 'CHECKED_OUT' || raw === 'CHECKEDOUT') return 'checked_out';
  if (raw === 'CANCELLED' || raw === 'REJECTED') return 'cancelled';
  return 'pending';
};

const mapCustomerBooking = (item: any): CustomerBookingHistory => {
  const id = String(item?.bookingId || item?.id || '');
  return {
    id,
    bookingCode: String(item?.bookingCode || item?.code || item?.bookingId || (id ? id.slice(0, 8) : 'N/A')),
    homestayName: String(item?.homestayName || item?.name || item?.propertyName || 'Homestay'),
    checkInDate: toISO(item?.checkInDate || item?.checkIn),
    checkOutDate: toISO(item?.checkOutDate || item?.checkOut),
    totalPrice: Number(item?.totalPrice ?? item?.amount ?? 0),
    status: normalizeBookingStatus(item?.status),
    createdAt: item?.createdAt ? toISO(item.createdAt) : undefined,
  };
};

const toBackendStatus = (status: CustomerStatus): string => {
  if (status === 'vip') return 'VIP';
  if (status === 'blocked') return 'BLOCKED';
  if (status === 'inactive') return 'INACTIVE';
  return 'ACTIVE';
};

export const adminCustomerService = {
  async getAllCustomers(params?: Record<string, any>): Promise<Customer[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.adminCustomers.list, params);
    return extractList<any>(res).map(mapCustomer).filter((item) => Boolean(item.id));
  },

  async getCustomerStats(): Promise<CustomerStats> {
    const customers = await this.getAllCustomers();
    const total = customers.length;
    const active = customers.filter((x) => x.status === 'active').length;
    const inactive = customers.filter((x) => x.status === 'inactive').length;
    const vip = customers.filter((x) => x.status === 'vip').length;
    const blocked = customers.filter((x) => x.status === 'blocked').length;
    const domestic = customers.filter((x) => x.type === 'domestic').length;
    const international = customers.filter((x) => x.type === 'international').length;
    const totalRevenue = customers.reduce((sum, x) => sum + (Number(x.totalSpent) || 0), 0);
    const totalLoyaltyPoints = customers.reduce((sum, x) => sum + (Number(x.loyaltyPoints) || 0), 0);

    return {
      total,
      active,
      inactive,
      vip,
      blocked,
      domestic,
      international,
      totalRevenue,
      averageSpending: total > 0 ? totalRevenue / total : 0,
      totalLoyaltyPoints,
    };
  },

  async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminCustomers.detail(customerId));
      const payload = res?.data ?? res?.result ?? res;
      if (!payload) return null;
      return mapCustomer(payload);
    } catch {
      return null;
    }
  },

  async getCustomerBookingHistory(customerId: string): Promise<{ bookings: CustomerBookingHistory[] }> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminCustomers.bookings(customerId));
      const bookings = extractList<any>(res).map(mapCustomerBooking).filter((item) => Boolean(item.id));
      return { bookings };
    } catch {
      return { bookings: [] };
    }
  },

  async updateCustomer(customerId: string, payload: UpdateCustomerDTO): Promise<{ success: boolean; message?: string; customer?: Customer | null }> {
    try {
      // BE UpdateCustomerRequestDTO: { fullName, phone, avatarUrl } — no email field
      const updatePayload: Record<string, any> = {
        ...(payload.name !== undefined ? { fullName: payload.name } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      };

      if (Object.keys(updatePayload).length > 0) {
        await apiService.put<any>(apiConfig.endpoints.adminCustomers.update(customerId), updatePayload);
      }

      if (payload.status !== undefined) {
        const rawStatus = toBackendStatus(payload.status);
        try {
          await apiService.patch<any>(apiConfig.endpoints.adminCustomers.updateStatus(customerId), { status: rawStatus });
        } catch {
          await apiService.patch<any>(apiConfig.endpoints.adminCustomers.updateStatus(customerId), rawStatus);
        }
      }

      const customer = await this.getCustomerById(customerId);
      return { success: true, customer };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể cập nhật khách hàng',
      };
    }
  },

  // API swagger hiện không có endpoint DELETE customer, nên dùng khóa tài khoản như xóa mềm.
  async deleteCustomer(customerId: string): Promise<{ success: boolean; message?: string }> {
    const result = await this.updateCustomer(customerId, { status: 'blocked' });
    if (!result.success) {
      return { success: false, message: result.message || 'Không thể xóa mềm khách hàng' };
    }

    return {
      success: true,
      message: 'Đã khóa tài khoản khách hàng (xóa mềm).',
    };
  },
};
