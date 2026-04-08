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
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Home,
  Building2,
  Bell,
  MessageSquare,
  TrendingUp,
  ClipboardList,
  XCircle,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { homestayService } from '../../services/homestayService';
import { apiService } from '../../services/apiService';
import type { Booking } from '../../types/booking.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { toast } from 'sonner';

interface DashboardStats {
  totalBookings: number;
  arrivalsToday: number;
  inHouse: number;
  checkOutToday: number;
  totalRevenue: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface OccupancyData {
  month: string;
  occupancyRate: number;
}

interface BookingsReportData {
  totalBookings: number;
  statusDetails: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

interface ManagerBookingsResponse {
  success?: boolean;
  data?: any[];
  result?: any[];
  items?: any[];
}

interface ManagerBookingStatisticsResponse {
  success?: boolean;
  data?: {
    totalBookings?: number;
    totalArrivalsToday?: number;
    totalDeparturesToday?: number;
    totalInHouse?: number;
    totalRevenue?: number;
  };
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    arrivalsToday: 0,
    inHouse: 0,
    checkOutToday: 0,
    totalRevenue: 0,
  });
  const [upcomingCheckIns, setUpcomingCheckIns] = useState<Booking[]>([]);
  const [upcomingCheckOuts, setUpcomingCheckOuts] = useState<Booking[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [bookingsReport, setBookingsReport] = useState<BookingsReportData>({
    totalBookings: 0,
    statusDetails: [],
  });

  const user = authService.getCurrentUser();

  const getAssignedProvinceId = async (): Promise<string | null> => {
    if (!user) return null;

    const pickProvinceId = (item: any): string | null => {
      const candidate =
        item?.managedProvinceId ||
        item?.assignedProvinceId ||
        item?.managedProvince?.id ||
        item?.assignedProvince?.id ||
        item?.provinceId;
      return candidate ? String(candidate) : null;
    };

    try {
      const byId = await employeeService.getEmployeeById(String(user.id));
      const provinceId = pickProvinceId(byId);
      if (provinceId) return provinceId;
    } catch {
      // Fallback to list search below.
    }

    try {
      const all = await employeeService.getEmployees();
      const me = all.find(
        (item) =>
          String(item.id || '').toLowerCase() === String(user.id || '').toLowerCase() ||
          String(item.email || '').toLowerCase() === String(user.email || '').toLowerCase(),
      );
      return pickProvinceId(me);
    } catch {
      return null;
    }
  };

  const getHomestayProvinceId = (homestay: any): string => {
    return String(
      homestay?.provinceId ||
      homestay?.ProvinceId ||
      homestay?.province?.id ||
      homestay?.Province?.Id ||
      '',
    );
  };

  const toISO = (value: any): string => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  };

  const normalizeStatus = (value: any): Booking['status'] => {
    const raw = String(value || '').toUpperCase();
    if (raw === 'CONFIRMED') return 'confirmed';
    if (raw === 'COMPLETED' || raw === 'CHECKED_OUT' || raw === 'CHECKEDOUT') return 'completed';
    if (raw === 'CHECKED_IN' || raw === 'CHECKEDIN' || raw === 'IN_PROGRESS') return 'checked_in';
    if (raw === 'CANCELLED' || raw === 'REJECTED') return 'cancelled';
    return 'pending';
  };

