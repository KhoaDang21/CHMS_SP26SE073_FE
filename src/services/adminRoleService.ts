import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

export const adminRoleService = {
  async list(params?: Record<string, any>) {
    return apiService.get<any>(apiConfig.endpoints.adminRoles.list, params);
  },

  async create(data: any) {
    return apiService.post<any>(apiConfig.endpoints.adminRoles.create, data);
  },

  async update(id: string, data: any) {
    return apiService.put<any>(apiConfig.endpoints.adminRoles.update(id), data);
  },

  async delete(id: string) {
    return apiService.delete<any>(apiConfig.endpoints.adminRoles.delete(id));
  },

  async getPermissions() {
    return apiService.get<any>(apiConfig.endpoints.adminRoles.permissions);
  },

  async assignPermissions(id: string, payload: any) {
    return apiService.put<any>(apiConfig.endpoints.adminRoles.assignPermissions(id), payload);
  },
};
