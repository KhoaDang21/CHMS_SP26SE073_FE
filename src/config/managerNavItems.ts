import {
  Calendar,
  BookOpen,
  Home,
  LayoutDashboard,
  UtensilsCrossed,
  MessageSquare,
  Sparkles,
  UserCog,
  Users,
  Bike,
  Package,
} from 'lucide-react';

export const managerNavItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
  { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
  { id: 'experiences', label: 'Dịch vụ địa phương', icon: Sparkles, path: '/manager/experiences' },
  { id: 'dining', label: 'Ăn uống', icon: UtensilsCrossed, path: '/manager/dining' },
  { id: 'equipment', label: 'Đồ dùng & mượn', icon: Package, path: '/manager/equipment' },
  { id: 'travel-guides', label: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides' },
  { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
  { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
  { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
  { id: 'bicycles', label: 'Mini-game xe đạp', icon: Bike, path: '/manager/bicycles' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
] as const;