import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Home,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { staffBookingService } from '../../services/staffBookingService';
import { extraChargeService } from '../../services/extraChargeService';
import type { Booking } from '../../types/booking.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { staffNavItemsGrouped } from '../../config/staffNavItems';
import { toast } from 'sonner';
import { CheckoutInspectionModal } from '../../components/staff/CheckoutInspectionModal';
import BackofficeNotificationBell from '../../components/common/BackofficeNotificationBell';

interface DashboardStats {
  todayCheckIns: number;
  todayCheckOuts: number;
  currentOccupancy: number;
  pendingTasks: number;
}

interface TodayTask {
  id: string;
  bookingId: string;
  paymentStatus: Booking['paymentStatus'];
  type: 'checkin' | 'checkout' | 'cleaning' | 'maintenance';
  title: string;
  time: string;
  room: string;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

const dateKey = (value: string) => new Date(value).toISOString().split('T')[0];

export default function StaffDashboard() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await staffBookingService.getAllBookings();
      setBookings(data);

      const today = new Date().toISOString().split('T')[0];
      const checkIns = data.filter((b) => dateKey(b.checkInDate) === today && b.status === 'confirmed');
      const checkOuts = data.filter((b) => dateKey(b.checkOutDate) === today && b.status === 'checked_in');

      const tasks: TodayTask[] = [
        ...checkIns.map((b) => ({
          id: `checkin-${b.id}`,
          bookingId: b.id,
          paymentStatus: b.paymentStatus,
          type: 'checkin' as const,
          title: `Check-in: ${b.customerName}`,
          time: '14:00',
          room: b.homestayName,
          status: 'pending' as const,
          priority: 'high' as const,
        })),
        ...checkOuts.map((b) => ({
          id: `checkout-${b.id}`,
          bookingId: b.id,
          paymentStatus: b.paymentStatus,
          type: 'checkout' as const,
          title: `Check-out: ${b.customerName}`,
          time: '12:00',
          room: b.homestayName,
          status: 'pending' as const,
          priority: 'high' as const,
        })),
      ];

      setTodayTasks(tasks.slice(0, 8));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = bookings.filter((b) => dateKey(b.checkInDate) === today && b.status === 'confirmed').length;
    const todayCheckOuts = bookings.filter((b) => dateKey(b.checkOutDate) === today && b.status === 'checked_in').length;
    const currentOccupancy = bookings.filter((b) => b.status === 'checked_in').length;
    const pendingTasks = todayTasks.filter((t) => t.status === 'pending').length;
    return { todayCheckIns, todayCheckOuts, currentOccupancy, pendingTasks };
  }, [bookings, todayTasks]);

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const handleCompleteTask = async (task: TodayTask) => {
    try {
      if (task.type === 'checkin' && task.paymentStatus !== 'paid' && task.paymentStatus !== 'deposit_paid') {
        toast.error('Khách phải thanh toán cọc trước khi check-in');
        return;
      }

      if (task.type === 'checkout') {
        const booking = bookings.find((item) => item.id === task.bookingId) ?? null;
        if (!booking) {
          toast.error('Không tìm thấy booking để kiểm phòng');
          return;
        }

        setCheckoutBooking(booking);
        setShowCheckoutModal(true);
        return;
      }

      if (task.type === 'checkin') {
        const checkInResult = await staffBookingService.checkIn(task.bookingId);
        if (!checkInResult.success) {
          toast.error(checkInResult.message || 'Không thể check-in booking');
          return;
        }
      }

      setTodayTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: 'completed' } : item)));
      toast.success('Đã hoàn thành công việc!');
      await loadDashboardData();
    } catch (error) {
      console.error('Complete task error:', error);
      toast.error('Không thể cập nhật trạng thái booking');
    }
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

      setTodayTasks((prev) => prev.map((item) => (item.bookingId === checkoutBooking.id ? { ...item, status: 'completed' } : item)));
      toast.success(`Đã hoàn tất kiểm phòng và checkout: ${checkoutBooking.customerName}`);
      setShowCheckoutModal(false);
      setCheckoutBooking(null);
      await loadDashboardData();
    } catch (error) {
      console.error('Confirm checkout error:', error);
      toast.error('Không thể hoàn tất checkout');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const navigationSections = staffNavItemsGrouped.map((section) => ({
    section: section.section,
    items: section.items.map((item) => ({
      ...item,
      active: item.path === '/staff/dashboard',
    })),
  }));

  const getTaskIcon = (type: TodayTask['type']) => {
    switch (type) {
      case 'checkin':
        return CheckCircle;
      case 'checkout':
        return ArrowUpRight;
      case 'cleaning':
        return Home;
      case 'maintenance':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getTaskColor = (type: TodayTask['type']) => {
    switch (type) {
      case 'checkin':
        return 'text-green-600 bg-green-50';
      case 'checkout':
        return 'text-blue-600 bg-blue-50';
      case 'cleaning':
        return 'text-purple-600 bg-purple-50';
      case 'maintenance':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: TodayTask['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700',
    };
    return colors[priority];
  };

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

          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.section} className="space-y-1">
                <h3 className="px-4 text-xs font-bold text-cyan-200 uppercase tracking-wider">
                  {section.section}
                </h3>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      type="button"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        item.active ? 'bg-white/20 text-white font-medium' : 'text-cyan-100 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-6 border-t border-cyan-500/30">
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
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                type="button"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Staff Dashboard</h2>
                <p className="text-sm text-gray-500">Quản lý công việc hàng ngày</p>
              </div>
            </div>
            <BackofficeNotificationBell />
          </div>
        </header>

        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <ArrowDownRight className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">Check-in hôm nay</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayCheckIns}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6 text-blue-600" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">Check-out hôm nay</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayCheckOuts}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">Khách đang lưu trú</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.currentOccupancy}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">Công việc chờ xử lý</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingTasks}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Công việc hôm nay</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {todayTasks.filter((t) => t.status === 'pending').length} công việc đang chờ xử lý
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/staff/bookings')}
                      type="button"
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                    >
                      Xem tất cả
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {todayTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-900 font-medium mb-2">Không có công việc nào hôm nay!</p>
                      <p className="text-gray-500 text-sm">Bạn đã hoàn thành tất cả công việc.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todayTasks.map((task) => {
                        const TaskIcon = getTaskIcon(task.type);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                              task.status === 'completed'
                                ? 'border-gray-200 bg-gray-50 opacity-60'
                                : 'border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/30'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTaskColor(task.type)}`}>
                              <TaskIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p
                                  className={`font-medium ${
                                    task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                                  {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {task.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Home className="w-4 h-4" />
                                  {task.room}
                                </span>
                              </div>
                            </div>
                            {task.status === 'pending' ? (
                              <button
                                onClick={() => handleCompleteTask(task)}
                                type="button"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                              >
                                {task.type === 'checkout' ? 'Kiểm tra phòng' : 'Hoàn thành'}
                              </button>
                            ) : (
                              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">✓ Đã xong</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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
    </div>
  );
}
