export type FacilityCondition = 'GOOD' | 'NEEDS_REPAIR' | 'DAMAGED' | 'REPLACED' | 'RETIRED';
export type MaintenanceStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DamageLevel = 'MINOR' | 'MODERATE' | 'SEVERE';

export const FACILITY_CONDITION_OPTIONS: Array<{ value: FacilityCondition; label: string }> = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'NEEDS_REPAIR', label: 'Cần bảo trì' },
  { value: 'DAMAGED', label: 'Hỏng' },
  { value: 'REPLACED', label: 'Đã thay thế' },
  { value: 'RETIRED', label: 'Loại bỏ' },
];

export const MAINTENANCE_STATUS_OPTIONS: Array<{ value: MaintenanceStatus; label: string }> = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export const PRIORITY_LEVEL_OPTIONS: Array<{ value: PriorityLevel; label: string }> = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

export const DAMAGE_LEVEL_OPTIONS: Array<{ value: DamageLevel; label: string }> = [
  { value: 'MINOR', label: 'Nhẹ' },
  { value: 'MODERATE', label: 'Vừa' },
  { value: 'SEVERE', label: 'Nặng' },
];

export interface FacilityAsset {
  id: string;
  homestayId: string;
  name: string;
  category?: string; // e.g., ELECTRIC, FURNITURE
  description?: string;
  quantity?: number;
  // Inventory / consumable support
  consumable?: boolean;
  unit?: string;
  unitPrice?: number;
  availableQuantity?: number;
  sku?: string;
  lowStockThreshold?: number;
  conditionStatus?: FacilityCondition;
  purchaseDate?: string;
  lastMaintenanceDate?: string | null;
  replacementCost?: number;
  imageUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFacilityPayload {
  homestayId: string;
  name: string;
  category?: string;
  description?: string;
  quantity?: number;
  consumable?: boolean;
  unit?: string;
  unitPrice?: number;
  availableQuantity?: number;
  sku?: string;
  lowStockThreshold?: number;
  conditionStatus?: FacilityCondition;
  purchaseDate?: string;
  lastMaintenanceDate?: string | null;
  replacementCost?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateFacilityPayload extends Partial<CreateFacilityPayload> {}

export interface MaintenanceRequest {
  id: string;
  facilityAssetId: string;
  facilityAssetName?: string;
  homestayId?: string;
  homestayName?: string;
  bookingId?: string | null;
  reportedByUserId?: string | null;
  reportedByUserName?: string;
  assignedStaffId?: string | null;
  assignedStaffName?: string;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  damageLevel?: DamageLevel;
  estimatedCost?: number;
  evidenceImageUrl?: string;
  facilityConditionStatus?: FacilityCondition;
  status?: MaintenanceStatus;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  actualCost?: number | null;
}

export interface CreateMaintenancePayload {
  facilityAssetId: string;
  assignedStaffId?: string;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  damageLevel?: DamageLevel;
  estimatedCost?: number;
  evidenceImageUrl?: string;
  facilityConditionStatus?: FacilityCondition;
}

export interface StaffCompletePayload {
  actualCost?: number;
  facilityConditionStatus?: FacilityCondition;
}
