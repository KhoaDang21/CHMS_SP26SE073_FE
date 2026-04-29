export interface Equipment {
  id: string;
  homestayId: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  borrowed: number;
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
