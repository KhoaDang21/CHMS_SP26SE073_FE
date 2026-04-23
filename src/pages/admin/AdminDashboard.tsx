import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  DollarSign,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  CalendarDays,
  Users,
  Home,
  TrendingUp,
} from 'lucide-react';
import type {
  DashboardStats,
  RevenueData,
  OccupancyData,
  BookingsReportData,
} from '../../types/homestay.types';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RoleBadge } from '../../components/common/RoleBadge';
import { authService } from '../../services/authService';
import { adminDashboardService } from '../../services/adminDashboardService';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [bookingsReport, setBookingsReport] = useState<BookingsReportData>({
    totalBookings: 0,
    statusDetails: [],
  });
  const [loading, setLoading] = useState(true);

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const statusLabelMap: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    CHECKED_IN: 'Đã check-in',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  };

  const bookingStatusChartData = bookingsReport.statusDetails.map((item) => ({
    ...item,
    label: statusLabelMap[item.status] ?? item.status,
  }));

  const statusCardConfig: Record<string, { label: string; icon: any; card: string; iconBg: string; iconText: string }> = {
    PENDING: {
      label: 'Chờ xác nhận',
      icon: Clock,
      card: 'border-l-4 border-yellow-500',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-600',
    },
    CONFIRMED: {
      label: 'Đã xác nhận',
      icon: CalendarDays,
      card: 'border-l-4 border-blue-500',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
    },
    CHECKED_IN: {
      label: 'Đã check-in',
      icon: ClipboardList,
      card: 'border-l-4 border-cyan-500',
      iconBg: 'bg-cyan-100',
      iconText: 'text-cyan-600',
    },
    COMPLETED: {
      label: 'Hoàn thành',
      icon: CheckCircle,
      card: 'border-l-4 border-green-500',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
    },
    CANCELLED: {
      label: 'Đã hủy',
      icon: XCircle,
      card: 'border-l-4 border-red-500',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
    },
  };

  const statusCardOrder = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'];
  const bookingStatusCards = statusCardOrder.map((status) => {
    const found = bookingsReport.statusDetails.find((item) => item.status === status);
    return {
      status,
      count: found?.count ?? 0,
      ...statusCardConfig[status],
    };
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const [statsData, revenueDataResult, occupancyDataResult, bookingsReportResult] = await Promise.all([
        adminDashboardService.getOverview(),
        adminDashboardService.getRevenueByPeriod({ year: currentYear }),
        adminDashboardService.getOccupancyReport(),
        adminDashboardService.getBookingsReport(),
      ]);

      setStats(statsData);
      setRevenueData(revenueDataResult);
      setOccupancyData(occupancyDataResult);
      setBookingsReport(bookingsReportResult);

      if (!revenueDataResult || revenueDataResult.length === 0) {
        toast.info('Chưa có dữ liệu doanh thu');
      }
      if (!occupancyDataResult || occupancyDataResult.length === 0) {
        toast.info('Chưa có dữ liệu tỷ lệ lấp đầy');
      }
      if (!bookingsReportResult.statusDetails || bookingsReportResult.statusDetails.length === 0) {
        toast.info('Chưa có dữ liệu trạng thái đơn đặt phòng');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      const emptyStats: DashboardStats = {
        totalRevenue: 0,
        revenueGrowth: 0,
        totalBookings: 0,
        bookingGrowth: 0,
        totalCustomers: 0,
        occupancyRate: 0,
        pendingBookings: 0,
        totalHomestays: 0,
        averageRating: 0,
      };
      setStats(emptyStats);
      setRevenueData([]);
      setOccupancyData([]);
      setBookingsReport({ totalBookings: 0, statusDetails: [] });
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

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
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white shadow-lg w-64`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Admin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar isAdminMode={true} />
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <div className="mt-1">
                {user?.role && <RoleBadge role={user.role} size="sm" />}
              </div>
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

      {/* Main Content */}
      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
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
                <h2 className="text-xl font-bold text-gray-900">Tổng quan</h2>
                <p className="text-sm text-gray-500">Chào mừng trở lại, {user?.name}!</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Revenue */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <span className={`text-sm font-medium ${stats?.revenueGrowth && stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats?.revenueGrowth && stats.revenueGrowth > 0 ? '+' : ''}{stats?.revenueGrowth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats?.totalRevenue.toLocaleString('vi-VN')} ₫
              </h3>
              <p className="text-gray-500 text-sm mt-1">Tổng doanh thu</p>
            </div>

            {/* Total Bookings */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                </div>
                <span className={`text-sm font-medium ${stats?.bookingGrowth && stats.bookingGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats?.bookingGrowth && stats.bookingGrowth > 0 ? '+' : ''}{stats?.bookingGrowth}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.totalBookings}</h3>
              <p className="text-gray-500 text-sm mt-1">Tổng đặt phòng</p>
            </div>

            {/* Total Customers */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.totalCustomers}</h3>
              <p className="text-gray-500 text-sm mt-1">Tổng khách hàng</p>
            </div>

            {/* Occupancy Rate */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Home className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.occupancyRate}</h3>
              <p className="text-gray-500 text-sm mt-1">Homestay đang hoạt động</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Doanh thu theo tháng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value: number | undefined) => value ? value.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Doanh thu"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Booking Status Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-600" />
                Trạng thái đơn đặt phòng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingStatusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value: number | undefined, _name, payload) => {
                      const percentage = payload?.payload?.percentage ?? 0;
                      return [`${value ?? 0} đơn (${percentage.toFixed(2)}%)`, 'Số lượng'];
                    }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    name="Số đơn theo trạng thái"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Occupancy Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-orange-600" />
              Tỷ lệ lấp đầy theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Tỷ lệ (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number | undefined) => value ? `${value.toFixed(2)}%` : '0%'}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="occupancyRate"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="Tỷ lệ lấp đầy"
                  dot={{ fill: '#f97316', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Booking Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {bookingStatusCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.status} className={`bg-white rounded-xl shadow-md p-6 ${item.card}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${item.iconText}`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{item.count}</h3>
                      <p className="text-gray-500 text-sm">{item.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
