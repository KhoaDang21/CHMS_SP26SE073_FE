import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type {
  Equipment,
  EquipmentBorrow,
  EquipmentBorrowRequest,
  CreateEquipmentPayload,
  UpdateEquipmentPayload,
} from '../types/equipment.types';

const asString = (v: any) => (v === undefined || v === null ? '' : String(v));
const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const mapEquipment = (item: any): Equipment => {
  const mapped: Equipment = {
    id: asString(pick(item, 'id', 'Id')),
    homestayId: asString(pick(item, 'homestayId', 'HomestayId')),
    name: asString(pick(item, 'name', 'Name')),
    category: asString(pick(item, 'category', 'Category')),
    quantity: Number(pick(item, 'quantity', 'Quantity', 'totalQuantity', 'TotalQuantity') ?? 0),
    available: Number(
      pick(item, 'available', 'Available', 'availableQuantity', 'AvailableQuantity') ?? 0,
    ),
    borrowed: Number(pick(item, 'borrowed', 'Borrowed') ?? 0),
    totalQuantity: Number(pick(item, 'totalQuantity', 'TotalQuantity', 'quantity', 'Quantity') ?? 0),
    availableQuantity: Number(
      pick(item, 'availableQuantity', 'AvailableQuantity', 'available', 'Available') ?? 0,
    ),
    depositAmount: Number(pick(item, 'depositAmount', 'DepositAmount') ?? 0),
    rentalFee: Number(pick(item, 'rentalFee', 'RentalFee') ?? 0),
    imageUrl: pick(item, 'imageUrl', 'ImageUrl', 'image', 'Image'),
    condition: pick(item, 'condition', 'Condition') ?? 'good',
    image: pick(item, 'image', 'Image', 'imageUrl', 'ImageUrl'),
    description: pick(item, 'description', 'Description'),
    isActive: Boolean(pick(item, 'isActive', 'IsActive') ?? true),
    createdAt: pick(item, 'createdAt', 'CreatedAt'),
    updatedAt: pick(item, 'updatedAt', 'UpdatedAt'),
  };
  console.log('Mapped equipment with imageUrl:', { id: mapped.id, name: mapped.name, imageUrl: mapped.imageUrl });
  return mapped;
};

const mapBorrow = (item: any): EquipmentBorrow => ({
  id: asString(pick(item, 'id', 'Id')),
  bookingId: asString(pick(item, 'bookingId', 'BookingId')),
  equipmentId: asString(pick(item, 'equipmentId', 'EquipmentId')),
  equipmentName: asString(pick(item, 'equipmentName', 'EquipmentName')),
  quantity: Number(pick(item, 'quantity', 'Quantity') ?? 1),
  borrowDate: asString(pick(item, 'borrowDate', 'BorrowDate')),
  returnDate: pick(item, 'returnDate', 'ReturnDate'),
  status: pick(item, 'status', 'Status') ?? 'pending',
  borrowedBy: pick(item, 'borrowedBy', 'BorrowedBy'),
  returnedBy: pick(item, 'returnedBy', 'ReturnedBy'),
  note: pick(item, 'note', 'Note'),
  condition: pick(item, 'condition', 'Condition'),
});

