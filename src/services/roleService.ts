import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type {
  CreateRoleDTO,
  Permission,
  Role,
  UpdateRoleDTO,
  UpdateRolePermissionsDTO,
} from '../types/role.types';

const extractList = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res as T[];

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data as T[];

  return (data?.Items ?? data?.items ?? data?.roles ?? data?.permissions ?? []) as T[];
};

export const roleService = {
  async getRoles(): Promise<Role[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminRoles.list);
      return extractList<Role>(res);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  },

  async createRole(payload: CreateRoleDTO): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.adminRoles.create, payload);
      return res;
    } catch (error) {
      console.error('Error creating role:', error);
      return null;
    }
  },

  async updateRole(id: string, payload: UpdateRoleDTO): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.put<any>(apiConfig.endpoints.adminRoles.update(id), payload);
      return res;
    } catch (error) {
      console.error('Error updating role:', error);
      return null;
    }
  },

  async deleteRole(id: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.delete<any>(apiConfig.endpoints.adminRoles.delete(id));
      return res;
    } catch (error) {
      console.error('Error deleting role:', error);
      return null;
    }
  },

  async getPermissions(): Promise<Permission[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.adminPermissions.list);
      return extractList<Permission>(res);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  },

  async updateRolePermissions(
    roleId: string,
    payload: UpdateRolePermissionsDTO,
  ): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.put<any>(
        apiConfig.endpoints.adminRoles.updatePermissions(roleId),
        payload,
      );
      return res;
    } catch (error) {
      console.error('Error updating role permissions:', error);
      return null;
    }
  },
};
