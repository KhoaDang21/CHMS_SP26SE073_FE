export type DiningServeLocation = "ROOM" | "BEACH";
export type DiningPaymentStatus = "CHARGE_TO_ROOM" | "UNPAID" | "PAID";
export type DiningOrderStatus = "PENDING" | "PREPARING" | "SERVED" | "CANCELLED";

export interface DiningCombo {
  id: string;
  homestayId: string;
  name: string;
  description: string;
  price: number;
  maxPeople: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface DiningTimeSlot {
  id: string;
  homestayId: string;
  startTime: string; // "18:00:00"
  endTime: string;   // "19:00:00"
  maxCapacity: number;
  cutoffHours: number;
}

export interface AvailableDiningTimeSlot {
  id: string;
  startTime: string; // "18:00:00"
  remainingCapacity: number;
  isAvailable: boolean;
  disableReason?: string;
}

export interface DiningOrder {
  id: string;
  // Manager-level fields (present in manager/staff views)
  bookingId?: string;
  homestayId?: string;
  homestayName?: string;
  customerId?: string;
  customerName?: string;
  comboId?: string;
  timeSlotId?: string;
  // Common fields
  comboName: string;
  imageUrl?: string;
  orderDate: string; // ISO
  startTime: string; // "18:00:00"
  endTime?: string;  // "19:00:00"
  serveLocation: string;
  status: string;
  price: number;
  totalAmount: number;
  paymentStatus: string;
  note?: string;
  itemCount: number;
  items: DiningOrderItem[];
}

export interface DiningOrderItem {
  id: string;
  comboId: string;
  comboName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
  maxPeople: number;
}

export interface UpdateDiningComboPayload {
  name?: string;
  description?: string;
  price?: number;
  maxPeople?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateDiningTimeSlotPayload {
  startTime?: string; // "18:00:00"
  endTime?: string;   // "19:00:00"
  maxCapacity?: number;
  cutoffHours?: number;
}

export interface ManagerDiningOrderHistory {
  items: DiningOrder[];
  totalCount: number;
  totalRevenue: number;
  pageNumber: number;
  pageSize: number;
}

