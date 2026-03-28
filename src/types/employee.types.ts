export interface Employee {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  managedProvinceId?: string | null;
  managedProvinceName?: string | null;
  assignedProvinceId?: string | null;
  assignedProvinceName?: string | null;
  assignedHomestayIds?: string[];
  assignedHomestays?: Array<
    | string
    | {
        id?: string;
        homestayId?: string;
        name?: string;
        homestayName?: string;
      }
  >;
}

export interface CreateEmployeeDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
  roleId: string;
}

export interface UpdateEmployeeDTO {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  roleId?: string;
}

export interface UpdateEmployeeStatusDTO {
  status?: string;
  isActive?: boolean;
}
