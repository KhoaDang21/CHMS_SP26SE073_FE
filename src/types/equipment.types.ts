export interface Equipment {
  id: string;
  homestayId: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  borrowed: number;
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
  quantity: number;
  description?: string;
  condition?: 'good' | 'fair' | 'maintenance';
}

export interface UpdateEquipmentPayload {
  name?: string;
  category?: string;
  quantity?: number;
  description?: string;
  condition?: string;
  isActive?: boolean;
}
