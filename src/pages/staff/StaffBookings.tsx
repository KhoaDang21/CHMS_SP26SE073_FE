import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Search,
  StickyNote,
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
import { buildDisplaySpecialRequests, extractBookingExperienceData } from '../../utils/bookingExperience';

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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [showExtraDetailModal, setShowExtraDetailModal] = useState(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCharges, setDetailCharges] = useState<ExtraCharge[]>([]);
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

  const handleAddNote = (booking: Booking) => {
    setSelectedBooking(booking);
    setNote(booking.notes || extractBookingExperienceData(booking.specialRequests).note || '');
    setShowNoteModal(true);
  };

  const handleViewExtraDetail = async (booking: Booking) => {
    setDetailBooking(booking);
    setShowExtraDetailModal(true);

    try {
      setDetailLoading(true);
      const list = await extraChargeService.listByBooking(booking.id);
      setDetailCharges(list);
    } catch (error) {
      console.error('Load extra charges error:', error);
      toast.error('Không thể tải chi tiết phát sinh');
      setDetailCharges([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveNote = () => {
    if (!selectedBooking) return;

    setBookings((prev) =>
      prev.map((item) =>
        item.id === selectedBooking.id
          ? {
              ...item,
              notes: note,
            }
          : item,
      ),
    );

    toast.success('Đã lưu ghi chú');
    setShowNoteModal(false);
    setNote('');
    setSelectedBooking(null);
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
  const totalDetailAmount = detailCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
                        {booking.status === 'confirmed' && booking.paymentStatus === 'pending' && (
                          <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium text-center">
                            Chờ khách thanh toán cọc
                          </div>
                        )}
                        <button
                          onClick={() => handleAddNote(booking)}
                          type="button"
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <StickyNote className="w-4 h-4" />
                          Ghi chú
                        </button>
                        <button
                          onClick={() => handleViewExtraDetail(booking)}
                          type="button"
                          className="px-4 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <ClipboardList className="w-4 h-4" />
                          Xem detail phát sinh
                        </button>
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

      {showNoteModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Thêm ghi chú</h3>
            </div>
            <div className="p-6">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowNoteModal(false)}
                type="button"
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNote}
                type="button"
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showExtraDetailModal && detailBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết phụ phí phát sinh</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {detailBooking.homestayName} · {detailBooking.customerName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowExtraDetailModal(false);
                  setDetailBooking(null);
                  setDetailCharges([]);
                }}
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              <div className="mb-4 p-4 rounded-lg bg-cyan-50 border border-cyan-100">
                <p className="text-sm text-cyan-800">Tổng phụ phí</p>
                <p className="text-2xl font-bold text-cyan-900 mt-1">{totalDetailAmount.toLocaleString('vi-VN')} VND</p>
              </div>

              {detailLoading ? (
                <div className="py-10 text-center text-gray-500">Đang tải chi tiết...</div>
              ) : detailCharges.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Booking này chưa có khoản phát sinh.</div>
              ) : (
                <div className="space-y-3">
                  {detailCharges.map((item, index) => (
                    <div key={item.id || `${detailBooking.id}-${index}`} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">Khoản #{index + 1}</p>
                        <p className="text-sm font-bold text-red-600">+{(Number(item.amount) || 0).toLocaleString('vi-VN')} VND</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{item.note || 'Không có mô tả'}</p>
                      {item.createdAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Tạo lúc: {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowExtraDetailModal(false);
                  setDetailBooking(null);
                  setDetailCharges([]);
                }}
                type="button"
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
