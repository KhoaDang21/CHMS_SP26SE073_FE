import {
  LayoutDashboard,
  Home,
  BookOpen,
  Sparkles,
  Bike,
  CalendarDays,
  Users,
  UserCog,
  TrendingUp,
  Gift,
  MessageSquare,
} from "lucide-react";

export const adminNavItems = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    id: "homestays",
    label: "Quản lý Homestay",
    icon: Home,
    path: "/admin/homestays",
  },
  {
    id: "bookings",
    label: "Đơn đặt phòng",
    icon: CalendarDays,
    path: "/admin/bookings",
  },
  {
    id: "experiences",
    label: "Dịch vụ địa phương",
    icon: Sparkles,
    path: "/admin/experiences",
  },
  {
    id: "travel-guides",
    label: "Cẩm nang du lịch",
    icon: BookOpen,
    path: "/travel-guides",
  },
  {
    id: "amenities",
    label: "Quản lý tiện ích",
    icon: Sparkles,
    path: "/admin/amenities",
  },
  {
    id: "bicycles",
    label: "Mini-game xe đạp",
    icon: Bike,
    path: "/admin/bicycles",
  },
  {
    id: "customers",
    label: "Khách hàng",
    icon: Users,
    path: "/admin/customers",
  },
  { id: "staff", label: "Nhân viên", icon: UserCog, path: "/admin/staff" },
  {
    id: "revenue",
    label: "Doanh thu",
    icon: TrendingUp,
    path: "/admin/revenue",
  },
  {
    id: "promotions",
    label: "Giảm giá",
    icon: Gift,
    path: "/admin/promotions",
  },
  {
    id: "tickets",
    label: "Tickets",
    icon: MessageSquare,
    path: "/admin/tickets",
  },
] as const;
