export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  code?: string;
  name: string;
  description?: string;
  module?: string;
}

export interface CreateRoleDTO {
  name: string;
  description?: string;
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
}

export interface UpdateRolePermissionsDTO {
  permissionIds: string[];
}
