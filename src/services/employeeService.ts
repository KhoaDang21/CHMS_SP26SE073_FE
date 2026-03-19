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

  async createEmployeeWithAvatarFile(
    payload: CreateEmployeeDTO,
    avatarFile: File,
  ): Promise<{ success: boolean; message?: string; data?: Employee } | null> {
    try {
      const form = new FormData();
      form.append('username', payload.username);
      form.append('email', payload.email);
      form.append('password', payload.password);
      form.append('fullName', payload.fullName);
      form.append('phoneNumber', payload.phoneNumber || '');
      form.append('roleId', payload.roleId);

      if (payload.avatarUrl) {
        form.append('avatarUrl', payload.avatarUrl);
      }

      form.append('avatarFile', avatarFile);

      const res = await apiService.postForm<any>(apiConfig.endpoints.employees.create, form);
      return res;
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
};
