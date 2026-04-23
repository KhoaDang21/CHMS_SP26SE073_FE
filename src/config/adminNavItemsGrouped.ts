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
  ShieldCheck,
  DollarSign,
} from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

export interface AdminNavSection {
  section: string;
  items: AdminNavItem[];
}

export const adminNavItemsGrouped: AdminNavSection[] = [
  {
    section: "Thống kê",
    items: [
      {
        id: "overview",
        label: "Tổng quan",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
      },
      {
        id: "revenue",
        label: "Doanh thu",
        icon: TrendingUp,
        path: "/admin/revenue",
      },
    ],
  },
  {
    section: "Quản lý nền tảng",
    items: [
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
    ],
  },
  {
    section: "Quản lý hệ thống",
    items: [
      {
        id: "promotions",
        label: "Giảm giá",
        icon: Gift,
        path: "/admin/promotions",
      },
      {
        id: "cancellation-policies",
        label: "Chính sách hoàn tiền",
        icon: ShieldCheck,
        path: "/admin/cancellation-policies",
      },
      {
        id: "refunds",
        label: "Quản lý Hoàn Tiền",
        icon: DollarSign,
        path: "/admin/refunds",
      },
    ],
  },
  {
    section: "Quản lý người dùng",
    items: [
      {
        id: "customers",
        label: "Khách hàng",
        icon: Users,
        path: "/admin/customers",
      },
      {
        id: "staff",
        label: "Nhân viên",
        icon: UserCog,
        path: "/admin/staff",
      },
      {
        id: "tickets",
        label: "Tickets",
        icon: MessageSquare,
        path: "/admin/tickets",
      },
    ],
  },
];

// Flat list for backward compatibility
export const adminNavItems = adminNavItemsGrouped.flatMap(section => section.items);

// Manager Navigation (Grouped)
export const managerNavItemsGrouped: AdminNavSection[] = [
  {
    section: "Thống kê",
    items: [
      {
        id: "overview",
        label: "Tổng quan",
        icon: LayoutDashboard,
        path: "/manager/dashboard",
      },
    ],
  },
  {
    section: "Quản lý nền tảng",
    items: [
      {
        id: "homestays",
        label: "Xem Homestay",
        icon: Home,
        path: "/manager/homestays",
      },
      {
        id: "bookings",
        label: "Đơn đặt phòng",
        icon: CalendarDays,
        path: "/manager/bookings",
      },
      {
        id: "experiences",
        label: "Dịch vụ địa phương",
        icon: Sparkles,
        path: "/manager/experiences",
      },
      {
        id: "travel-guides",
        label: "Cẩm nang du lịch",
        icon: BookOpen,
        path: "/travel-guides",
      },
      {
        id: "bicycles",
        label: "Mini-game xe đạp",
        icon: Bike,
        path: "/manager/bicycles",
      },
    ],
  },
  {
    section: "Quản lý người dùng",
    items: [
      {
        id: "customers",
        label: "Khách hàng",
        icon: Users,
        path: "/manager/customers",
      },
      {
        id: "staff",
        label: "Nhân viên",
        icon: UserCog,
        path: "/manager/staff",
      },
      {
        id: "reviews",
        label: "Reviews",
        icon: MessageSquare,
        path: "/manager/reviews",
      },
    ],
  },
];

// Staff Navigation (Grouped)
export const staffNavItemsGrouped: AdminNavSection[] = [
  {
    section: "Thống kê",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/staff/dashboard",
      },
    ],
  },
  {
    section: "Quản lý nền tảng",
    items: [
      {
        id: "bookings",
        label: "Bookings",
        icon: CalendarDays,
        path: "/staff/bookings",
      },
      {
        id: "bicycles",
        label: "Mini-game xe đạp",
        icon: Bike,
        path: "/staff/bicycles",
      },
      {
        id: "travel-guides",
        label: "Cẩm nang du lịch",
        icon: BookOpen,
        path: "/travel-guides",
      },
    ],
  },
  {
    section: "Quản lý người dùng",
    items: [
      {
        id: "reviews",
        label: "Reviews",
        icon: MessageSquare,
        path: "/staff/reviews",
      },
      {
        id: "tickets",
        label: "Tickets",
        icon: MessageSquare,
        path: "/staff/tickets",
      },
    ],
  },
];
