export type DiningServeLocation = "ROOM" | "BEACH";
export type DiningPaymentStatus = "CHARGE_TO_ROOM";
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
  comboName: string;
  imageUrl?: string;
  orderDate: string; // ISO
  startTime: string; // "18:00:00"
  serveLocation: string;
  status: string;
  price: number;
  paymentStatus: string;
  note?: string;
}

