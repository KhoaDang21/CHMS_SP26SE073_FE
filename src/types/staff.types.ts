export type StaffRole = 'admin' | 'manager' | 'staff';
export type StaffStatus = 'active' | 'inactive' | 'on_leave';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  department: string;
  position: string;
  hireDate: string;
  avatar?: string;
  assignedHomestays: string[];
}

export interface CreateStaffDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  roleId: string;
}

export interface UpdateStaffDTO {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roleId?: string;
}
