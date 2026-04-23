import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Search, Download, Menu, X, LogOut, Building2,
  CheckCircle, XCircle, Clock, DollarSign, Users, Home,
  User, Phone, Mail, FileText, AlertCircle, Eye,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { adminBookingService } from '../../services/adminBookingService';
import { Pagination } from '../../components/common/Pagination';
import type { Booking, BookingStatus, BookingStats } from '../../types/booking.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { buildDisplaySpecialRequests } from '../../utils/bookingExperience';

const initialStats: BookingStats = {
  total: 0, pending: 0, confirmed: 0, checkedIn: 0,
  checkedOut: 0, cancelled: 0, totalRevenue: 0, averageBookingValue: 0,
};

export default function BookingManagement() {
  const navigate = useNavigate();
  const pageSize = 10;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [stats, setStats] = useState<BookingStats>(initialStats);
  const [currentPage, setCurrentPage] = useState(1);

  const user = authService.getCurrentUser();

  useEffect(() => { loadBookings(); }, []);
  useEffect(() => { filterBookings(); }, [bookings, searchQuery, statusFilter, dateFilter]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFilter]);

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
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.bookingCode.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerEmail.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          b.homestayName.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter((b) => b.status === statusFilter);
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
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [filteredBookings.length, currentPage]);

  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (newStatus === 'checked_in' && booking && booking.paymentStatus !== 'paid') {
      toast.error('Khách phải thanh toán đủ trước khi check-in');
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

  const handleOpenDetail = async (booking: Booking) => {
    setDetailLoading(true);
    try {
      const detailedBooking = await adminBookingService.getBookingById(booking.id);
      if (detailedBooking) {
        const extraCharges = await adminBookingService.getExtraCharges(booking.id);
        setSelectedBooking({ ...detailedBooking, extraCharges });
      } else {
        setSelectedBooking(booking);
      }
    } catch (error) {
      console.error('Error loading booking detail:', error);
      setSelectedBooking(booking);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const result = await adminBookingService.updateBooking(bookingId, { status: 'cancelled' });
    if (result.success) {
      toast.success('Hủy đơn đặt phòng thành công!');
      loadBookings();
      setSelectedBooking(null);
    } else {
      toast.error(result.message || 'Không thể hủy đơn đặt phòng');
    }
  };

  const handleLogout = () => { authService.logout(); navigate('/auth/login'); };

  const getReadableBookingCode = (booking: Booking) => {
    const code = (booking.bookingCode || '').trim();
    if (!code) return '';
    const id = (booking.id || '').trim();
    const idPrefix = id ? id.slice(0, 8).toLowerCase() : '';
    const isUuidLike = /^[0-9a-f]{8}$/i.test(code) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(code);
    const isIdPrefixFallback = idPrefix && code.toLowerCase() === idPrefix;
    if (isUuidLike || isIdPrefixFallback) return '';
    return code;
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
      confirmed: 'Đã xác nhận',
      completed: 'Hoàn thành',
      checked_in: 'Đã check-in',
      checked_out: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getPaymentStatusBadge = (status: string, totalPrice: number, remainingAmount: number = 0) => {
    const styles: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 border border-orange-200',
      deposit_paid: 'bg-blue-100 text-blue-700 border border-blue-200',
      paid: 'bg-green-100 text-green-700 border border-green-200',
      refunded: 'bg-red-100 text-red-700 border border-red-200',
    };
    const labels: Record<string, string> = {
      pending: 'Chưa thanh toán',
      deposit_paid: 'Đã cọc',
      paid: 'Đã thanh toán đủ',
      refunded: 'Đã hoàn tiền',
    };
    const safe = status || 'pending';

    // Chỉ tính paidAmount khi thực sự đã có thanh toán
    const paidAmount = safe === 'pending' ? 0 : (totalPrice - remainingAmount);
    const percentage = (safe === 'pending' || totalPrice <= 0) ? 0 : Math.round((paidAmount / totalPrice) * 100);

    return (
      <div className="flex flex-col gap-1.5">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center ${styles[safe] ?? 'bg-gray-100 text-gray-700'}`}>
          {labels[safe] ?? status}
        </span>
        {safe !== 'paid' && safe !== 'refunded' && totalPrice > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
              <div
                className={`h-full transition-all duration-500 ${safe === 'deposit_paid' ? 'bg-blue-500' : 'bg-orange-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-500">{percentage}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}>
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
        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar isAdminMode={true} />
        </nav>
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
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quản lý Đơn đặt phòng</h2>
                <p className="text-gray-500 text-xs">Xem và quản lý các đơn đặt phòng</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Download className="w-4 h-4" />
              <span>Xuất báo cáo</span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tổng đơn', value: stats.total, icon: Calendar, color: 'blue' },
              { label: 'Chờ thanh toán cọc', value: stats.pending, icon: Clock, color: 'yellow' },
              { label: 'Đã xác nhận', value: stats.confirmed, icon: CheckCircle, color: 'green' },
              { label: 'Tổng doanh thu', value: `${(stats.totalRevenue / 1000000).toFixed(1)}M ₫`, icon: DollarSign, color: 'purple' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-${color}-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Tìm theo mã đơn, tên, email, SĐT, homestay..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ thanh toán cọc</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Lọc theo ngày check-in hoặc check-out"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Hiển thị <span className="font-semibold text-gray-700">{filteredBookings.length}</span> / {stats.total} đơn
            </p>
          </div>

          {/* Booking List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Đang tải...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không tìm thấy đơn đặt phòng nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Image */}
                      {booking.homestayImage && (
                        <div className="flex-shrink-0">
                          <img src={booking.homestayImage} alt={booking.homestayName}
                            className="w-full lg:w-40 h-36 object-cover rounded-lg" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 flex flex-col gap-3">
                        {/* Row 1: Homestay name + badges + Chi tiết button */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-gray-900 truncate">{booking.homestayName}</h3>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(booking.status)}
                                {booking.status !== 'pending' && getPaymentStatusBadge(booking.paymentStatus, booking.totalPrice, booking.remainingAmount)}
                              </div>
                            </div>
                            {getReadableBookingCode(booking) && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">Mã đơn: {getReadableBookingCode(booking)}</p>
                            )}
                          </div>
                          <button onClick={() => handleOpenDetail(booking)} disabled={detailLoading}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm disabled:opacity-50">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{detailLoading ? 'Tải...' : 'Chi tiết'}</span>
                          </button>
                        </div>

                        {/* Row 2: 2 cột cố định — trái: khách hàng, phải: lịch */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          {/* Cột trái: tên */}
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate font-medium">{booking.customerName}</span>
                          </div>
                          {/* Cột phải: ngày */}
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {new Date(booking.checkInDate).toLocaleDateString('vi-VN')} → {new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          {/* Cột trái: SĐT */}
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-800">{booking.customerPhone || <span className="text-gray-400 italic text-xs">Chưa có SĐT</span>}</span>
                          </div>
                          {/* Cột phải: số đêm + khách */}
                          <div className="flex items-center gap-3 text-gray-600">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {booking.numberOfNights} đêm
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {booking.numberOfGuests} khách
                            </span>
                          </div>
                          {/* Cột trái: Email (span 2 cols) */}
                          {booking.customerEmail && (
                            <div className="flex items-center gap-2 text-gray-600 col-span-2">
                              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{booking.customerEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Row 3: Giá + action buttons */}
                        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-gray-100">
                          {/* Price pills — logic theo paymentStatus */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Tổng tiền luôn hiện */}
                            <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5 border border-gray-200">
                              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-xs text-gray-500">Tổng</span>
                              <span className="text-sm font-bold text-gray-900">{(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫</span>
                            </div>

                            {/* pending: chưa trả gì → hiện cần cọc */}
                            {booking.paymentStatus === 'pending' && booking.depositAmount !== undefined && booking.depositAmount > 0 && (
                              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
                                <Clock className="w-3.5 h-3.5 text-yellow-600" />
                                <span className="text-xs text-yellow-700">Cần cọc</span>
                                <span className="text-sm font-bold text-yellow-700">{booking.depositAmount.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            )}

                            {/* deposit_paid: đã cọc → hiện đã cọc + còn nợ */}
                            {booking.paymentStatus === 'deposit_paid' && (
                              <>
                                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="text-xs text-blue-700">Đã cọc</span>
                                  <span className="text-sm font-bold text-blue-700">{(booking.depositAmount || 0).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                {booking.remainingAmount !== undefined && booking.remainingAmount > 0 && (
                                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                                    <span className="text-xs text-orange-700">Còn nợ</span>
                                    <span className="text-sm font-bold text-orange-700">{booking.remainingAmount.toLocaleString('vi-VN')} ₫</span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* paid: đã trả đủ */}
                            {booking.paymentStatus === 'paid' && (
                              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-xs text-green-700">Đã thanh toán đủ</span>
                              </div>
                            )}

                            {/* refunded */}
                            {booking.paymentStatus === 'refunded' && (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-red-700">Đã hoàn tiền</span>
                              </div>
                            )}

                            {booking.discountAmount !== undefined && booking.discountAmount > 0 && (
                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Giảm</span>
                                <span className="text-xs font-bold text-green-600">-{booking.discountAmount.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {booking.status === 'pending' && (
                              <button onClick={() => handleCancelBooking(booking.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Hủy đơn</span>
                              </button>
                            )}
                            {booking.status === 'confirmed' && (
                              <button onClick={() => handleUpdateStatus(booking.id, 'checked_in')}
                                disabled={booking.paymentStatus !== 'paid'}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{booking.paymentStatus === 'paid' ? 'Check-in' : 'Chờ TT đủ'}</span>
                              </button>
                            )}
                            {booking.status === 'checked_in' && (
                              <button onClick={() => handleUpdateStatus(booking.id, 'completed')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Hoàn thành</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredBookings.length / pageSize))}
            totalItems={filteredBookings.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Detail Modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-start justify-between text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold">Chi tiết đơn đặt phòng</h2>
                <p className="text-blue-100 text-sm">{selectedBooking.homestayName}</p>
                {getReadableBookingCode(selectedBooking) && (
                  <p className="text-blue-200 text-xs mt-0.5">Mã đơn: {getReadableBookingCode(selectedBooking)}</p>
                )}
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Homestay info */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-500" /> Thông tin homestay
                </h3>
                <div className="flex gap-4">
                  {selectedBooking.homestayImage ? (
                    <img src={selectedBooking.homestayImage} alt={selectedBooking.homestayName}
                      className="w-28 h-24 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-28 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Home className="w-7 h-7 text-gray-300" />
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-gray-900">{selectedBooking.homestayName}</p>
                    <p className="text-gray-600">Check-in: <span className="font-medium text-gray-800">{new Date(selectedBooking.checkInDate).toLocaleDateString('vi-VN')}</span></p>
                    <p className="text-gray-600">Check-out: <span className="font-medium text-gray-800">{new Date(selectedBooking.checkOutDate).toLocaleDateString('vi-VN')}</span></p>
                    <p className="text-gray-600">{selectedBooking.numberOfNights} đêm · {selectedBooking.numberOfGuests} khách</p>
                  </div>
                </div>
              </section>

              {/* Customer info */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                      : <p className="text-gray-400 italic text-xs">Không có thông tin</p>
                    }
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
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Trạng thái
                </h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <p className="text-gray-400 text-xs mb-1.5">Đơn đặt phòng</p>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  {selectedBooking.status !== 'pending' && (
                    <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px]">
                      <p className="text-gray-400 text-xs mb-1.5">Thanh toán</p>
                      {getPaymentStatusBadge(selectedBooking.paymentStatus, selectedBooking.totalPrice, selectedBooking.remainingAmount)}
                    </div>
                  )}
                  {selectedBooking.paymentMethod && (
                    <div className="bg-gray-50 rounded-lg p-3 flex-1 min-w-[120px]">
                      <p className="text-gray-400 text-xs mb-1">Phương thức</p>
                      <p className="font-medium text-gray-900">{selectedBooking.paymentMethod.toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Price breakdown */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" /> Chi tiết thanh toán
                  </h3>
                  {selectedBooking.paymentStatus !== 'pending' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Tiến độ:</span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.round(((selectedBooking.totalPrice - (selectedBooking.remainingAmount || 0)) / selectedBooking.totalPrice) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Giá phòng ({selectedBooking.numberOfNights} đêm)</span>
                    <span className="font-medium text-gray-900">{(selectedBooking.pricePerNight * selectedBooking.numberOfNights).toLocaleString('vi-VN')} ₫</span>
                  </div>

                  {selectedBooking.discountAmount !== undefined && selectedBooking.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Giảm giá
                      </span>
                      <span className="font-bold text-green-600">-{(selectedBooking.discountAmount).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 uppercase">Tổng cộng</span>
                    <span className="text-lg font-black text-blue-600">{(selectedBooking.totalPrice).toLocaleString('vi-VN')} ₫</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Đã thanh toán — chỉ hiện khi thực sự có thanh toán */}
                    {selectedBooking.paymentStatus === 'pending' ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 col-span-2">
                        <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Cần cọc</p>
                        <p className="text-sm font-black text-yellow-700">
                          {(selectedBooking.depositAmount || 0).toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-green-100/50 border border-green-200 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Đã thanh toán</p>
                          <p className="text-sm font-black text-green-700">
                            {(selectedBooking.totalPrice - (selectedBooking.remainingAmount || 0)).toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                        {selectedBooking.remainingAmount !== undefined && selectedBooking.remainingAmount > 0 && (
                          <div className="bg-orange-100/50 border border-orange-200 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Còn nợ</p>
                            <p className="text-sm font-black text-orange-700">
                              {selectedBooking.remainingAmount.toLocaleString('vi-VN')} ₫
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Extra charges */}
              {selectedBooking.extraCharges && selectedBooking.extraCharges.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" /> Phí thêm
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedBooking.extraCharges.map((charge) => (
                      <div key={charge.id} className="flex justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                        <span className="text-red-700">{charge.description || 'Phí khác'}</span>
                        <span className="font-semibold text-red-600">+{(charge.amount || 0).toLocaleString('vi-VN')} ₫</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-sm pt-1">
                      <span>Tổng phí thêm</span>
                      <span className="text-red-600">+{selectedBooking.extraCharges.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Booked experiences */}
              {selectedBooking.bookedExperiences && selectedBooking.bookedExperiences.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" /> Dịch vụ trải nghiệm
                  </h3>
                  <div className="space-y-2">
                    {selectedBooking.bookedExperiences.map((exp) => (
                      <div key={exp.id} className="border border-purple-100 rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-gray-900">{exp.experienceName}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${exp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {exp.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-gray-600 text-xs">
                          <span>SL: {exp.quantity}</span>
                          <span>Ngày: {new Date(exp.serviceDate).toLocaleDateString('vi-VN')}</span>
                          <span>Đơn giá: {exp.unitPrice.toLocaleString('vi-VN')} ₫</span>
                          <span className="font-semibold text-gray-800">Thành tiền: {exp.totalPrice.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Special requests */}
              {selectedBooking.specialRequests && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> Yêu cầu đặc biệt
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {buildDisplaySpecialRequests(selectedBooking.specialRequests)}
                  </p>
                </section>
              )}

              {/* Notes */}
              {selectedBooking.notes && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" /> Ghi chú
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">{selectedBooking.notes}</p>
                </section>
              )}

              {/* Cancellation reason */}
              {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" /> Lý do hủy
                  </h3>
                  <p className="text-gray-700 bg-red-50 rounded-lg p-3 text-sm border border-red-100">{selectedBooking.cancellationReason}</p>
                </section>
              )}

              {/* Timestamps */}
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Thời gian
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Ngày tạo</p>
                    <p className="font-medium text-gray-900">{new Date(selectedBooking.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  {selectedBooking.confirmedAt && (
                    <div>
                      <p className="text-gray-400 text-xs">Ngày xác nhận</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.confirmedAt).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                  {selectedBooking.cancelledAt && (
                    <div>
                      <p className="text-gray-400 text-xs">Ngày hủy</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.cancelledAt).toLocaleString('vi-VN')}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
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
