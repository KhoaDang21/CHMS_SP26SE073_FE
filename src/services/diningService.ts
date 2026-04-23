import { apiConfig } from "../config/apiConfig";
import { apiService } from "./apiService";
import type {
  AvailableDiningTimeSlot,
  DiningCombo,
  DiningOrder,
  DiningServeLocation,
} from "../types/dining.types";

const asString = (v: any) => (v === undefined || v === null ? "" : String(v));

const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const normalizeTimeSpan = (value: any): string => {
  const raw = asString(value).trim();
  if (!raw) return "";
  // BE often returns "18:00:00" already.
  // Keep as-is but ensure has seconds.
  if (/^\d{1,2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
};

const mapCombo = (item: any): DiningCombo => ({
  id: asString(pick(item, "id", "Id")),
  homestayId: asString(pick(item, "homestayId", "HomestayId")),
  name: asString(pick(item, "name", "Name")),
  description: asString(pick(item, "description", "Description")),
  price: Number(pick(item, "price", "Price") ?? 0),
  maxPeople: Number(pick(item, "maxPeople", "MaxPeople") ?? 0),
  imageUrl: pick(item, "imageUrl", "ImageUrl"),
  isActive: Boolean(pick(item, "isActive", "IsActive") ?? false),
});

const mapSlot = (item: any): AvailableDiningTimeSlot => ({
  id: asString(pick(item, "id", "Id")),
  startTime: normalizeTimeSpan(pick(item, "startTime", "StartTime")),
  remainingCapacity: Number(pick(item, "remainingCapacity", "RemainingCapacity") ?? 0),
  isAvailable: Boolean(pick(item, "isAvailable", "IsAvailable") ?? false),
  disableReason: pick(item, "disableReason", "DisableReason"),
});

const mapOrder = (item: any): DiningOrder => ({
  id: asString(pick(item, "id", "Id")),
  comboName: asString(pick(item, "comboName", "ComboName")),
  imageUrl: pick(item, "imageUrl", "ImageUrl"),
  orderDate: asString(pick(item, "orderDate", "OrderDate")),
  startTime: normalizeTimeSpan(pick(item, "startTime", "StartTime")),
  serveLocation: asString(pick(item, "serveLocation", "ServeLocation")),
  status: asString(pick(item, "status", "Status")),
  price: Number(pick(item, "price", "Price") ?? 0),
  paymentStatus: asString(pick(item, "paymentStatus", "PaymentStatus")),
  note: pick(item, "note", "Note"),
});

export const diningService = {
  // ========= MANAGER =========
  async managerGetCombos(homestayId: string): Promise<DiningCombo[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.dining.manager.combosByHomestay(homestayId),
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapCombo);
  },

  async managerCreateCombo(payload: {
    homestayId: string;
    name: string;
    description: string;
    price: number;
    maxPeople: number;
    imageFile?: File | null;
  }): Promise<DiningCombo | null> {
    const form = new FormData();
    form.append("HomestayId", payload.homestayId);
    form.append("Name", payload.name);
    form.append("Description", payload.description);
    form.append("Price", String(payload.price));
    form.append("MaxPeople", String(payload.maxPeople));
    // MUST be ImageFile (CreateComboRequestDTO.ImageFile)
    if (payload.imageFile) {
      form.append("ImageFile", payload.imageFile);
    }

    const res = await apiService.postForm<any>(
      apiConfig.endpoints.dining.manager.createCombo,
      form,
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return mapCombo(data);
  },

  async managerUploadComboImage(comboId: string, file: File): Promise<string | null> {
    const form = new FormData();
    // ManagerDiningController.UploadComboImage(Guid comboId, IFormFile file) => key should be "file"
    form.append("file", file);
    const res = await apiService.postForm<any>(
      apiConfig.endpoints.dining.manager.uploadComboImage(comboId),
      form,
    );
    const data = res?.data ?? res;
    // BE returns ApiResponse<string> => data is string
    return typeof data === "string" ? data : (data?.url ?? data?.Url ?? null);
  },

  async managerToggleCombo(comboId: string): Promise<boolean> {
    await apiService.patch<any>(
      apiConfig.endpoints.dining.manager.toggleCombo(comboId),
      {},
    );
    return true;
  },

  async managerGetSlots(homestayId: string): Promise<any[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.dining.manager.slotsByHomestay(homestayId),
    );
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  async managerCreateSlot(payload: {
    homestayId: string;
    startTime: string; // "18:00:00"
    maxCapacity: number;
    cutoffHours: number;
  }): Promise<any> {
    return apiService.post<any>(
      apiConfig.endpoints.dining.manager.createSlot,
      {
        homestayId: payload.homestayId,
        startTime: payload.startTime,
        maxCapacity: payload.maxCapacity,
        cutoffHours: payload.cutoffHours,
      },
    );
  },

  async managerDeleteSlot(slotId: string): Promise<boolean> {
    await apiService.delete<any>(apiConfig.endpoints.dining.manager.deleteSlot(slotId));
    return true;
  },

  // ========= CUSTOMER =========
  async customerGetCombos(homestayId: string): Promise<DiningCombo[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.dining.customer.combosByHomestay(homestayId),
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapCombo);
  },

  async customerGetAvailableSlots(homestayId: string, dateISO: string): Promise<AvailableDiningTimeSlot[]> {
    const res = await apiService.get<any>(
      apiConfig.endpoints.dining.customer.availableSlots(homestayId),
      { date: dateISO },
    );
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapSlot);
  },

  async customerCreateOrder(payload: {
    bookingId: string;
    comboId: string;
    timeSlotId: string;
    orderDate: string; // YYYY-MM-DD
    serveLocation: DiningServeLocation;
    note?: string;
  }): Promise<DiningOrder | null> {
    const res = await apiService.post<any>(
      apiConfig.endpoints.dining.customer.createOrder,
      {
        bookingId: payload.bookingId,
        comboId: payload.comboId,
        timeSlotId: payload.timeSlotId,
        orderDate: payload.orderDate,
        serveLocation: payload.serveLocation,
        paymentStatus: "CHARGE_TO_ROOM",
        note: payload.note,
      },
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return mapOrder(data);
  },

  async customerCancelOrder(orderId: string): Promise<boolean> {
    await apiService.patch<any>(apiConfig.endpoints.dining.customer.cancelOrder(orderId), {});
    return true;
  },

  // ========= STAFF =========
  async staffGetOrders(dateISO: string): Promise<DiningOrder[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.dining.staff.orders, { date: dateISO });
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map(mapOrder);
  },

  async staffUpdateOrderStatus(orderId: string, status: string): Promise<boolean> {
    const q = new URLSearchParams({ status });
    await apiService.patch<any>(
      `${apiConfig.endpoints.dining.staff.updateOrderStatus(orderId)}?${q.toString()}`,
      {},
    );
    return true;
  },
};

