import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Download,
  Menu,
  X,
  LogOut,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Home,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { adminBookingService } from '../../services/adminBookingService';
import type { Booking, BookingStatus, BookingStats } from '../../types/booking.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';

const initialStats: BookingStats = {
  total: 0,
  pending: 0,
  confirmed: 0,
  checkedIn: 0,
  checkedOut: 0,
  cancelled: 0,
  totalRevenue: 0,
  averageBookingValue: 0,
};

export default function BookingManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [stats, setStats] = useState<BookingStats>(initialStats);

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        adminBookingService.getAllBookings(),
        adminBookingService.getBookingStats(),
      ]);
      setBookings(data);
      setStats(statsData);
    } catch {
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

    setFilteredBookings(filtered);
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (newStatus === 'checked_in' && booking && booking.paymentStatus !== 'paid') {
      toast.error('Khách phải thanh toán đủ trước khi check-in/hoàn thành đơn');
      return;
    }

    const result = await adminBookingService.updateBooking(bookingId, { status: newStatus });
    if (result.success) {
      toast.success('Cập nhật trạng thái thành công!');
      loadBookings();
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
      loadBookings();
      setSelectedBooking(null);
    } else {
      toast.error(result.message || 'Không thể hủy đơn đặt phòng');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const getReadableBookingCode = (booking: Booking) => {
    const code = (booking.bookingCode || '').trim();
    if (!code) return '';

    const id = (booking.id || '').trim();
    const idPrefix = id ? id.slice(0, 8).toLowerCase() : '';
    const normalizedCode = code.toLowerCase();

    // Hide technical UUID-like or id-prefix fallback values from UI.
    const isUuidLike = /^[0-9a-f]{8}$/i.test(code) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(code);
    const isIdPrefixFallback = idPrefix && normalizedCode === idPrefix;

    if (isUuidLike || isIdPrefixFallback) return '';
    return code;
  };

  const getStatusBadge = (status: BookingStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700',
      checked_in: 'bg-green-100 text-green-700',
      checked_out: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending: 'Chờ thanh toán cọc',
      confirmed: 'Đã chấp nhận đặt phòng',
      completed: 'Hoàn thành',
      checked_in: 'Đã check-in',
      checked_out: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      deposit_paid: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-red-100 text-red-700',
    };

    const labels: Record<string, string> = {
      pending: 'Chưa thanh toán',
      deposit_paid: 'Đã cọc',
      paid: 'Đã thanh toán đủ',
      refunded: 'Đã hoàn tiền',
    };

    const safe = (status || 'pending') as string;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[safe] ?? 'bg-gray-100 text-gray-700'}`}>{labels[safe] ?? status}</span>;
  };

  const navItems = adminNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Admin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'bookings';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
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
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
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
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Đơn đặt phòng</h2>
                <p className="text-gray-600 text-sm">Xem và quản lý các đơn đặt phòng</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-5 h-5" />
              <span>Xuất báo cáo</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
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
                            {getReadableBookingCode(booking) && (
                              <p className="text-blue-600 font-medium">Mã đơn: {getReadableBookingCode(booking)}</p>
                            )}
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
                            <span>{booking.customerPhone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{booking.customerEmail || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{new Date(booking.checkInDate).toLocaleDateString('vi-VN')} - {new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}</span>
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

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-gray-600 text-sm">Tổng giá trị</p>
                            <p className="text-2xl font-bold text-gray-900">{(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫</p>
                            {booking.status === 'confirmed' && booking.paymentStatus !== 'paid' && (
                              <p className="text-xs text-orange-600 mt-1">Cần thanh toán đủ trước khi check-in/hoàn thành</p>
                            )}
                          </div>

                          {booking.status === 'pending' && (
                            <button
                              onClick={() => {
                                const reason = prompt('Lý do hủy đơn:');
                                if (reason) handleCancelBooking(booking.id, reason);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Hủy đơn</span>
                            </button>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'checked_in')}
                              disabled={booking.paymentStatus !== 'paid'}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{booking.paymentStatus === 'paid' ? 'Check-in' : 'Chờ thanh toán đủ'}</span>
                            </button>
                          )}
                          {booking.status === 'checked_in' && (
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'completed')}
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
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-2xl font-bold">Chi tiết đơn đặt phòng</h2>
                <p className="text-blue-100 text-sm">{selectedBooking.homestayName}</p>
                {getReadableBookingCode(selectedBooking) && (
                  <p className="text-blue-100/90 text-xs">Mã đơn: {getReadableBookingCode(selectedBooking)}</p>
                )}
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-600" />
                  Thông tin homestay
                </h3>
                <div className="flex gap-4">
                  <img
                    src={selectedBooking.homestayImage || 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400'}
                    alt={selectedBooking.homestayName}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{selectedBooking.homestayName}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Check-in: {new Date(selectedBooking.checkInDate).toLocaleDateString('vi-VN')}</p>
                      <p className="text-sm text-gray-600">Check-out: {new Date(selectedBooking.checkOutDate).toLocaleDateString('vi-VN')}</p>
                      <p className="text-sm text-gray-600">{selectedBooking.numberOfNights} đêm • {selectedBooking.numberOfGuests} khách</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Họ và tên</p>
                    <p className="font-medium text-gray-900">{selectedBooking.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedBooking.customerEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium text-gray-900">{selectedBooking.customerPhone || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Trạng thái đơn
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Trạng thái đơn</p>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  {selectedBooking.status !== 'pending' && (
                    <div>
                      <p className="text-sm text-gray-500">Thanh toán</p>
                      {getPaymentStatusBadge(selectedBooking.paymentStatus)}
                    </div>
                  )}
                  {selectedBooking.paymentMethod && (
                    <div>
                      <p className="text-sm text-gray-500">Phương thức thanh toán</p>
                      <p className="font-medium text-gray-900">{selectedBooking.paymentMethod.toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Chi tiết giá
                </h3>
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Giá mỗi đêm</span>
                    <span className="font-medium">{(selectedBooking.pricePerNight || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số đêm</span>
                    <span className="font-medium">{selectedBooking.numberOfNights} đêm</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Tổng cộng</span>
                      <span className="font-bold text-blue-600 text-lg">{(selectedBooking.totalPrice || 0).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Yêu cầu đặc biệt
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {selectedBooking.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Ghi chú
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedBooking.notes}</p>
                </div>
              )}

              {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Lý do hủy
                  </h3>
                  <p className="text-gray-700 bg-red-50 rounded-lg p-4 border border-red-200">{selectedBooking.cancellationReason}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Thời gian
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Ngày tạo</p>
                    <p className="font-medium text-gray-900">{new Date(selectedBooking.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  {selectedBooking.confirmedAt && (
                    <div>
                      <p className="text-gray-500">Ngày xác nhận</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.confirmedAt).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                  {selectedBooking.cancelledAt && (
                    <div>
                      <p className="text-gray-500">Ngày hủy</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.cancelledAt).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end">
              <button onClick={() => setSelectedBooking(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
