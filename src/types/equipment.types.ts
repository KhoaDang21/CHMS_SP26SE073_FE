export interface Equipment {
  id: string;
  homestayId: string;
  homestayName?: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  borrowed: number;
  // Safety / inspection fields
  conditionStatus?: 'GOOD' | 'NEEDS_INSPECTION' | 'DAMAGED' | 'RETIRED';
  safetyStatus?: 'COMPLIANT' | 'INSPECTION_DUE' | 'BLOCKED';
  lastInspectedAt?: string;
  nextInspectionDueAt?: string;
  safetyNote?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  depositAmount?: number;
  rentalFee?: number;
  imageUrl?: string;
  condition: 'good' | 'fair' | 'maintenance';
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentBorrow {
  id: string;
  bookingId: string;
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  borrowDate: string;
  returnDate?: string;
  status: 'pending' | 'borrowed' | 'returned' | 'cancelled';
  borrowedBy?: string;
  returnedBy?: string;
  note?: string;
  condition?: string;
}

export interface EquipmentBorrowRequest {
  id: string;
  bookingId: string;
  customerId: string;
  homestayId: string;
  homestayName: string;
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  status: string;
  requestedAt?: string;
  note?: string;
  approvedAt?: string;
  handedOverAt?: string;
  returnedAt?: string;
  approvedByStaffId?: string;
  handedOverByStaffId?: string;
  returnedByStaffId?: string;
  rejectReason?: string;
  rejectedAt?: string;
  rejectedByStaffId?: string;
}

export interface CreateEquipmentPayload {
  homestayId: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  depositAmount: number;
  rentalFee: number;
  imageUrl?: string;
  description?: string;
  condition?: 'good' | 'fair' | 'maintenance';
  isActive: boolean;
}

export interface UpdateEquipmentPayload {
  name?: string;
  category?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  depositAmount?: number;
  rentalFee?: number;
  imageUrl?: string;
  description?: string;
  condition?: string;
  isActive?: boolean;
}
