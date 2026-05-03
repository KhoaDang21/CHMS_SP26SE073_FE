import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';
import type {
  FacilityAsset,
  CreateFacilityPayload,
  UpdateFacilityPayload,
  MaintenanceRequest,
  CreateMaintenancePayload,
  StaffCompletePayload,
} from '../types/facility.types';
import { extraChargeService } from './extraChargeService';

const normalizeFacilityCondition = (value: unknown) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return 'GOOD';
  if (raw === 'TỐT' || raw === 'TOT') return 'GOOD';
  if (raw === 'CẦN BẢO TRÌ' || raw === 'CAN BAO TRI' || raw === 'NEEDS REPAIR' || raw === 'NEEDS_REPAIR') return 'NEEDS_REPAIR';
  if (raw === 'HỎNG' || raw === 'HONG' || raw === 'DAMAGED') return 'DAMAGED';
  if (raw === 'ĐÃ THAY THẾ' || raw === 'DA THAY THE' || raw === 'REPLACED') return 'REPLACED';
  if (raw === 'LOẠI BỎ' || raw === 'LOAI BO' || raw === 'RETIRED') return 'RETIRED';
  return raw;
};

export const facilityService = {
  // Manager - facilities
  async managerGetFacilities(homestayId: string): Promise<FacilityAsset[]> {
    const res = await apiService.get<any>((apiConfig as any).endpoints.facilities.manager.list(homestayId));
    // Handle both wrapped response { success, data: [...] } and direct array
    const list: any[] = res?.data?.data ?? res?.data ?? (Array.isArray(res?.data) ? res.data : []);
    return list.map((i) => ({
      id: String(i.id ?? i.Id ?? ''),
      homestayId: String(i.homestayId ?? i.HomestayId ?? ''),
      name: i.name ?? i.Name ?? '',
      category: i.category ?? i.Category,
      description: i.description ?? i.Description,
      quantity: Number(i.quantity ?? i.Quantity ?? 0),
      consumable: Boolean(i.consumable ?? i.Consumable ?? false),
      unit: i.unit ?? i.Unit,
      unitPrice: Number(i.unitPrice ?? i.UnitPrice ?? i.price ?? i.Price ?? 0),
      availableQuantity: Number(i.availableQuantity ?? i.AvailableQuantity ?? i.available ?? i.Available ?? 0),
      sku: i.sku ?? i.SKU,
      lowStockThreshold: Number(i.lowStockThreshold ?? i.LowStockThreshold ?? 0),
      conditionStatus: i.conditionStatus ?? i.ConditionStatus,
      purchaseDate: i.purchaseDate ?? i.PurchaseDate,
      lastMaintenanceDate: i.lastMaintenanceDate ?? i.LastMaintenanceDate ?? null,
      replacementCost: i.replacementCost ?? i.ReplacementCost,
      imageUrl: i.imageUrl ?? i.ImageUrl,
      isActive: i.isActive ?? i.IsActive ?? true,
      createdAt: i.createdAt ?? i.CreatedAt,
      updatedAt: i.updatedAt ?? i.UpdatedAt,
    }));
  },

  async managerCreateFacility(payload: CreateFacilityPayload): Promise<FacilityAsset | null> {
    // Send only fields that API expects
    const body = {
      homestayId: payload.homestayId,
      name: payload.name,
      category: payload.category,
      description: payload.description,
      quantity: payload.quantity,
      conditionStatus: normalizeFacilityCondition((payload as any).conditionStatus),
      purchaseDate: (payload as any).purchaseDate,
      lastMaintenanceDate: (payload as any).lastMaintenanceDate,
      replacementCost: (payload as any).replacementCost || 0,
      imageUrl: (payload as any).imageUrl,
      isActive: (payload as any).isActive !== false,
    };
    const res = await apiService.post<any>((apiConfig as any).endpoints.facilities.manager.create, body);
    // Handle response wrapper { success, data: {...} }
    const data = res?.data?.data ?? res?.data ?? res;
    if (!data) return null;
    return {
      id: String(data.id ?? data.Id ?? ''),
      homestayId: String(data.homestayId ?? data.HomestayId ?? ''),
      name: data.name ?? data.Name ?? '',
      category: data.category ?? data.Category,
      description: data.description ?? data.Description,
      quantity: Number(data.quantity ?? data.Quantity ?? 0),
      consumable: Boolean(data.consumable ?? data.Consumable ?? false),
      unit: data.unit ?? data.Unit,
      unitPrice: Number(data.unitPrice ?? data.UnitPrice ?? data.price ?? data.Price ?? 0),
      availableQuantity: Number(data.availableQuantity ?? data.AvailableQuantity ?? data.available ?? data.Available ?? 0),
      sku: data.sku ?? data.SKU,
      lowStockThreshold: Number(data.lowStockThreshold ?? data.LowStockThreshold ?? 0),
      conditionStatus: normalizeFacilityCondition(data.conditionStatus ?? data.ConditionStatus) as any,
      purchaseDate: data.purchaseDate ?? data.PurchaseDate,
      lastMaintenanceDate: data.lastMaintenanceDate ?? data.LastMaintenanceDate ?? null,
      replacementCost: data.replacementCost ?? data.ReplacementCost,
      imageUrl: data.imageUrl ?? data.ImageUrl,
      isActive: data.isActive ?? data.IsActive ?? true,
      createdAt: data.createdAt ?? data.CreatedAt,
      updatedAt: data.updatedAt ?? data.UpdatedAt,
    };
  },

  async managerUpdateFacility(id: string, payload: UpdateFacilityPayload): Promise<FacilityAsset | null> {
    const res = await apiService.put<any>((apiConfig as any).endpoints.facilities.manager.update(id), payload);
    // Handle response wrapper { success, data: {...} }
    const data = res?.data?.data ?? res?.data ?? res;
    if (!data) return null;
    return {
      id: String(data.id ?? data.Id ?? ''),
      homestayId: String(data.homestayId ?? data.HomestayId ?? ''),
      name: data.name ?? data.Name ?? '',
      category: data.category ?? data.Category,
      description: data.description ?? data.Description,
      quantity: Number(data.quantity ?? data.Quantity ?? 0),
      consumable: Boolean(data.consumable ?? data.Consumable ?? false),
      unit: data.unit ?? data.Unit,
      unitPrice: Number(data.unitPrice ?? data.UnitPrice ?? data.price ?? data.Price ?? 0),
      availableQuantity: Number(data.availableQuantity ?? data.AvailableQuantity ?? data.available ?? data.Available ?? 0),
      sku: data.sku ?? data.SKU,
      lowStockThreshold: Number(data.lowStockThreshold ?? data.LowStockThreshold ?? 0),
      conditionStatus: normalizeFacilityCondition(data.conditionStatus ?? data.ConditionStatus) as any,
      purchaseDate: data.purchaseDate ?? data.PurchaseDate,
      lastMaintenanceDate: data.lastMaintenanceDate ?? data.LastMaintenanceDate ?? null,
      replacementCost: data.replacementCost ?? data.ReplacementCost,
      imageUrl: data.imageUrl ?? data.ImageUrl,
      isActive: data.isActive ?? data.IsActive ?? true,
      createdAt: data.createdAt ?? data.CreatedAt,
      updatedAt: data.updatedAt ?? data.UpdatedAt,
    };
  },

  async managerDeleteFacility(id: string): Promise<boolean> {
    await apiService.delete((apiConfig as any).endpoints.facilities.manager.delete(id));
    return true;
  },

  // Manager - maintenance
  async managerGetMaintenance(homestayId: string): Promise<MaintenanceRequest[]> {
    const res = await apiService.get<any>((apiConfig as any).endpoints.facilities.maintenance.list(homestayId));
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map((i) => ({
      id: String(i.id ?? i.Id ?? ''),
      facilityAssetId: String(i.facilityAssetId ?? i.FacilityAssetId ?? ''),
      facilityAssetName: i.facilityAssetName ?? i.FacilityAssetName ?? i.assetName ?? i.AssetName,
      homestayId: i.homestayId ?? i.HomestayId ?? null,
      homestayName: i.homestayName ?? i.HomestayName ?? i.propertyName ?? i.PropertyName,
      bookingId: i.bookingId ?? i.BookingId ?? null,
      reportedByUserId: i.reportedByUserId ?? i.ReportedByUserId ?? null,
      reportedByUserName: i.reportedByUserName ?? i.ReportedByUserName ?? i.reportedByName ?? i.ReportedByName,
      assignedStaffId: i.assignedStaffId ?? i.AssignedStaffId ?? null,
      assignedStaffName: i.assignedStaffName ?? i.AssignedStaffName ?? i.staffName ?? i.StaffName,
      title: i.title ?? i.Title ?? '',
      description: i.description ?? i.Description,
      priority: i.priority ?? i.Priority,
      damageLevel: i.damageLevel ?? i.DamageLevel,
      estimatedCost: i.estimatedCost ?? i.EstimatedCost,
      evidenceImageUrl: i.evidenceImageUrl ?? i.EvidenceImageUrl,
      facilityConditionStatus: i.facilityConditionStatus ?? i.FacilityConditionStatus,
      status: i.status ?? i.Status,
      createdAt: i.createdAt ?? i.CreatedAt,
      updatedAt: i.updatedAt ?? i.UpdatedAt,
      startedAt: i.startedAt ?? i.StartedAt ?? null,
      completedAt: i.completedAt ?? i.CompletedAt ?? null,
      actualCost: i.actualCost ?? i.ActualCost ?? null,
    }));
  },

  async managerCreateMaintenance(payload: CreateMaintenancePayload): Promise<MaintenanceRequest | null> {
    const res = await apiService.post<any>((apiConfig as any).endpoints.facilities.maintenance.create, payload);
    const data = res?.data ?? res;
    if (!data) return null;
    return {
      id: String(data.id ?? data.Id ?? ''),
      facilityAssetId: String(data.facilityAssetId ?? data.FacilityAssetId ?? ''),
      facilityAssetName: data.facilityAssetName ?? data.FacilityAssetName ?? data.assetName ?? data.AssetName,
      homestayId: data.homestayId ?? data.HomestayId ?? null,
      homestayName: data.homestayName ?? data.HomestayName ?? data.propertyName ?? data.PropertyName,
      bookingId: data.bookingId ?? data.BookingId ?? null,
      reportedByUserId: data.reportedByUserId ?? data.ReportedByUserId ?? null,
      reportedByUserName: data.reportedByUserName ?? data.ReportedByUserName ?? data.reportedByName ?? data.ReportedByName,
      assignedStaffId: data.assignedStaffId ?? data.AssignedStaffId ?? null,
      assignedStaffName: data.assignedStaffName ?? data.AssignedStaffName ?? data.staffName ?? data.StaffName,
      title: data.title ?? data.Title ?? '',
      description: data.description ?? data.Description,
      priority: data.priority ?? data.Priority,
      damageLevel: data.damageLevel ?? data.DamageLevel,
      estimatedCost: data.estimatedCost ?? data.EstimatedCost,
      evidenceImageUrl: data.evidenceImageUrl ?? data.EvidenceImageUrl,
      facilityConditionStatus: data.facilityConditionStatus ?? data.FacilityConditionStatus,
      status: data.status ?? data.Status,
      createdAt: data.createdAt ?? data.CreatedAt,
      updatedAt: data.updatedAt ?? data.UpdatedAt,
      startedAt: data.startedAt ?? data.StartedAt ?? null,
      completedAt: data.completedAt ?? data.CompletedAt ?? null,
      actualCost: data.actualCost ?? data.ActualCost ?? null,
    };
  },

  async managerAssignMaintenance(id: string, staffId: string): Promise<boolean> {
    await apiService.put((apiConfig as any).endpoints.facilities.maintenance.assignStaff(id), { assignedStaffId: staffId });
    return true;
  },

  async managerGetMaintenanceDetail(id: string): Promise<MaintenanceRequest | null> {
    const res = await apiService.get<any>((apiConfig as any).endpoints.facilities.maintenance.detail(id));
    const data = res?.data ?? res;
    if (!data) return null;
    return {
      id: String(data.id ?? data.Id ?? ''),
      facilityAssetId: String(data.facilityAssetId ?? data.FacilityAssetId ?? ''),
      facilityAssetName: data.facilityAssetName ?? data.FacilityAssetName ?? data.assetName ?? data.AssetName,
      homestayId: data.homestayId ?? data.HomestayId ?? null,
      homestayName: data.homestayName ?? data.HomestayName ?? data.propertyName ?? data.PropertyName,
      bookingId: data.bookingId ?? data.BookingId ?? null,
      reportedByUserId: data.reportedByUserId ?? data.ReportedByUserId ?? null,
      reportedByUserName: data.reportedByUserName ?? data.ReportedByUserName ?? data.reportedByName ?? data.ReportedByName,
      assignedStaffId: data.assignedStaffId ?? data.AssignedStaffId ?? null,
      assignedStaffName: data.assignedStaffName ?? data.AssignedStaffName ?? data.staffName ?? data.StaffName,
      title: data.title ?? data.Title ?? '',
      description: data.description ?? data.Description,
      priority: data.priority ?? data.Priority,
      damageLevel: data.damageLevel ?? data.DamageLevel,
      estimatedCost: data.estimatedCost ?? data.EstimatedCost,
      evidenceImageUrl: data.evidenceImageUrl ?? data.EvidenceImageUrl,
      // some APIs return array field
      ...(data.evidenceImageUrls ? { evidenceImageUrls: data.evidenceImageUrls } : {}),
      facilityConditionStatus: data.facilityConditionStatus ?? data.FacilityConditionStatus,
      status: data.status ?? data.Status,
      createdAt: data.createdAt ?? data.CreatedAt,
      updatedAt: data.updatedAt ?? data.UpdatedAt,
      startedAt: data.startedAt ?? data.StartedAt ?? null,
      completedAt: data.completedAt ?? data.CompletedAt ?? null,
      actualCost: data.actualCost ?? data.ActualCost ?? null,
    } as any;
  },

  async managerUpdateMaintenanceStatus(id: string, status: string): Promise<boolean> {
    await apiService.patch((apiConfig as any).endpoints.facilities.maintenance.updateStatus(id), { status });
    return true;
  },

  // Staff - maintenance
  async staffGetMaintenance(params?: Record<string, any>): Promise<MaintenanceRequest[]> {
    const res = await apiService.get<any>((apiConfig as any).endpoints.facilities.staff.maintenanceList, params);
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map((i) => ({
      id: String(i.id ?? i.Id ?? ''),
      facilityAssetId: String(i.facilityAssetId ?? i.FacilityAssetId ?? ''),
      facilityAssetName: i.facilityAssetName ?? i.FacilityAssetName ?? i.assetName ?? i.AssetName,
      homestayId: i.homestayId ?? i.HomestayId ?? null,
      homestayName: i.homestayName ?? i.HomestayName ?? i.propertyName ?? i.PropertyName,
      bookingId: i.bookingId ?? i.BookingId ?? null,
      reportedByUserId: i.reportedByUserId ?? i.ReportedByUserId ?? null,
      reportedByUserName: i.reportedByUserName ?? i.ReportedByUserName ?? i.reportedByName ?? i.ReportedByName,
      assignedStaffId: i.assignedStaffId ?? i.AssignedStaffId ?? null,
      assignedStaffName: i.assignedStaffName ?? i.AssignedStaffName ?? i.staffName ?? i.StaffName,
      title: i.title ?? i.Title ?? '',
      description: i.description ?? i.Description,
      priority: i.priority ?? i.Priority,
      damageLevel: i.damageLevel ?? i.DamageLevel,
      estimatedCost: i.estimatedCost ?? i.EstimatedCost,
      evidenceImageUrl: i.evidenceImageUrl ?? i.EvidenceImageUrl,
      facilityConditionStatus: i.facilityConditionStatus ?? i.FacilityConditionStatus,
      status: i.status ?? i.Status,
      createdAt: i.createdAt ?? i.CreatedAt,
      updatedAt: i.updatedAt ?? i.UpdatedAt,
      startedAt: i.startedAt ?? i.StartedAt ?? null,
      completedAt: i.completedAt ?? i.CompletedAt ?? null,
      actualCost: i.actualCost ?? i.ActualCost ?? null,
    }));
  },

  async staffGetMaintenanceDetail(id: string): Promise<MaintenanceRequest | null> {
    const res = await apiService.get<any>((apiConfig as any).endpoints.facilities.staff.maintenanceDetail(id));
    const data = res?.data ?? res;
    if (!data) return null;
    return {
      id: String(data.id ?? data.Id ?? ''),
      facilityAssetId: String(data.facilityAssetId ?? data.FacilityAssetId ?? ''),
      facilityAssetName: data.facilityAssetName ?? data.FacilityAssetName ?? data.assetName ?? data.AssetName,
      homestayId: data.homestayId ?? data.HomestayId ?? null,
      homestayName: data.homestayName ?? data.HomestayName ?? data.propertyName ?? data.PropertyName,
      bookingId: data.bookingId ?? data.BookingId ?? null,
      reportedByUserId: data.reportedByUserId ?? data.ReportedByUserId ?? null,
      reportedByUserName: data.reportedByUserName ?? data.ReportedByUserName ?? data.reportedByName ?? data.ReportedByName,
      assignedStaffId: data.assignedStaffId ?? data.AssignedStaffId ?? null,
      assignedStaffName: data.assignedStaffName ?? data.AssignedStaffName ?? data.staffName ?? data.StaffName,
      title: data.title ?? data.Title ?? '',
      description: data.description ?? data.Description,
      priority: data.priority ?? data.Priority,
      damageLevel: data.damageLevel ?? data.DamageLevel,
      estimatedCost: data.estimatedCost ?? data.EstimatedCost,
      evidenceImageUrl: data.evidenceImageUrl ?? data.EvidenceImageUrl,
      facilityConditionStatus: data.facilityConditionStatus ?? data.FacilityConditionStatus,
      status: data.status ?? data.Status,
      createdAt: data.createdAt ?? data.CreatedAt,
      updatedAt: data.updatedAt ?? data.UpdatedAt,
      startedAt: data.startedAt ?? data.StartedAt ?? null,
      completedAt: data.completedAt ?? data.CompletedAt ?? null,
      actualCost: data.actualCost ?? data.ActualCost ?? null,
    };
  },

  async staffStartMaintenance(id: string): Promise<boolean> {
    await apiService.patch((apiConfig as any).endpoints.facilities.staff.start(id), {});
    return true;
  },

  async staffCompleteMaintenance(id: string, payload: StaffCompletePayload): Promise<boolean> {
    await apiService.patch((apiConfig as any).endpoints.facilities.staff.complete(id), payload ?? {});
    return true;
  },

  async staffUploadMaintenanceEvidence(
    id: string,
    payload: {
      imageFile?: File | null;
      imageUrl?: string;
    },
  ): Promise<boolean> {
    const form = new FormData();
    if (payload.imageFile) {
      form.append('ImageFile', payload.imageFile);
    }
    if (payload.imageUrl?.trim()) {
      form.append('ImageUrl', payload.imageUrl.trim());
    }
    if (!payload.imageFile && !payload.imageUrl?.trim()) {
      return true;
    }

    await apiService.postForm((apiConfig as any).endpoints.facilities.staff.evidence(id), form);
    return true;
  },

  /**
   * Consume inventory item (staff) and optionally create an ExtraCharge for a booking.
   * Returns: { success, consumedItem, extraChargeResult }
   */
  async consumeInventory(
    itemId: string,
    data: {
      bookingId?: string;
      quantity: number;
      note?: string;
      staffId?: string;
      evidenceImageUrl?: string;
    }
  ): Promise<{ success: boolean; consumedItem?: FacilityAsset; extraCharge?: any }> {
    // call staff consume endpoint to decrement inventory server-side
    const payload = {
      bookingId: data.bookingId,
      quantity: data.quantity,
      note: data.note,
      staffId: data.staffId,
      evidenceImageUrl: data.evidenceImageUrl,
    };

    const res = await apiService.post<any>((apiConfig as any).endpoints.facilities.staff.consume(itemId), payload);
    const consumed = res?.data ?? res;

    // Map returned consumed item if available
    const consumedItem: FacilityAsset | undefined = consumed ? {
      id: String(consumed.id ?? consumed.Id ?? itemId),
      homestayId: String(consumed.homestayId ?? consumed.HomestayId ?? ''),
      name: consumed.name ?? consumed.Name ?? '',
      category: consumed.category ?? consumed.Category,
      description: consumed.description ?? consumed.Description,
      quantity: Number(consumed.quantity ?? consumed.Quantity ?? 0),
      consumable: Boolean(consumed.consumable ?? consumed.Consumable ?? false),
      unit: consumed.unit ?? consumed.Unit,
      unitPrice: Number(consumed.unitPrice ?? consumed.UnitPrice ?? consumed.price ?? consumed.Price ?? 0),
      availableQuantity: Number(consumed.availableQuantity ?? consumed.AvailableQuantity ?? consumed.available ?? consumed.Available ?? 0),
      sku: consumed.sku ?? consumed.SKU,
      lowStockThreshold: Number(consumed.lowStockThreshold ?? consumed.LowStockThreshold ?? 0),
      conditionStatus: consumed.conditionStatus ?? consumed.ConditionStatus,
      purchaseDate: consumed.purchaseDate ?? consumed.PurchaseDate,
      lastMaintenanceDate: consumed.lastMaintenanceDate ?? consumed.LastMaintenanceDate ?? null,
      replacementCost: consumed.replacementCost ?? consumed.ReplacementCost,
      imageUrl: consumed.imageUrl ?? consumed.ImageUrl,
      isActive: consumed.isActive ?? consumed.IsActive ?? true,
      createdAt: consumed.createdAt ?? consumed.CreatedAt,
      updatedAt: consumed.updatedAt ?? consumed.UpdatedAt,
    } : undefined;

    let extraChargeResult: any = undefined;
    if (data.bookingId && consumedItem) {
      const amount = Number(consumedItem.unitPrice ?? 0) * Number(data.quantity ?? 0);
      try {
        const ec = await extraChargeService.create({ bookingId: data.bookingId, amount, note: data.note ?? `Tiêu thụ ${data.quantity} x ${consumedItem.name}` });
        extraChargeResult = ec;
      } catch (err) {
        // swallow - FE can surface error
        console.error('Failed to create extra charge for consumed inventory', err);
      }
    }

    return { success: true, consumedItem, extraCharge: extraChargeResult };
  },
};
