import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  Home,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Search,
  Ticket,
  Users,
  X,
  LayoutDashboard,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { staffBookingService } from '../../services/staffBookingService';
import { extraChargeService, type ExtraCharge } from '../../services/extraChargeService';
import { Pagination } from '../../components/common/Pagination';
import type { Booking } from '../../types/booking.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { toast } from 'sonner';
import { CheckoutInspectionModal } from '../../components/staff/CheckoutInspectionModal';
import { buildDisplaySpecialRequests } from '../../utils/bookingExperience';
import { invoiceService, type Invoice } from '../../services/invoiceService';

type FilterStatus = 'all' | 'checkin-today' | 'checkout-today' | 'confirmed' | 'completed';

const dateKey = (value: string) => new Date(value).toISOString().split('T')[0];

export default function StaffBookings() {
  const navigate = useNavigate();
  const pageSize = 10;
  const currentUser = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [showBookingDetailModal, setShowBookingDetailModal] = useState(false);
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [bookingDetailChargeLoading, setBookingDetailChargeLoading] = useState(false);
  const [bookingDetailCharges, setBookingDetailCharges] = useState<ExtraCharge[]>([]);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await staffBookingService.getAllBookings();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Không thể tải danh sách booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];
    const today = new Date().toISOString().split('T')[0];

    if (filterStatus !== 'all') {
      if (filterStatus === 'checkin-today') {
        filtered = filtered.filter((b) => dateKey(b.checkInDate) === today && b.status === 'confirmed');
      } else if (filterStatus === 'checkout-today') {
        filtered = filtered.filter((b) => dateKey(b.checkOutDate) === today && b.status === 'checked_in');
      } else if (filterStatus === 'confirmed') {
        filtered = filtered.filter((b) => b.status === 'confirmed' || b.status === 'checked_in');
      } else {
        filtered = filtered.filter((b) => b.status === 'completed' || b.status === 'checked_out');
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customerName.toLowerCase().includes(term) ||
          b.homestayName.toLowerCase().includes(term) ||
          b.id.toLowerCase().includes(term) ||
          b.bookingCode.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [bookings, searchTerm, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredBookings.length, currentPage]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage]);

  const handleCheckIn = async (booking: Booking) => {
    if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'deposit_paid') {
      toast.error('Khách phải thanh toán cọc trước khi check-in');
      return;
    }

    try {
      const result = await staffBookingService.checkIn(booking.id);
      if (!result.success) {
        toast.error(result.message || 'Không thể check-in booking');
        return;
      }
      toast.success(`Check-in thành công: ${booking.customerName}`);
      await loadBookings();
    } catch (error) {
      console.error('Check-in booking error:', error);
      toast.error('Không thể check-in booking');
    }
  };

  const handleCheckOut = (booking: Booking) => {
    setCheckoutBooking(booking);
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckout = async (payload: { note: string; extraChargeAmount: number }) => {
    if (!checkoutBooking) return;

    try {
      setCheckoutSubmitting(true);

      if (payload.extraChargeAmount > 0) {
        const chargeResult = await extraChargeService.create({
          bookingId: checkoutBooking.id,
          amount: payload.extraChargeAmount,
          note: payload.note,
        });

        if (!chargeResult.success) {
          toast.error(chargeResult.message || 'Không thể lưu phí phát sinh');
          return;
        }
      }

      const checkoutResult = await staffBookingService.checkOut(checkoutBooking.id);
      if (!checkoutResult.success) {
        toast.error(checkoutResult.message || 'Không thể checkout booking');
        return;
      }

      toast.success(`Đã hoàn tất kiểm phòng và checkout: ${checkoutBooking.customerName}`);
      setShowCheckoutModal(false);
      setCheckoutBooking(null);
      await loadBookings();
    } catch (error) {
      console.error('Check-out booking error:', error);
      toast.error('Không thể hoàn tất checkout');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleViewBookingDetail = async (booking: Booking) => {
    setShowBookingDetailModal(true);
    setBookingDetailLoading(true);
    setBookingDetailChargeLoading(true);
    setBookingDetail(booking);
    setBookingDetailCharges([]);

    try {
      const [detail, charges] = await Promise.all([
        staffBookingService.getBookingById(booking.id),
        extraChargeService.listByBooking(booking.id),
      ]);
      setBookingDetail(detail || booking);
      setBookingDetailCharges(charges);
    } catch (error) {
      console.error('Load booking detail error:', error);
      toast.error('Không thể tải chi tiết booking');
      setBookingDetail(booking);
      setBookingDetailCharges([]);
    } finally {
      setBookingDetailLoading(false);
      setBookingDetailChargeLoading(false);
    }
  };

  const canExtendStay = (booking: Booking) => booking.status === 'checked_in';

  const openExtendModal = (booking: Booking) => {
    if (!canExtendStay(booking)) {
      toast.error('Chỉ có thể gia hạn khi booking đã check-in');
      return;
    }

    const currentCheckOut = new Date(booking.checkOutDate);
    currentCheckOut.setDate(currentCheckOut.getDate() + 1);
    const suggestedDate = currentCheckOut.toISOString().split('T')[0];

    setExtendBooking(booking);
    setNewCheckOutDate(suggestedDate);
    setShowExtendModal(true);
  };

  const hasBookingOverlap = (target: Booking, nextCheckOutDate: string) => {
    const targetStart = new Date(target.checkInDate);
    const targetEnd = new Date(nextCheckOutDate);

    return bookings.some((item) => {
      if (item.id === target.id) return false;
      if (item.homestayId !== target.homestayId) return false;
      if (item.status === 'cancelled') return false;

      const otherStart = new Date(item.checkInDate);
      const otherEnd = new Date(item.checkOutDate);

      return targetStart < otherEnd && targetEnd > otherStart;
    });
  };

  const handleConfirmExtend = async () => {
    if (!extendBooking) return;

    if (!canExtendStay(extendBooking)) {
      toast.error('Chỉ có thể gia hạn khi booking đã check-in');
      return;
    }

    const currentCheckOut = new Date(extendBooking.checkOutDate);
    const nextCheckOut = new Date(newCheckOutDate);

    if (Number.isNaN(nextCheckOut.getTime())) {
      toast.error('Ngày checkout mới không hợp lệ');
      return;
    }

    if (nextCheckOut <= currentCheckOut) {
      toast.error('Ngày checkout mới phải sau ngày checkout hiện tại');
      return;
    }

    if (hasBookingOverlap(extendBooking, newCheckOutDate)) {
      toast.error('Không thể gia hạn vì bị trùng lịch với booking khác của homestay này');
      return;
    }

    try {
      setExtendSubmitting(true);
      const result = await staffBookingService.extend(extendBooking.id, { newCheckOutDate });
      if (result?.success === false) {
        toast.error(result.message || 'Không thể gia hạn booking');
        return;
      }

      toast.success('Gia hạn ngày ở thành công');
      setShowExtendModal(false);
      setExtendBooking(null);
      setNewCheckOutDate('');
      await loadBookings();
    } catch (error) {
      console.error('Extend booking error:', error);
      toast.error('Không thể gia hạn booking');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const canExportInvoice = (booking: Booking) =>
    booking.status === 'checked_out' || booking.status === 'completed';

  const handleOpenInvoiceModal = async (booking: Booking) => {
    setSelectedInvoiceBooking(booking);
    setShowInvoiceModal(true);
    setInvoiceLoading(true);
    setInvoiceData(null);

    try {
      const invoice = await invoiceService.getInvoice(booking.id);
      if (!invoice) {
        toast.error('Chưa lấy được dữ liệu hóa đơn cho booking này');
        return;
      }
      setInvoiceData(invoice);
    } catch (error) {
      console.error('Open invoice modal error:', error);
      toast.error('Không thể tải thông tin hóa đơn');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!selectedInvoiceBooking) return;

    setInvoiceDownloading(true);
    try {
      const blob = await invoiceService.downloadInvoice(selectedInvoiceBooking.id);
      if (!blob) {
        toast.error('Không thể tải file hóa đơn');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `invoice-${invoiceData?.bookingCode || selectedInvoiceBooking.bookingCode || selectedInvoiceBooking.id}.pdf`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Đã tải hóa đơn thành công');
    } catch (error) {
      console.error('Download invoice error:', error);
      toast.error('Không thể tải hóa đơn');
    } finally {
      setInvoiceDownloading(false);
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!selectedInvoiceBooking) return;

    setInvoiceSending(true);
    try {
      const result = await invoiceService.sendInvoiceEmail(selectedInvoiceBooking.id);
      if (!result.success) {
        toast.error(result.message || 'Không thể gửi hóa đơn qua email');
        return;
      }

      toast.success(result.message || 'Đã gửi hóa đơn qua email');
    } catch (error) {
      console.error('Send invoice email error:', error);
      toast.error('Không thể gửi hóa đơn qua email');
    } finally {
      setInvoiceSending(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard', active: false },
    { name: 'Bookings', icon: Calendar, path: '/staff/bookings', active: true },
    { name: 'Reviews', icon: MessageSquare, path: '/staff/reviews', active: false },
    { name: 'Tickets', icon: Ticket, path: '/staff/tickets', active: false },
  ];

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all',           label: 'Tất cả' },
    { value: 'checkin-today', label: 'Check-in hôm nay' },
    { value: 'checkout-today',label: 'Check-out hôm nay' },
    { value: 'confirmed',     label: 'Đã xác nhận/Đang lưu trú' },
    { value: 'completed',     label: 'Đã hoàn thành' },
  ];

  const getStatusBadge = (status: Booking['status']) => {
    const badges = {
      pending:     { label: 'Chờ thanh toán cọc', class: 'bg-yellow-100 text-yellow-700' },
      confirmed:   { label: 'Đã chấp nhận đặt phòng', class: 'bg-blue-100 text-blue-700' },
      completed:   { label: 'Hoàn thành',         class: 'bg-gray-100 text-gray-700' },
      checked_in:  { label: 'Đã check-in',        class: 'bg-green-100 text-green-700' },
      checked_out: { label: 'Hoàn thành',         class: 'bg-gray-100 text-gray-700' },
      cancelled:   { label: 'Đã hủy',             class: 'bg-red-100 text-red-700' },
    };
    const badge = badges[status] ?? badges.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.class}`}>{badge.label}</span>;
  };

  // Flow nghiệp vụ: confirmed + paid -> checked_in; checked_in -> completed.
  const canCheckIn = (booking: Booking) =>
    booking.status === 'confirmed' && (booking.paymentStatus === 'paid' || booking.paymentStatus === 'deposit_paid');
  const canCheckOut = (booking: Booking) => booking.status === 'checked_in';
  const totalBookingDetailAmount = bookingDetailCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className="text-xs text-cyan-200">Staff Portal</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name ?? 'Staff'}</p>
                <RoleBadge role={currentUser?.role || 'staff'} size="sm" />
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active ? 'bg-white/20 text-white font-medium' : 'text-cyan-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-cyan-500/30">
            <button
              onClick={handleLogout}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quản lý Bookings</h2>
                <p className="text-sm text-gray-500">Check-in/Check-out khách hàng</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative" type="button">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên khách, homestay, mã booking..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterStatus(option.value)}
                    type="button"
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      filterStatus === option.value ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Không tìm thấy booking nào</p>
              <p className="text-gray-500 text-sm">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{booking.homestayName}</h3>
                              {getStatusBadge(booking.status)}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {booking.customerName}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <ArrowDownRight className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Check-in:</span>
                            <span>{new Date(booking.checkInDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <ArrowUpRight className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">Check-out:</span>
                            <span>{new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{booking.numberOfGuests} khách</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{booking.customerPhone || '-'}</span>
                          </div>
                        </div>

                        {(booking.notes || booking.specialRequests) && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-900">
                              <strong>Ghi chú:</strong> {booking.notes || buildDisplaySpecialRequests(booking.specialRequests)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 lg:w-48">
                        <button
                          onClick={() => handleViewBookingDetail(booking)}
                          type="button"
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <ClipboardList className="w-4 h-4" />
                          Chi tiết booking
                        </button>
                        {canCheckIn(booking) && (
                          <button
                            onClick={() => handleCheckIn(booking)}
                            type="button"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            {booking.paymentStatus === 'deposit_paid' ? 'Xác nhận tiền mặt & check-in' : 'Check-in'}
                          </button>
                        )}
                        {canCheckOut(booking) && (
                          <button
                            onClick={() => handleCheckOut(booking)}
                            type="button"
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            Kiểm tra phòng & checkout
                          </button>
                        )}
                        {canExtendStay(booking) && (
                          <button
                            onClick={() => openExtendModal(booking)}
                            type="button"
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            Gia hạn ngày ở
                          </button>
                        )}
                        {canExportInvoice(booking) && (
                          <button
                            onClick={() => void handleOpenInvoiceModal(booking)}
                            type="button"
                            className="px-4 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Xuất bill
                          </button>
                        )}
                        {booking.status === 'confirmed' && booking.paymentStatus === 'pending' && (
                          <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium text-center">
                            Chờ khách thanh toán cọc
                          </div>
                        )}
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
        </main>
      </div>

      <CheckoutInspectionModal
        open={showCheckoutModal}
        booking={checkoutBooking}
        onClose={() => {
          setShowCheckoutModal(false);
          setCheckoutBooking(null);
        }}
        onConfirm={handleConfirmCheckout}
        submitting={checkoutSubmitting}
      />

      {showBookingDetailModal && bookingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết booking</h3>
                <p className="text-sm text-gray-600 mt-1">{bookingDetail.homestayName} · {bookingDetail.customerName}</p>
              </div>
              <button
                onClick={() => {
                  setShowBookingDetailModal(false);
                  setBookingDetail(null);
                }}
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              {bookingDetailLoading ? (
                <div className="py-10 text-center text-gray-500">Đang tải chi tiết...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Mã booking</div>
                      <div className="font-semibold text-gray-900 mt-1">{bookingDetail.bookingCode || bookingDetail.id}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Mã hệ thống</div>
                      <div className="font-semibold text-gray-900 mt-1 break-all">{bookingDetail.id}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Trạng thái</div>
                      <div className="font-semibold text-gray-900 mt-1">{bookingDetail.status}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Thanh toán</div>
                      <div className="font-semibold text-gray-900 mt-1">{bookingDetail.paymentStatus}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Check-in</div>
                      <div className="font-semibold text-gray-900 mt-1">{new Date(bookingDetail.checkInDate).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Check-out</div>
                      <div className="font-semibold text-gray-900 mt-1">{new Date(bookingDetail.checkOutDate).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Số khách</div>
                      <div className="font-semibold text-gray-900 mt-1">{bookingDetail.numberOfGuests} khách</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Số điện thoại</div>
                      <div className="font-semibold text-gray-900 mt-1">{bookingDetail.customerPhone || '-'}</div>
                    </div>
                  </div>

                  {(bookingDetail.notes || bookingDetail.specialRequests) && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                      <div className="text-sm font-semibold text-yellow-900 mb-1">Ghi chú / yêu cầu đặc biệt</div>
                      <div className="text-sm text-yellow-900 whitespace-pre-wrap">
                        {bookingDetail.notes || buildDisplaySpecialRequests(bookingDetail.specialRequests)}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-cyan-900">Chi tiết phụ phí phát sinh</h4>
                      <span className="text-sm font-bold text-cyan-900">Tổng: {totalBookingDetailAmount.toLocaleString('vi-VN')} VND</span>
                    </div>

                    {bookingDetailChargeLoading ? (
                      <div className="text-sm text-gray-500">Đang tải phát sinh...</div>
                    ) : bookingDetailCharges.length === 0 ? (
                      <div className="text-sm text-gray-500">Booking này chưa có khoản phát sinh.</div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-auto pr-1">
                        {bookingDetailCharges.map((item, index) => (
                          <div key={item.id || `${bookingDetail.id}-${index}`} className="bg-white border border-cyan-100 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-gray-900">Khoản #{index + 1}</p>
                              <p className="text-sm font-bold text-red-600">+{(Number(item.amount) || 0).toLocaleString('vi-VN')} VND</p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{item.note || 'Không có mô tả'}</p>
                            {item.createdAt && (
                              <p className="text-xs text-gray-500 mt-1">Tạo lúc: {new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                {canExportInvoice(bookingDetail) && (
                  <button
                    onClick={() => void handleOpenInvoiceModal(bookingDetail)}
                    type="button"
                    className="sm:w-auto w-full px-4 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Xem / Xuất bill
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowBookingDetailModal(false);
                    setBookingDetail(null);
                  }}
                  type="button"
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && selectedInvoiceBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Hóa đơn booking</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedInvoiceBooking.homestayName} · {selectedInvoiceBooking.customerName}
                </p>
              </div>
              <button
                onClick={() => {
                  if (invoiceSending || invoiceDownloading) return;
                  setShowInvoiceModal(false);
                  setSelectedInvoiceBooking(null);
                  setInvoiceData(null);
                }}
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              {invoiceLoading ? (
                <div className="py-10 text-center text-gray-500">Đang tải hóa đơn...</div>
              ) : !invoiceData ? (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  Không tìm thấy dữ liệu hóa đơn cho booking này.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Mã invoice</div>
                      <div className="font-semibold text-gray-900 mt-1 break-all">{invoiceData.id}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Mã booking</div>
                      <div className="font-semibold text-gray-900 mt-1">{invoiceData.bookingCode || invoiceData.bookingId}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Check-in</div>
                      <div className="font-semibold text-gray-900 mt-1">{invoiceData.checkIn ? new Date(invoiceData.checkIn).toLocaleDateString('vi-VN') : '-'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Check-out</div>
                      <div className="font-semibold text-gray-900 mt-1">{invoiceData.checkOut ? new Date(invoiceData.checkOut).toLocaleDateString('vi-VN') : '-'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-gray-500">Trạng thái thanh toán</div>
                      <div className="font-semibold text-gray-900 mt-1">{invoiceData.paymentStatus || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3">
                      <div className="text-cyan-700">Tổng tiền</div>
                      <div className="font-bold text-cyan-900 mt-1 text-lg">{(invoiceData.totalAmount || 0).toLocaleString('vi-VN')} VND</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Tạm tính</span>
                        <span className="font-medium text-gray-900">{(invoiceData.subtotal || 0).toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Giảm giá</span>
                        <span className="font-medium text-gray-900">-{(invoiceData.discountAmount || 0).toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Thuế / phí</span>
                        <span className="font-medium text-gray-900">{(invoiceData.tax || 0).toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Tổng thanh toán</span>
                        <span className="font-bold text-gray-900">{(invoiceData.totalAmount || 0).toLocaleString('vi-VN')} VND</span>
                      </div>
                    </div>
                  </div>

                  {invoiceData.notes && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
                      <span className="font-semibold">Ghi chú: </span>
                      {invoiceData.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => void handleDownloadInvoice()}
                type="button"
                disabled={invoiceLoading || invoiceDownloading || !invoiceData}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {invoiceDownloading ? 'Đang tải...' : 'Tải PDF'}
              </button>
              <button
                onClick={() => void handleSendInvoiceEmail()}
                type="button"
                disabled={invoiceLoading || invoiceSending || !invoiceData}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                {invoiceSending ? 'Đang gửi...' : 'Gửi qua email'}
              </button>
              <button
                onClick={() => {
                  if (invoiceSending || invoiceDownloading) return;
                  setShowInvoiceModal(false);
                  setSelectedInvoiceBooking(null);
                  setInvoiceData(null);
                }}
                type="button"
                className="sm:w-auto w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtendModal && extendBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Gia hạn ngày ở</h3>
              <p className="text-sm text-gray-600 mt-1">
                {extendBooking.homestayName} · {extendBooking.customerName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                Checkout hiện tại: <span className="font-semibold">{new Date(extendBooking.checkOutDate).toLocaleDateString('vi-VN')}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ngày checkout mới</label>
                <input
                  type="date"
                  value={newCheckOutDate}
                  min={new Date(extendBooking.checkOutDate).toISOString().split('T')[0]}
                  onChange={(e) => setNewCheckOutDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <p className="text-xs text-gray-500">
                Hệ thống sẽ kiểm tra trùng lịch với booking khác của cùng homestay trước khi gia hạn.
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  if (extendSubmitting) return;
                  setShowExtendModal(false);
                  setExtendBooking(null);
                  setNewCheckOutDate('');
                }}
                type="button"
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmExtend}
                disabled={extendSubmitting || !newCheckOutDate}
                type="button"
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {extendSubmitting ? 'Đang gia hạn...' : 'Xác nhận gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
