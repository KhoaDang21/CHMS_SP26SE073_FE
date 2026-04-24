import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Menu,
  X,
  LogOut,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { adminBookingService } from '../../services/adminBookingService';
import { employeeService } from '../../services/employeeService';
import { homestayService } from '../../services/homestayService';
import { locationService } from '../../services/locationService';
import { apiService } from '../../services/apiService';
import { Pagination } from '../../components/common/Pagination';
import type { Booking, BookingStatus, BookingStats } from '../../types/booking.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { buildDisplaySpecialRequests } from '../../utils/bookingExperience';
import { managerNavItemsGrouped } from '../../config/adminNavItemsGrouped';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function ManagerBookings() {
  const navigate = useNavigate();
  const pageSize = 10;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    checkedIn: 0,
    checkedOut: 0,
    cancelled: 0,
    totalRevenue: 0,
    averageBookingValue: 0,
  });

  const user = authService.getCurrentUser();
  const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

  const getAssignedProvinceId = async (): Promise<string | null> => {
    if (!user) return null;

    const pickProvinceId = (item: any): string | null => {
      const candidate =
        item?.managerProvinceId ||
        item?.ManagerProvinceId ||
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

  const fetchLocationDistrictMap = async (): Promise<Map<string, string>> => {
    try {
      const res = await apiService.get<any>('/api/locations');
      const payload = res?.data ?? res;
      const list: any[] = Array.isArray(payload)
        ? payload
        : payload?.items ?? payload?.Items ?? [];

      return new Map(
        (Array.isArray(list) ? list : [])
          .map((item) => {
            const locationId = String(item?.id ?? item?.Id ?? '').trim();
            const districtId = String(item?.districtId ?? item?.DistrictId ?? '').trim();
            return [locationId, districtId] as const;
          })
          .filter(([locationId, districtId]) => Boolean(locationId) && Boolean(districtId)),
      );
    } catch {
      return new Map<string, string>();
    }
  };

  const resolveHomestayProvinceId = (
    homestay: any,
    districtToProvinceMap: Map<string, string>,
    provinceNameToIdMap: Map<string, string>,
    locationDistrictMap: Map<string, string>,
  ): string => {
    const directProvinceId = String(
      homestay?.provinceId ||
      homestay?.ProvinceId ||
      homestay?.province?.id ||
      homestay?.Province?.Id ||
      '',
    ).trim();
    if (directProvinceId) return directProvinceId;

    const districtIdRaw = String(
      homestay?.districtId ||
      homestay?.DistrictId ||
      homestay?.district?.id ||
      homestay?.District?.Id ||
      '',
    ).trim();

    const locationId = String(
      homestay?.locationId ||
      homestay?.LocationId ||
      homestay?.location?.id ||
      homestay?.Location?.Id ||
      '',
    ).trim();

    const districtId = districtIdRaw || (locationId ? locationDistrictMap.get(locationId) || '' : '');
    if (districtId && districtToProvinceMap.has(districtId)) {
      return districtToProvinceMap.get(districtId) || '';
    }

    const provinceName = normalizeText(
      homestay?.provinceName ||
      homestay?.ProvinceName ||
      homestay?.province?.name ||
      homestay?.Province?.Name ||
      '',
    );
    if (provinceName && provinceNameToIdMap.has(provinceName)) {
      return provinceNameToIdMap.get(provinceName) || '';
    }

    return '';
  };

  const buildStats = (source: Booking[]): BookingStats => {
    const total = source.length;
    const pending = source.filter((b) => b.status === 'pending').length;
    const confirmed = source.filter((b) => b.status === 'confirmed').length;
    const checkedIn = source.filter((b) => b.status === 'checked_in').length;
    const checkedOut = source.filter((b) => b.status === 'completed' || b.status === 'checked_out').length;
    const cancelled = source.filter((b) => b.status === 'cancelled').length;
    const totalRevenue = source.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    return {
      total,
      pending,
      confirmed,
      checkedIn,
      checkedOut,
      cancelled,
      totalRevenue,
      averageBookingValue: total > 0 ? totalRevenue / total : 0,
    };
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const [provinceId, allHomestays, allBookings, provinces, locationDistrictMap] = await Promise.all([
        getAssignedProvinceId(),
        homestayService.getAllAdminHomestays(),
        adminBookingService.getAllBookings(),
        locationService.getProvinces(),
        fetchLocationDistrictMap(),
      ]);

      if (!provinceId) {
        setBookings([]);
        setStats(buildStats([]));
        toast.warning('Bạn chưa được phân công tỉnh quản lý.');
        return;
      }

      const districtsByProvince = await Promise.all(
        (provinces || []).map(async (province) => {
          const districts = await locationService.getDistrictsByProvince(province.id);
          return districts.map((district) => [String(district.id), String(province.id)] as const);
        }),
      );

      const districtToProvinceMap = new Map<string, string>(districtsByProvince.flat());
      const provinceNameToIdMap = new Map<string, string>(
        (provinces || []).map((province) => [normalizeText(province.name), String(province.id)] as const),
      );

      const allowedHomestayIds = new Set(
        (allHomestays || [])
          .filter(
            (h: any) =>
              resolveHomestayProvinceId(h, districtToProvinceMap, provinceNameToIdMap, locationDistrictMap) === provinceId,
          )
          .map((h: any) => String(h.id)),
      );

      const scopedBookings = allBookings.filter((b) => allowedHomestayIds.has(String(b.homestayId || '')));
      setBookings(scopedBookings);
      setStats(buildStats(scopedBookings));
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Không thể tải danh sách đơn đặt phòng');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.bookingCode.toLowerCase().includes(query) ||
          b.customerName.toLowerCase().includes(query) ||
          b.customerEmail.toLowerCase().includes(query) ||
          b.customerPhone.includes(query) ||
          b.homestayName.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(
        (b) =>
          new Date(b.checkInDate).toISOString().split('T')[0] === dateFilter ||
          new Date(b.checkOutDate).toISOString().split('T')[0] === dateFilter,
      );
    }

    setFilteredBookings(filtered);
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredBookings.length, currentPage]);

  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const booking = bookings.find((b) => b.id === bookingId) ?? (selectedBooking?.id === bookingId ? selectedBooking : null);
    if (newStatus === 'checked_in' && booking && booking.paymentStatus !== 'paid') {
      toast.error('Khách phải thanh toán đủ trước khi check-in/hoàn thành đơn');
      return;
    }

    const result = await adminBookingService.updateBooking(bookingId, { status: newStatus });
    if (result.success) {
      toast.success('Cập nhật trạng thái thành công!');
      await loadBookings();
      setSelectedBooking(null);
    } else {
      toast.error(result.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    const result = await adminBookingService.updateBooking(bookingId, {
      status: 'cancelled',
      cancellationReason: reason,
    });
    if (result.success) {
      toast.success('Hủy đơn đặt phòng thành công!');
      await loadBookings();
      setSelectedBooking(null);
    } else {
      toast.error(result.message || 'Không thể hủy đơn đặt phòng');
    }
  };

  const handleLogout = () => {
    void authService.logout();
    navigate('/auth/login');
  };

  const getStatusBadge = (status: BookingStatus) => {
    const styles: Record<BookingStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700',
      checked_in: 'bg-green-100 text-green-700',
      checked_out: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels: Record<BookingStatus, string> = {
      pending: 'Chờ thanh toán cọc',
      confirmed: 'Đã chấp nhận đặt phòng',
      completed: 'Hoàn thành',
      checked_in: 'Đã check-in',
      checked_out: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: Booking['paymentStatus']) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Chưa thanh toán', cls: 'bg-orange-100 text-orange-700' },
      deposit_paid: { label: 'Đã cọc', cls: 'bg-blue-100 text-blue-700' },
      paid: { label: 'Đã thanh toán đủ', cls: 'bg-green-100 text-green-700' },
      refunded: { label: 'Đã hoàn tiền', cls: 'bg-red-100 text-red-700' },
    };
    const s = map[status] ?? map.pending;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.cls}`}>{s.label}</span>;
  };

  const groupedNavItems = managerNavItemsGrouped;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar groupedItems={groupedNavItems} />
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
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Đơn đặt phòng</h2>
                <p className="text-gray-600 text-sm">Xem và xử lý các đơn đặt phòng</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/manager/reviews')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Xem Review</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng đơn</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Chờ thanh toán cọc</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Đã xác nhận</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.confirmed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng doanh thu</p>
                  <p className="text-2xl font-bold text-gray-900">{(stats.totalRevenue / 1000000).toFixed(1)}M ₫</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã đơn, tên khách, email, SĐT, homestay..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ thanh toán cọc</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Lọc theo ngày check-in hoặc check-out"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredBookings.length}</span> / {stats.total} đơn đặt phòng
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải danh sách đơn đặt phòng...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy đơn đặt phòng nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <img
                          src={booking.homestayImage || 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400'}
                          alt={booking.homestayName}
                          className="w-full lg:w-48 h-48 object-cover rounded-lg"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-lg">{booking.homestayName}</h3>
                              {getStatusBadge(booking.status)}
                              {booking.status !== 'pending' && getPaymentStatusBadge(booking.paymentStatus)}
                            </div>
                            <p className="text-sm text-gray-600 font-medium">Mã đơn: {booking.bookingCode}</p>
                          </div>
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Chi tiết</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{booking.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{booking.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{booking.customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {new Date(booking.checkInDate).toLocaleDateString('vi-VN')} -{' '}
                              {new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{booking.numberOfGuests} khách</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{booking.numberOfNights} đêm</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 gap-4 flex-wrap">
                          <div>
                            <p className="text-gray-600 text-sm">Tổng giá trị</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {booking.totalPrice.toLocaleString('vi-VN')} ₫
                            </p>
                            {booking.paymentStatus === 'pending' && booking.depositAmount !== undefined && booking.depositAmount > 0 && (
                              <p className="text-xs text-yellow-600 mt-1 font-medium">Cần cọc: {booking.depositAmount.toLocaleString('vi-VN')} ₫</p>
                            )}
                            {booking.paymentStatus === 'deposit_paid' && booking.remainingAmount !== undefined && booking.remainingAmount > 0 && (
                              <p className="text-xs text-orange-600 mt-1 font-medium">Đã cọc — còn nợ: {booking.remainingAmount.toLocaleString('vi-VN')} ₫</p>
                            )}
                            {booking.paymentStatus === 'paid' && (
                              <p className="text-xs text-green-600 mt-1 font-medium">Đã thanh toán đủ</p>
                            )}
                          </div>

                          {booking.status === 'pending' && (
                            <button
                              onClick={() => {
                                const reason = window.prompt('Lý do hủy đơn:');
                                if (reason) {
                                  void handleCancelBooking(booking.id, reason);
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Hủy đơn</span>
                            </button>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => void handleUpdateStatus(booking.id, 'checked_in')}
                              disabled={booking.paymentStatus !== 'paid'}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{booking.paymentStatus === 'paid' ? 'Check-in' : 'Chờ thanh toán đủ'}</span>
                            </button>
                          )}
                          {booking.status === 'checked_in' && (
                            <button
                              onClick={() => void handleUpdateStatus(booking.id, 'completed')}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Hoàn thành</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredBookings.length / pageSize))}
            totalItems={filteredBookings.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-start justify-between text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold">Chi tiết đơn đặt phòng</h2>
                <p className="text-blue-100 text-sm">{selectedBooking.homestayName}</p>
                {selectedBooking.bookingCode && !/^[0-9a-f]{8}(-[0-9a-f-]+)?$/i.test(selectedBooking.bookingCode) && (
                  <p className="text-blue-200 text-xs mt-0.5">Mã đơn: {selectedBooking.bookingCode}</p>
                )}
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Homestay */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" /> Thông tin homestay
                </h3>
                <div className="flex gap-4">
                  {selectedBooking.homestayImage ? (
                    <img src={selectedBooking.homestayImage} alt={selectedBooking.homestayName}
                      className="w-28 h-24 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-28 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-gray-300" />
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-gray-900">{selectedBooking.homestayName}</p>
                    <p className="text-gray-500">Check-in: <span className="font-medium text-gray-800">{new Date(selectedBooking.checkInDate).toLocaleDateString('vi-VN')}</span></p>
                    <p className="text-gray-500">Check-out: <span className="font-medium text-gray-800">{new Date(selectedBooking.checkOutDate).toLocaleDateString('vi-VN')}</span></p>
                    <p className="text-gray-500">{selectedBooking.numberOfNights} đêm · {selectedBooking.numberOfGuests} khách</p>
                  </div>
                </div>
              </section>

              {/* Customer */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Họ và tên</p>
                    <p className="font-medium text-gray-900">{selectedBooking.customerName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Số điện thoại</p>
                    {selectedBooking.customerPhone
                      ? <p className="font-medium text-gray-900">{selectedBooking.customerPhone}</p>
                      : <p className="text-gray-400 italic text-xs">Không có thông tin</p>}
                  </div>
                  {selectedBooking.customerEmail && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-gray-400 text-xs mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                      <p className="font-medium text-gray-900 break-all">{selectedBooking.customerEmail}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Status */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Trạng thái
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <p className="text-gray-400 text-xs mb-1.5">Đơn đặt phòng</p>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  {selectedBooking.status !== 'pending' && (
                    <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px]">
                      <p className="text-gray-400 text-xs mb-1.5">Thanh toán</p>
                      {getPaymentStatusBadge(selectedBooking.paymentStatus)}
                    </div>
                  )}
                </div>
              </section>

              {/* Payment detail */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-500" /> Chi tiết thanh toán
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giá phòng ({selectedBooking.numberOfNights} đêm)</span>
                    <span className="font-medium">{(selectedBooking.pricePerNight * selectedBooking.numberOfNights).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  {selectedBooking.discountAmount !== undefined && selectedBooking.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Giảm giá</span>
                      <span className="font-medium text-green-600">-{selectedBooking.discountAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                    <span className="text-gray-900">Tổng cộng</span>
                    <span className="text-blue-600 text-base">{selectedBooking.totalPrice.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {selectedBooking.paymentStatus === 'pending' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 col-span-2">
                        <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Cần cọc</p>
                        <p className="text-sm font-black text-yellow-700">{(selectedBooking.depositAmount || 0).toLocaleString('vi-VN')} ₫</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Đã thanh toán</p>
                          <p className="text-sm font-black text-green-700">{(selectedBooking.totalPrice - (selectedBooking.remainingAmount || 0)).toLocaleString('vi-VN')} ₫</p>
                        </div>
                        {selectedBooking.remainingAmount !== undefined && selectedBooking.remainingAmount > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Còn nợ</p>
                            <p className="text-sm font-black text-orange-700">{selectedBooking.remainingAmount.toLocaleString('vi-VN')} ₫</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Special requests */}
              {selectedBooking.specialRequests && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" /> Yêu cầu đặc biệt
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {buildDisplaySpecialRequests(selectedBooking.specialRequests)}
                  </p>
                </section>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => void handleUpdateStatus(selectedBooking.id, 'checked_in')}
                  disabled={selectedBooking.paymentStatus !== 'paid'}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {selectedBooking.paymentStatus === 'paid' ? 'Check-in' : 'Chờ thanh toán đủ'}
                </button>
              )}
              {selectedBooking.status === 'checked_in' && (
                <button
                  onClick={() => void handleUpdateStatus(selectedBooking.id, 'completed')}
                  className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Hoàn thành
                </button>
              )}
              <button onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
