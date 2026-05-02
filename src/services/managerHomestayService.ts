import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";
import type { Homestay } from "../types/homestay.types";
import { authService } from "./authService";
import { employeeService } from "./employeeService";
import { homestayService } from "./homestayService";
import { locationService } from "./locationService";

const logDevError = (message: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
};

const pickProvinceId = (item: any): string | null => {
  const candidate =
    item?.managerProvinceId ||
    item?.ManagerProvinceId ||
    item?.managedProvinceId ||
    item?.assignedProvinceId ||
    item?.managedProvince?.id ||
    item?.assignedProvince?.id ||
    item?.provinceId;
  return candidate ? String(candidate).trim() : null;
};

const getAssignedProvinceId = async (userId: string | undefined): Promise<string | null> => {
  if (!userId) return null;

  try {
    const byId = await employeeService.getEmployeeById(String(userId));
    const provinceId = pickProvinceId(byId);
    if (provinceId) return provinceId;
  } catch (error) {
    logDevError("Error fetching manager by ID:", error);
  }

  try {
    const all = await employeeService.getEmployees();
    const me = all.find(
      (item) =>
        String(item.id || '').toLowerCase() === String(userId || '').toLowerCase(),
    );
    return pickProvinceId(me);
  } catch (error) {
    logDevError("Error fetching manager from list:", error);
    return null;
  }
};

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const resolveHomestayProvinceId = (
  homestay: any,
  districtToProvinceMap: Map<string, string>,
  provinceNameToIdMap: Map<string, string>,
): string => {
  const directProvinceId = String(
    homestay?.provinceId ||
    homestay?.ProvinceId ||
    homestay?.province?.id ||
    homestay?.Province?.Id ||
    "",
  ).trim();
  if (directProvinceId) return directProvinceId;

  const districtId = String(
    homestay?.districtId ||
    homestay?.DistrictId ||
    homestay?.district?.id ||
    homestay?.District?.Id ||
    "",
  ).trim();
  if (districtId && districtToProvinceMap.has(districtId)) {
    return districtToProvinceMap.get(districtId) || "";
  }

  const provinceName = normalizeText(
    homestay?.provinceName ||
    homestay?.ProvinceName ||
    homestay?.province?.name ||
    homestay?.Province?.Name ||
    "",
  );
  if (provinceName && provinceNameToIdMap.has(provinceName)) {
    return provinceNameToIdMap.get(provinceName) || "";
  }

  return "";
};

export const managerHomestayService = {
  async list(): Promise<Homestay[]> {
    try {
      const currentUser = authService.getCurrentUser();
      const assignedProvinceId = await getAssignedProvinceId(currentUser?.id);
      if (!assignedProvinceId) {
        console.warn('Manager has no assigned province, returning empty list');
        return [];
      }

      const [items, provinces] = await Promise.all([
        homestayService.getAllAdminHomestays(),
        locationService.getProvinces(),
      ]);

      const districtsByProvince = await Promise.all(
        (provinces || []).map(async (province) => {
          const districts = await locationService.getDistrictsByProvince(province.id);
          return districts.map((district) => [String(district.id), String(province.id)] as const);
        }),
      );

      const districtToProvinceMap = new Map<string, string>(districtsByProvince.flat());
      const provinceNameToIdMap = new Map<string, string>(
        (provinces || []).map((province) => [normalizeText(province.name), String(province.id)] as const),
      );

      const filteredItems = items.filter(
        (homestay: any) => resolveHomestayProvinceId(homestay, districtToProvinceMap, provinceNameToIdMap) === assignedProvinceId,
      );

      console.log(
        `Filtered homestays: ${filteredItems.length} out of ${items.length} match province ${assignedProvinceId}`,
      );
      return filteredItems;
    } catch (error) {
      logDevError("Error fetching manager homestays:", error);
      console.error("Full error object:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Homestay | null> {
    try {
      const res = await apiService.get<any>(
        apiConfig.endpoints.managerHomestays.detail(id),
      );
      return res?.data ?? res ?? null;
    } catch (error) {
      logDevError("Error fetching manager homestay detail:", error);
      return null;
    }
  },

  async update(id: string, data: unknown): Promise<any> {
    try {
      return await apiService.put<any>(
        apiConfig.endpoints.managerHomestays.update(id),
        data,
      );
    } catch (error) {
      logDevError("Error updating manager homestay:", error);
      return null;
    }
  },
};