  const toBookingFromManager = (item: any): Booking => {
    const checkInDate = toISO(item?.checkInDate || item?.checkIn);
    const checkOutDate = toISO(item?.checkOutDate || item?.checkOut);

    return {
      id: String(item?.id || ''),
      bookingCode: String(item?.bookingCode || item?.code || String(item?.id || '').slice(0, 8) || 'N/A'),
      homestayId: item?.homestayId ? String(item.homestayId) : undefined,
      homestayName: String(item?.homestayName || item?.name || item?.propertyName || 'Homestay'),
      homestayImage: item?.homestayImage || item?.imageUrl || item?.homestay?.imageUrls?.[0],
      customerName: String(item?.customerName || item?.guestName || 'Khách hàng'),
      customerEmail: String(item?.customerEmail || item?.email || ''),
      customerPhone: String(item?.customerPhone || item?.contactPhone || item?.phoneNumber || ''),
      checkInDate,
      checkOutDate,
      numberOfGuests: Number(item?.numberOfGuests ?? item?.guestsCount ?? 1),
      numberOfNights: Number(item?.numberOfNights ?? item?.totalNights ?? 1),
      totalPrice: Number(item?.totalPrice ?? item?.amount ?? 0),
      pricePerNight: Number(item?.pricePerNight ?? 0),
      status: normalizeStatus(item?.status),
      paymentStatus: 'pending',
      paymentMethod: item?.paymentMethod,
      specialRequests: item?.specialRequests,
      notes: item?.notes,
      cancellationReason: item?.cancellationReason,
      createdAt: toISO(item?.createdAt),
      confirmedAt: item?.confirmedAt ? toISO(item.confirmedAt) : undefined,
      cancelledAt: item?.cancelledAt ? toISO(item.cancelledAt) : undefined,
    };
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [homestays, managerBookingsResponse, managerBookingStatistics, assignedProvinceId] = await Promise.all([
        homestayService.getAllAdminHomestays(),
        apiService.get<ManagerBookingsResponse>('/api/manager/bookings'),
        apiService.get<ManagerBookingStatisticsResponse>('/api/manager/bookings/statistics').catch(() => null),
        getAssignedProvinceId(),
      ]);

      if (!assignedProvinceId) {
        setStats((prev) => ({
          ...prev,
          totalBookings: 0,
          arrivalsToday: 0,
          inHouse: 0,
          checkOutToday: 0,
          totalRevenue: 0,
        }));
        setUpcomingCheckIns([]);
        setUpcomingCheckOuts([]);
        toast.warning('Bạn chưa được phân công tỉnh quản lý.');
        return;
      }

      const allowedHomestayIds = new Set(
        (homestays || [])
          .filter((h: any) => getHomestayProvinceId(h) === assignedProvinceId)
          .map((h: any) => String(h.id)),
      );

      const rawManagerBookings = Array.isArray(managerBookingsResponse)
        ? managerBookingsResponse
        : managerBookingsResponse?.data || managerBookingsResponse?.result || managerBookingsResponse?.items || [];

      const allManagerBookings = (Array.isArray(rawManagerBookings) ? rawManagerBookings : [])
        .map(toBookingFromManager)
        .filter((b) => Boolean(b.id));

      const scopedBookings = allManagerBookings.filter((b) => {
        if (!allowedHomestayIds.size) return true;
        return allowedHomestayIds.has(String(b.homestayId || ''));
      });

      const statsPayload = managerBookingStatistics?.data;
      const totalBookings = Number(statsPayload?.totalBookings ?? scopedBookings.length);
      const arrivalsToday = Number(statsPayload?.totalArrivalsToday ?? 0);
      const checkOutToday = Number(statsPayload?.totalDeparturesToday ?? 0);
      const inHouse = Number(statsPayload?.totalInHouse ?? 0);
      const totalRevenue = Number(statsPayload?.totalRevenue ?? 0);

      const today = new Date().toISOString().split('T')[0];

      setStats({
        totalBookings,
        arrivalsToday,
        inHouse,
        checkOutToday,
        totalRevenue,
      });

      // Build booking status distribution from /api/manager/bookings
      const statusBuckets = [
        { key: 'pending', label: 'PENDING' },
        { key: 'confirmed', label: 'CONFIRMED' },
        { key: 'checked_in', label: 'CHECKED_IN' },
        { key: 'completed', label: 'COMPLETED' },
        { key: 'cancelled', label: 'CANCELLED' },
      ] as const;

      const totalBookingsForStatus = scopedBookings.length;
      setBookingsReport({
        totalBookings: totalBookingsForStatus,
        statusDetails: statusBuckets.map((bucket) => {
          const count = scopedBookings.filter((b) => b.status === bucket.key).length;
          return {
            status: bucket.label,
            count,
            percentage: totalBookingsForStatus > 0 ? Math.round((count / totalBookingsForStatus) * 100) : 0,
          };
        }),
      });

      // Calculate revenue by month from scoped bookings (COMPLETED only)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueByMonth: Record<string, number> = {};
      months.forEach((month) => {
        revenueByMonth[month] = 0;
      });

      scopedBookings
        .filter((b) => b.status === 'completed')
        .forEach((b) => {
          const date = new Date(b.checkOutDate || b.checkInDate);
          const month = months[date.getMonth()];
          revenueByMonth[month] = (revenueByMonth[month] || 0) + (Number(b.totalPrice) || 0);
        });

      const revData: RevenueData[] = months.map((month) => ({
        month,
        revenue: revenueByMonth[month] || 0,
      }));
      setRevenueData(revData);

      // Calculate occupancy rate by month (COMPLETED bookings only)
      const occupancyByMonth: Record<string, { days: number; occupiedDays: number }> = {};
      months.forEach((month) => {
        occupancyByMonth[month] = { days: 0, occupiedDays: 0 };
      });

      scopedBookings
        .filter((b) => b.status === 'completed' || b.status === 'checked_in')
        .forEach((b) => {
          const checkIn = new Date(b.checkInDate);
          const checkOut = new Date(b.checkOutDate);
          const startMonth = checkIn.getMonth();
          const endMonth = checkOut.getMonth();

          for (let m = startMonth; m <= endMonth && m < 12; m++) {
            const month = months[m];
            const monthStart = new Date(checkIn.getFullYear(), m, 1);
            const monthEnd = new Date(checkIn.getFullYear(), m + 1, 0);

            const occupiedStart = m === startMonth ? checkIn : monthStart;
            const occupiedEnd = m === endMonth ? checkOut : monthEnd;

            const daysInMonth = new Date(checkIn.getFullYear(), m + 1, 0).getDate();
            const occupiedDays = Math.ceil((occupiedEnd.getTime() - occupiedStart.getTime()) / (1000 * 60 * 60 * 24));

            occupancyByMonth[month].days = daysInMonth;
            occupancyByMonth[month].occupiedDays += occupiedDays;
          }
        });

      const occData: OccupancyData[] = months.map((month) => ({
        month,
        occupancyRate:
          occupancyByMonth[month].days > 0
            ? Math.round((occupancyByMonth[month].occupiedDays / (occupancyByMonth[month].days * allowedHomestayIds.size)) * 100)
            : 0,
      }));
      setOccupancyData(occData);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcomingIns = scopedBookings
        .filter((b) => b.checkInDate.startsWith(today) || b.checkInDate.startsWith(tomorrowStr))
        .slice(0, 5);

      const upcomingOuts = scopedBookings
        .filter((b) => b.checkOutDate.startsWith(today) || b.checkOutDate.startsWith(tomorrowStr))
        .slice(0, 5);

      setUpcomingCheckIns(upcomingIns);
      setUpcomingCheckOuts(upcomingOuts);
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

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
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
                  <p className="text-gray-600 text-sm mb-1">Tổng đặt phòng</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
                  <p className="text-xs text-gray-500 mt-1">Từ thống kê manager</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Khách đến hôm nay</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.arrivalsToday}</p>
                  <p className="text-xs text-gray-500 mt-1">Từ thống kê manager</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Khách đang lưu trú</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inHouse}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.checkOutToday} khách rời hôm nay</p>
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
                  <p className="text-xs text-gray-500 mt-1">Từ thống kê manager</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
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
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => value ? `${(value / 1000000).toFixed(1)}M ₫` : ''}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Occupancy Rate Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Tỷ lệ chiếm phòng theo tháng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => value ? `${value}%` : ''}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancyRate"
                    stroke="#10b981"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Status Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              Phân bố trạng thái đặt phòng
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingsReport.statusDetails}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Booking Status Cards */}
          {bookingsReport.statusDetails.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {bookingsReport.statusDetails.map((status) => {
                const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
                  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle },
                  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
                  CHECKED_IN: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
                  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle },
                  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
                };

                const statusColor = statusColors[status.status] || statusColors.PENDING;
                const StatusIcon = statusColor.icon;

                return (
                  <div key={status.status} className={`rounded-lg p-4 ${statusColor.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-semibold ${statusColor.text}`}>
                        {status.status}
                      </p>
                      <StatusIcon className={`w-5 h-5 ${statusColor.text}`} />
                    </div>
                    <p className={`text-2xl font-bold ${statusColor.text}`}>{status.count}</p>
                    <p className={`text-xs ${statusColor.text} mt-1`}>{status.percentage}%</p>
                  </div>
                );
              })}
            </div>
          )}

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
