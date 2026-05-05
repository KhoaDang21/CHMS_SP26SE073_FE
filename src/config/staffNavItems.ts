import {
  Bike,
  BookOpen,
  Calendar,
  Home,
  LayoutDashboard,
  Package,
  MessageSquare,
  Ticket,
  UtensilsCrossed,
  MapPin,
} from 'lucide-react';

export interface StaffNavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export interface StaffNavSection {
  section: string;
  items: StaffNavItem[];
}

export const staffNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
  { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/staff/bookings' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/staff/reviews' },
  { id: 'dining', label: 'Bếp - Đơn món', icon: UtensilsCrossed, path: '/staff/dining/orders' },
  { id: 'equipment', label: 'Đồ dùng', icon: Package, path: '/staff/equipment' },
  { id: 'bicycles', label: 'Mini-game xe đạp', icon: Bike, path: '/staff/bicycles' },
  { id: 'travel-guides', label: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, path: '/staff/tickets' },
] as const;

export const staffNavItemsGrouped: StaffNavSection[] = [
  {
    section: 'Thống kê',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
    ],
  },
  {
    section: 'Quản lý nền tảng',
    items: [
      { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/staff/bookings' },
      { id: 'dining', label: 'Bếp - Đơn món', icon: UtensilsCrossed, path: '/staff/dining/orders' },
      { id: 'equipment', label: 'Đồ dùng', icon: Package, path: '/staff/equipment' },
      { id: 'facilities', label: 'Bảo trì', icon: Home, path: '/staff/facilities' },
      { id: 'bicycles', label: 'Mini-game xe đạp', icon: Bike, path: '/staff/bicycles' },
      { id: 'local-experience', label: 'Lịch dẫn tour', icon: MapPin, path: '/staff/local-experience' },
      { id: 'travel-guides', label: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides' },
    ],
  },
  {
    section: 'Quản lý người dùng',
    items: [
      { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/staff/reviews' },
      { id: 'tickets', label: 'Tickets', icon: Ticket, path: '/staff/tickets' },
    ],
  },
];