import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';
import type {
  CreateEmployeeDTO,
  Employee,
  UpdateEmployeeDTO,
  UpdateEmployeeStatusDTO,
} from '../types/employee.types';

const logDevError = (message: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
};

const extractList = <T>(res: any): T[] => {
  if (Array.isArray(res)) return res as T[];

  const data = res?.data ?? res?.result ?? res;
  if (Array.isArray(data)) return data as T[];

  return (data?.Items ?? data?.items ?? data?.employees ?? []) as T[];
};

const extractCreatedEmployeeId = (res: any): string | null => {
  const candidate =
    res?.data?.id ??
    res?.result?.id ??
    res?.id;

  if (!candidate) return null;
  return String(candidate);
};

const pickNewestEmployee = (list: Employee[]): Employee | null => {
  if (list.length === 0) return null;

  const sorted = [...list].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  return sorted[0] ?? null;
};

const resolveEmployeeIdFromList = (employees: Employee[], email?: string, username?: string): string | null => {
  if (email) {
    const emailMatch = employees.filter(
      (emp) => (emp.email || '').toLowerCase() === email.toLowerCase(),
    );

    if (emailMatch.length > 0) {
      return pickNewestEmployee(emailMatch)?.id || null;
    }
  }

  if (username) {
    const usernameMatch = employees.filter(
      (emp) => (emp.username || '').toLowerCase() === username.toLowerCase(),
    );

    if (usernameMatch.length > 0) {
      return pickNewestEmployee(usernameMatch)?.id || null;
    }
  }

  return null;
};

export const employeeService = {
  async getEmployees(): Promise<Employee[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.employees.list);
      return extractList<Employee>(res);
    } catch (error) {
      logDevError('Error fetching employees:', error);
      return [];
    }
  },

  async createEmployee(payload: CreateEmployeeDTO): Promise<{ success: boolean; message?: string; data?: Employee } | null> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.employees.create, payload);
      return res;
    } catch (error) {
      logDevError('Error creating employee:', error);
      return null;
    }
  },

  async resolveCreatedEmployeeId(
    createRes: { success?: boolean; data?: Employee } | null,
    payload: Pick<CreateEmployeeDTO, 'email' | 'username'>,
  ): Promise<string | null> {
    const directId = extractCreatedEmployeeId(createRes);
    if (directId) return directId;

    try {
      const employees = await this.getEmployees();
      return resolveEmployeeIdFromList(employees, payload.email, payload.username);
    } catch (error) {
      logDevError('Error resolving created employee id:', error);
      return null;
    }
  },

  async createEmployeeWithAvatarFile(
    payload: CreateEmployeeDTO,
    avatarFile: File,
  ): Promise<{ success: boolean; message?: string; data?: Employee } | null> {
    try {
      // /api/employees endpoint accepts JSON payload (Swagger), not multipart/form-data.
      // Create the employee first, then upload avatar via /api/employees/{id}/avatar.
      const createRes = await this.createEmployee(payload);

      if (!createRes?.success) {
        return createRes;
      }

      const createdId = await this.resolveCreatedEmployeeId(createRes, {
        email: payload.email,
        username: payload.username,
      });

      if (!createdId) {
        return {
          success: true,
          message:
            createRes?.message ||
            'Tạo nhân viên thành công, nhưng chưa xác định được ID để upload avatar.',
          data: createRes?.data,
        };
      }

      const uploadRes = await this.uploadAvatar(createdId, avatarFile);
      if (!uploadRes?.success) {
        return {
          success: true,
          message:
            uploadRes?.message ||
            'Tạo nhân viên thành công, nhưng upload avatar thất bại.',
          data: createRes?.data,
        };
      }

      return {
        success: true,
        message: createRes?.message || 'Tạo nhân viên thành công',
        data: createRes?.data,
      };
    } catch (error) {
      logDevError('Error creating employee with avatar file:', error);
      return null;
    }
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.employees.detail(id));
      return (res?.data ?? res ?? null) as Employee | null;
    } catch (error) {
      logDevError('Error fetching employee by id:', error);
      return null;
    }
  },

  async updateEmployee(
    id: string,
    payload: UpdateEmployeeDTO,
  ): Promise<{ success: boolean; message?: string; data?: Employee } | null> {
    try {
      const res = await apiService.put<any>(apiConfig.endpoints.employees.update(id), payload);
      return res;
    } catch (error) {
      logDevError('Error updating employee:', error);
      return null;
    }
  },

  async deleteEmployee(id: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.delete<any>(apiConfig.endpoints.employees.delete(id));
      return res;
    } catch (error) {
      logDevError('Error deleting employee:', error);
      return null;
    }
  },

  async updateEmployeeStatus(
    id: string,
    payload: UpdateEmployeeStatusDTO,
  ): Promise<{ success: boolean; message?: string; data?: Employee } | null> {
    try {
      const res = await apiService.patch<any>(apiConfig.endpoints.employees.updateStatus(id), payload);
      return res;
    } catch (error) {
      logDevError('Error updating employee status:', error);
      return null;
    }
  },

  /** POST /api/employees/{id}/avatar — upload avatar file */
  async uploadAvatar(id: string, file: File): Promise<{ success: boolean; message?: string; avatarUrl?: string } | null> {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiService.postForm<any>(apiConfig.endpoints.employees.uploadAvatar(id), form);
      return { success: res?.success ?? true, message: res?.message, avatarUrl: res?.data ?? res?.avatarUrl };
    } catch (error) {
      logDevError('Error uploading employee avatar:', error);
      return null;
    }
  },

  /** PUT /api/employees/{id}/role — đổi role nhân viên */
  async changeRole(id: string, newRoleId: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      const res = await apiService.put<any>(apiConfig.endpoints.employees.changeRole(id), { newRoleId });
      return res;
    } catch (error) {
      logDevError('Error changing employee role:', error);
      return null;
    }
  },

  /** PUT /api/employees/{id}/assign-province — body is province id (string UUID) */
  async assignProvince(id: string, provinceId: string): Promise<{ success: boolean; message?: string } | null> {
    try {
      // Swagger shows raw string body for this endpoint.
      const res = await apiService.put<any>(apiConfig.endpoints.employees.assignProvince(id), provinceId);
      return res;
    } catch (error) {
      logDevError('Error assigning province:', error);
      return null;
    }
  },

  /**
   * PUT /api/employees/{id}/assign-homestays (or /assign-homestay)
   * Backend variants seen in Swagger: raw string[], or { homestayIds: string[] }.
   */
  async assignHomestays(id: string, homestayIds: string[]): Promise<{ success: boolean; message?: string } | null> {
    const cleanIds = homestayIds.map((x) => String(x)).filter(Boolean);

    try {
      try {
        const res = await apiService.put<any>(
          apiConfig.endpoints.employees.assignHomestays(id),
          cleanIds,
        );
        return res;
      } catch {
        // PUT assign-homestay expects AssignHomestayRequestDTO: { homestayIds }
      }

      const res = await apiService.put<any>(
        apiConfig.endpoints.employees.assignHomestay(id),
        { homestayIds: cleanIds },
      );
      return res;
    } catch (error) {
      logDevError('Error assigning homestays:', error);
      return null;
    }
  },
};
