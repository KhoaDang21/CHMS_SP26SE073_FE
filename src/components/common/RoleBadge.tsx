// Role Badge Component - Display user role with color coding

import type { UserRole } from '../../types/auth.types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const roleConfig: Record<UserRole, { label: string; color: string; bgColor: string }> = {
  admin: {
    label: 'Admin',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  manager: {
    label: 'Manager',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  staff: {
    label: 'Staff',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  customer: {
    label: 'Customer',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export function RoleBadge({ role, size = 'md', showIcon = false }: RoleBadgeProps) {
  const config = roleConfig[role];
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.bgColor} ${config.color} ${sizeClass}`}
    >
      {showIcon && (
        <span className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
      )}
      {config.label}
    </span>
  );
}
