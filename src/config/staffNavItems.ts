import {
  Bike,
  BookOpen,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Ticket,
} from 'lucide-react';

export const staffNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
  { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/staff/bookings' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/staff/reviews' },
  { id: 'bicycles', label: 'Mini-game xe đạp', icon: Bike, path: '/staff/bicycles' },
  { id: 'travel-guides', label: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, path: '/staff/tickets' },
] as const;