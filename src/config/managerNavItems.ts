import {
  Calendar,
  Home,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';

export const managerNavItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
  { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
  { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
  { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
  { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
  { id: 'experiences', label: 'Dịch vụ địa phương', icon: Sparkles, path: '/manager/experiences' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
] as const;