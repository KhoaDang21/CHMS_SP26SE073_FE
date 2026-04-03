import {
  LayoutDashboard,
  Home,
  Sparkles,
  CalendarDays,
  Users,
  UserCog,
  TrendingUp,
  Gift,
  MessageSquare,
} from 'lucide-react';

export const adminNavItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'homestays', label: 'Quản lý Homestay', icon: Home, path: '/admin/homestays' },
  { id: 'amenities', label: 'Quản lý tiện ích', icon: Sparkles, path: '/admin/amenities' },
  { id: 'bookings', label: 'Đơn đặt phòng', icon: CalendarDays, path: '/admin/bookings' },
  { id: 'customers', label: 'Khách hàng', icon: Users, path: '/admin/customers' },
  { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/admin/staff' },
  { id: 'revenue', label: 'Doanh thu', icon: TrendingUp, path: '/admin/revenue' },
  { id: 'promotions', label: 'Promotion', icon: Gift, path: '/admin/promotions' },
  { id: 'tickets', label: 'Tickets', icon: MessageSquare, path: '/admin/tickets' },
] as const;