const mapBorrowRequest = (item: any): EquipmentBorrowRequest => ({
  id: asString(pick(item, 'id', 'Id')),
  bookingId: asString(pick(item, 'bookingId', 'BookingId')),
  customerId: asString(pick(item, 'customerId', 'CustomerId')),
  homestayId: asString(pick(item, 'homestayId', 'HomestayId')),
  homestayName: asString(pick(item, 'homestayName', 'HomestayName')),
  equipmentId: asString(pick(item, 'equipmentId', 'EquipmentId')),
  equipmentName: asString(pick(item, 'equipmentName', 'EquipmentName')),
  quantity: Number(pick(item, 'quantity', 'Quantity') ?? 1),
  status: asString(pick(item, 'status', 'Status') ?? 'pending'),
  requestedAt: pick(item, 'requestedAt', 'RequestedAt'),
  note: pick(item, 'note', 'Note'),
  approvedAt: pick(item, 'approvedAt', 'ApprovedAt'),
  handedOverAt: pick(item, 'handedOverAt', 'HandedOverAt'),
  returnedAt: pick(item, 'returnedAt', 'ReturnedAt'),
  approvedByStaffId: asString(pick(item, 'approvedByStaffId', 'ApprovedByStaffId')),
  handedOverByStaffId: asString(pick(item, 'handedOverByStaffId', 'HandedOverByStaffId')),
  returnedByStaffId: asString(pick(item, 'returnedByStaffId', 'ReturnedByStaffId')),
  rejectReason: pick(item, 'rejectReason', 'RejectReason'),
  rejectedAt: pick(item, 'rejectedAt', 'RejectedAt'),
  rejectedByStaffId: asString(pick(item, 'rejectedByStaffId', 'RejectedByStaffId')),
});

export const equipmentLendingService = {
  // ========= MANAGER =========
  async managerGetEquipment(homestayId: string): Promise<Equipment[]> {
    console.log('Fetching equipment from API for homestayId:', homestayId);
    const res = await apiService.get<any>(
      apiConfig.endpoints.equipment.manager.list(homestayId)
    );
    console.log('API response:', res);
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    console.log('Parsed equipment list:', list);
    return list.map(mapEquipment);
  },

  async managerCreateEquipment(payload: CreateEquipmentPayload): Promise<Equipment | null> {
    const res = await apiService.post<any>(
      apiConfig.endpoints.equipment.manager.create,
      payload
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return mapEquipment(data);
  },

  async managerUpdateEquipment(equipmentId: string, payload: UpdateEquipmentPayload): Promise<Equipment | null> {
    const res = await apiService.patch<any>(
      apiConfig.endpoints.equipment.manager.update(equipmentId),
      payload
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return mapEquipment(data);
  },

  async managerDeleteEquipment(equipmentId: string): Promise<boolean> {
    await apiService.delete<any>(
      apiConfig.endpoints.equipment.manager.delete(equipmentId)
    );
    return true;
  },

  // ========= CUSTOMER =========
  async customerGetEquipment(homestayId: string): Promise<Equipment[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.equipment.customer.list(homestayId)
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapEquipment);
  },

  async customerBorrowEquipment(payload: {
    bookingId: string;
    equipmentId: string;
    quantity: number;
    note?: string;
  }): Promise<EquipmentBorrow | null> {
    const res = await apiService.post<any>(
      apiConfig.endpoints.equipment.customer.borrowRequest,
      payload
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return mapBorrow(data);
  },

  async customerGetBorrowRequests(): Promise<EquipmentBorrowRequest[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.equipment.customer.borrowRequest);
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapBorrowRequest);
  },

  async customerCancelBorrow(borrowId: string): Promise<boolean> {
    await apiService.patch<any>(
      apiConfig.endpoints.equipment.customer.cancelBorrow(borrowId),
      {}
    );
    return true;
  },

  async customerGetBorrowHistory(bookingId: string): Promise<EquipmentBorrow[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.equipment.customer.borrowHistory(bookingId)
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapBorrow);
  },

  // ========= STAFF =========
  async staffGetBorrowRequests(homestayId: string): Promise<EquipmentBorrow[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.equipment.staff.requests(homestayId)
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapBorrow);
  },

  async staffConfirmBorrow(borrowId: string, staffId?: string): Promise<boolean> {
    await apiService.patch<any>(
      apiConfig.endpoints.equipment.staff.confirmBorrow(borrowId),
      { staffId }
    );
    return true;
  },

  async staffRecordReturn(borrowId: string, payload: {
    condition?: string;
    note?: string;
    staffId?: string;
  }): Promise<boolean> {
    await apiService.patch<any>(
      apiConfig.endpoints.equipment.staff.recordReturn(borrowId),
      payload
    );
    return true;
  },

  async staffGetActiveBorrows(homestayId: string): Promise<EquipmentBorrow[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.equipment.staff.activeBorrows(homestayId)
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapBorrow);
  },
};
