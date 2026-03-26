import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Home,
  Building2,
  Bell,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authService } from '../../services/authService';
import { adminBookingService } from '../../services/adminBookingService';
import { adminCustomerService } from '../../services/adminCustomerService';
import { employeeService } from '../../services/employeeService';
import { homestayService } from '../../services/homestayService';
import type { Booking } from '../../types/booking.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { toast } from 'sonner';

interface DashboardStats {
  todayBookings: number;
  pendingBookings: number;
  checkedInToday: number;
  checkOutToday: number;
  totalRevenue: number;
  activeCustomers: number;
  totalStaff: number;
  availableHomestays: number;
}

interface RecentActivity {
  id: string;
  type: 'booking' | 'checkin' | 'checkout' | 'customer';
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingBookings: 0,
    checkedInToday: 0,
    checkOutToday: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    totalStaff: 0,
    availableHomestays: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingCheckIns, setUpcomingCheckIns] = useState<Booking[]>([]);
  const [upcomingCheckOuts, setUpcomingCheckOuts] = useState<Booking[]>([]);

  const user = authService.getCurrentUser();

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [bookingStats, customerStats, staffData, homestays, allBookings] = await Promise.all([
        adminBookingService.getBookingStats(),
        adminCustomerService.getCustomerStats(),
        employeeService.getEmployees(),
        homestayService.getAllAdminHomestays(),
        adminBookingService.getAllBookings(),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayBookings = allBookings.filter((b) => b.createdAt?.startsWith(today)).length;

      const checkedInToday = allBookings.filter(
        (b) => b.checkInDate.startsWith(today) && b.status === 'checked_in',
      ).length;

      const checkOutToday = allBookings.filter((b) => b.checkOutDate.startsWith(today)).length;

      setStats({
        todayBookings,
        pendingBookings: bookingStats.pending,
        checkedInToday,
        checkOutToday,
        totalRevenue: bookingStats.totalRevenue,
        activeCustomers: customerStats.active + customerStats.vip,
        totalStaff: staffData.length,
        availableHomestays: homestays.filter((h) => h.status === 'ACTIVE').length,
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcomingIns = allBookings
        .filter((b) => b.checkInDate.startsWith(today) || b.checkInDate.startsWith(tomorrowStr))
        .slice(0, 5);

      const upcomingOuts = allBookings
        .filter((b) => b.checkOutDate.startsWith(today) || b.checkOutDate.startsWith(tomorrowStr))
        .slice(0, 5);

      setUpcomingCheckIns(upcomingIns);
      setUpcomingCheckOuts(upcomingOuts);

      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'booking',
          title: 'Đơn đặt phòng mới',
          description: 'Khách hàng vừa tạo đơn đặt phòng mới',
          time: '10 phút trước',
          icon: Calendar,
          color: 'text-blue-600 bg-blue-100',
        },
        {
          id: '2',
          type: 'checkin',
          title: 'Check-in thành công',
          description: 'Một khách đã hoàn tất check-in',
          time: '30 phút trước',
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
        },
        {
          id: '3',
          type: 'customer',
          title: 'Khách hàng mới',
          description: 'Có tài khoản khách hàng mới đăng ký',
          time: '1 giờ trước',
          icon: Users,
          color: 'text-purple-600 bg-purple-100',
        },
        {
          id: '4',
          type: 'checkout',
          title: 'Check-out hoàn tất',
          description: 'Một booking đã hoàn tất lưu trú',
          time: '2 giờ trước',
          icon: Clock,
          color: 'text-orange-600 bg-orange-100',
        },
      ];

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    void authService.logout();
    navigate('/auth/login');
  };

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
    { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
    { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
    { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
    { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
    { id: 'reports', label: 'Báo cáo', icon: TrendingUp, path: '/manager/reports' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Manager</h1>
              <p className="text-xs text-gray-500">Quản lý vận hành</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'overview';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? 'Manager'}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Manager</h2>
                <p className="text-gray-600 text-sm">Chào mừng trở lại, {user?.name ?? 'Manager'}!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Đặt phòng hôm nay</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayBookings}</p>
                  <p className="text-xs text-green-600 mt-1">+2 so với hôm qua</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Chờ xác nhận</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingBookings}</p>
                  <p className="text-xs text-red-600 mt-1">Cần xử lý</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Check-in hôm nay</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.checkedInToday}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.checkOutToday} check-out</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Doanh thu</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.totalRevenue / 1000000).toFixed(1)}M ₫
                  </p>
                  <p className="text-xs text-green-600 mt-1">+15% so với tháng trước</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Khách hàng hoạt động</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCustomers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Nhân viên</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Homestay sẵn sàng</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.availableHomestays}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Check-in sắp tới
                </h3>
                <button
                  onClick={() => navigate('/manager/bookings')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Xem tất cả →
                </button>
              </div>
              <div className="space-y-3">
                {upcomingCheckIns.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Không có check-in sắp tới</p>
                ) : (
                  upcomingCheckIns.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{booking.customerName}</p>
                        <p className="text-sm text-gray-600 truncate">{booking.homestayName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(booking.checkInDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500">{booking.numberOfGuests} khách</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Check-out sắp tới
                </h3>
                <button
                  onClick={() => navigate('/manager/bookings')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Xem tất cả →
                </button>
              </div>
              <div className="space-y-3">
                {upcomingCheckOuts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Không có check-out sắp tới</p>
                ) : (
                  upcomingCheckOuts.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{booking.customerName}</p>
                        <p className="text-sm text-gray-600 truncate">{booking.homestayName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(booking.checkOutDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500">{booking.numberOfNights} đêm</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Hoạt động gần đây
              </h3>
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <button
              onClick={() => navigate('/manager/bookings')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <Calendar className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-2">Quản lý Đặt phòng</h4>
              <p className="text-sm text-blue-100">Xem và xử lý đơn đặt phòng</p>
            </button>

            <button
              onClick={() => navigate('/manager/customers')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <Users className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-2">Quản lý Khách hàng</h4>
              <p className="text-sm text-purple-100">Xem thông tin khách hàng</p>
            </button>

            <button
              onClick={() => navigate('/manager/staff')}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <UserCog className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-2">Quản lý Nhân viên</h4>
              <p className="text-sm text-green-100">Phân công và quản lý nhân viên</p>
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
