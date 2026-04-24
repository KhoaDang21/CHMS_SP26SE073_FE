import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Menu,
  X,
  LogOut,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  Gift,
  Eye,
  Trash2,
  Award,
  ShoppingBag,
  UserCheck,
  UserX,
  Star,
  Ban,
  FileText,
  History,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { adminCustomerService } from '../../services/adminCustomerService';
import type { Customer, CustomerStatus, CustomerType, CustomerStats } from '../../types/customer.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { managerNavItemsGrouped } from '../../config/adminNavItemsGrouped';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function ManagerCustomers() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    vip: 0,
    blocked: 0,
    domestic: 0,
    international: 0,
    totalRevenue: 0,
    averageSpending: 0,
    totalLoyaltyPoints: 0,
  });

  const user = authService.getCurrentUser();

  useEffect(() => {
    void loadCustomers();
    void loadStats();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    if (!selectedCustomer && !deletingCustomer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedCustomer, deletingCustomer]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await adminCustomerService.getAllCustomers();

      const enriched = await Promise.all(
        data.map(async (customer) => {
          if ((customer.totalBookings || 0) > 0 || (customer.totalSpent || 0) > 0) {
            return customer;
          }

          try {
            const bookingData = await adminCustomerService.getCustomerBookingHistory(customer.id);
            const bookingCount = bookingData.bookings.length;
            const bookingSpent = bookingData.bookings.reduce(
              (sum, booking) => sum + (Number(booking.totalPrice) || 0),
              0,
            );

            if (bookingCount <= 0 && bookingSpent <= 0) {
              return customer;
            }

            return {
              ...customer,
              totalBookings: bookingCount,
              totalSpent: bookingSpent,
            };
          } catch {
            return customer;
          }
        }),
      );

      setCustomers(enriched);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await adminCustomerService.getCustomerStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBookingHistory = async (customerId: string) => {
    try {
      const data = await adminCustomerService.getCustomerBookingHistory(customerId);
      setBookingHistory(data.bookings);
      return data.bookings;
    } catch (error) {
      console.error('Error loading booking history:', error);
      return [];
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.city && c.city.toLowerCase().includes(query)) ||
          (c.country && c.country.toLowerCase().includes(query)),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }

    setFilteredCustomers(filtered);
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);

    const [customerDetail, bookings] = await Promise.all([
      adminCustomerService.getCustomerById(customer.id),
      loadBookingHistory(customer.id),
    ]);

    const safeBookings = Array.isArray(bookings) ? bookings : [];
    const bookingCount = safeBookings.length;
    const bookingSpent = safeBookings.reduce((sum, booking) => sum + (Number(booking.totalPrice) || 0), 0);

    const mergedCustomer: Customer = {
      ...(customerDetail || customer),
      totalBookings:
        Number(customerDetail?.totalBookings || customer.totalBookings || 0) > 0
          ? Number(customerDetail?.totalBookings || customer.totalBookings || 0)
          : bookingCount,
      totalSpent:
        Number(customerDetail?.totalSpent || customer.totalSpent || 0) > 0
          ? Number(customerDetail?.totalSpent || customer.totalSpent || 0)
          : bookingSpent,
    };

    setSelectedCustomer(mergedCustomer);
  };

  const handleUpdateStatus = async (customerId: string, newStatus: CustomerStatus) => {
    const result = await adminCustomerService.updateCustomer(customerId, { status: newStatus });
    if (result.success) {
      toast.success('Cập nhật trạng thái thành công!');
      void loadCustomers();
      void loadStats();
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(result.customer || null);
      }
    } else {
      toast.error(result.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    const result = await adminCustomerService.deleteCustomer(deletingCustomer.id);
    if (result.success) {
      toast.success('Xóa khách hàng thành công!');
      void loadCustomers();
      void loadStats();
      setDeletingCustomer(null);
      if (selectedCustomer?.id === deletingCustomer.id) {
        setSelectedCustomer(null);
      }
    } else {
      toast.error(result.message || 'Không thể xóa khách hàng');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const getStatusBadge = (status: CustomerStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      vip: 'bg-purple-100 text-purple-700',
      blocked: 'bg-red-100 text-red-700',
    };

    const labels = {
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      vip: 'VIP',
      blocked: 'Bị chặn',
    };

    const icons = {
      active: UserCheck,
      inactive: UserX,
      vip: Star,
      blocked: Ban,
    };

    const Icon = icons[status];

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${styles[status]}`}>
        <Icon className="w-4 h-4" />
        {labels[status]}
      </span>
    );
  };

  const getTypeBadge = (type: CustomerType) => {
    const styles = {
      domestic: 'bg-blue-100 text-blue-700',
      international: 'bg-orange-100 text-orange-700',
    };

    const labels = {
      domestic: 'Trong nước',
      international: 'Quốc tế',
    };

    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[type]}`}>{labels[type]}</span>;
  };

  const groupedNavItems = managerNavItemsGrouped;

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
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar groupedItems={groupedNavItems} />
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
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h2>
                <p className="text-gray-600 text-sm">Xem và quản lý thông tin khách hàng</p>
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
                  <p className="text-gray-600 text-sm mb-1">Tổng khách hàng</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Đang hoạt động</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Khách VIP</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.vip}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng chi tiêu</p>
                  <p className="text-2xl font-bold text-gray-900">{(stats.totalRevenue / 1000000).toFixed(1)}M ₫</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Khách trong nước / Quốc tế</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.domestic} / {stats.international}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Chi tiêu trung bình</p>
                  <p className="text-xl font-bold text-gray-900">{(stats.averageSpending / 1000000).toFixed(2)}M ₫</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Tổng điểm tích lũy</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalLoyaltyPoints.toLocaleString()}</p>
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
                    placeholder="Tìm kiếm theo tên, email, SĐT, địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                  <option value="vip">VIP</option>
                  <option value="blocked">Bị chặn</option>
                </select>
              </div>

              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as CustomerType | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="domestic">Trong nước</option>
                  <option value="international">Quốc tế</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredCustomers.length}</span> / {stats.total} khách hàng
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải danh sách khách hàng...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy khách hàng nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {customer.avatar ? (
                          <img
                            src={customer.avatar}
                            alt={customer.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl">
                            {customer.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(customer.status)}
                              {getTypeBadge(customer.type)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{[customer.city, customer.country].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Đặt phòng</p>
                            <p className="font-bold text-blue-600">{customer.totalBookings}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Chi tiêu</p>
                            <p className="font-bold text-green-600">{(customer.totalSpent / 1000000).toFixed(1)}M</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Điểm</p>
                            <p className="font-bold text-purple-600">{customer.loyaltyPoints}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleViewDetails(customer)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            onClick={() => setDeletingCustomer(customer)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white rounded-t-2xl">
              <div className="flex items-center gap-4">
                {selectedCustomer.avatar ? (
                  <img
                    src={selectedCustomer.avatar}
                    alt={selectedCustomer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-4">
                {getStatusBadge(selectedCustomer.status)}
                {getTypeBadge(selectedCustomer.type)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Tổng đặt phòng</p>
                  <p className="font-bold text-blue-600 text-xl">{selectedCustomer.totalBookings}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CreditCard className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Tổng chi tiêu</p>
                  <p className="font-bold text-green-600 text-xl">{(selectedCustomer.totalSpent / 1000000).toFixed(1)}M</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Gift className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Điểm tích lũy</p>
                  <p className="font-bold text-purple-600 text-xl">{selectedCustomer.loyaltyPoints}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <Award className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Chi tiêu TB</p>
                  <p className="font-bold text-orange-600 text-xl">
                    {selectedCustomer.totalBookings > 0
                      ? (selectedCustomer.totalSpent / selectedCustomer.totalBookings / 1000000).toFixed(1)
                      : 0}
                    M
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  {selectedCustomer.dateOfBirth && (
                    <div>
                      <p className="text-sm text-gray-500">Ngày sinh</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedCustomer.dateOfBirth).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  )}
                  {(selectedCustomer.nationality || selectedCustomer.country) && (
                    <div>
                      <p className="text-sm text-gray-500">Quốc tịch</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.nationality || selectedCustomer.country}</p>
                    </div>
                  )}
                  {selectedCustomer.identityNumber && (
                    <div>
                      <p className="text-sm text-gray-500">CMND/CCCD</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.identityNumber}</p>
                    </div>
                  )}
                  {selectedCustomer.passportNumber && (
                    <div>
                      <p className="text-sm text-gray-500">Hộ chiếu</p>
                      <p className="font-medium text-gray-900">{selectedCustomer.passportNumber}</p>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Địa chỉ</p>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer.preferences && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    Sở thích
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedCustomer.preferences.roomType && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Loại phòng ưa thích:</span> {selectedCustomer.preferences.roomType}
                      </p>
                    )}
                    {selectedCustomer.preferences.specialRequests && selectedCustomer.preferences.specialRequests.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Yêu cầu đặc biệt:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCustomer.preferences.specialRequests.map((req, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCustomer.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Ghi chú
                  </h3>
                  <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedCustomer.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Lịch sử đặt phòng
                </h3>
                {bookingHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Chưa có lịch sử đặt phòng</p>
                ) : (
                  <div className="space-y-3">
                    {bookingHistory.map((booking) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-blue-600">{booking.homestayName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{booking.totalPrice.toLocaleString('vi-VN')} ₫</p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                booking.status === 'completed' || booking.status === 'checked_out'
                                  ? 'bg-gray-100 text-gray-700'
                                  : booking.status === 'confirmed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {booking.status === 'completed' || booking.status === 'checked_out'
                                ? 'Hoàn thành'
                                : booking.status === 'confirmed'
                                  ? 'Đã xác nhận'
                                  : 'Chờ xác nhận'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.checkInDate).toLocaleDateString('vi-VN')} -{' '}
                            {new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cập nhật trạng thái</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleUpdateStatus(selectedCustomer.id, 'active')}
                    disabled={selectedCustomer.status === 'active'}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Kích hoạt</span>
                  </button>
                  <button
                    onClick={() => void handleUpdateStatus(selectedCustomer.id, 'vip')}
                    disabled={selectedCustomer.status === 'vip'}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Star className="w-4 h-4" />
                    <span>Nâng VIP</span>
                  </button>
                  <button
                    onClick={() => void handleUpdateStatus(selectedCustomer.id, 'inactive')}
                    disabled={selectedCustomer.status === 'inactive'}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Vô hiệu</span>
                  </button>
                  <button
                    onClick={() => void handleUpdateStatus(selectedCustomer.id, 'blocked')}
                    disabled={selectedCustomer.status === 'blocked'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Chặn</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Ngày đăng ký: {new Date(selectedCustomer.registeredDate).toLocaleDateString('vi-VN')}
                </p>
                {selectedCustomer.lastBookingDate && (
                  <p className="text-sm text-gray-500">
                    Đặt phòng gần nhất: {new Date(selectedCustomer.lastBookingDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Xác nhận xóa</h3>
                <p className="text-gray-600 text-sm">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Bạn có chắc chắn muốn xóa khách hàng <strong>{deletingCustomer.name}</strong>?<br />
              <span className="text-sm text-red-600">
                Lưu ý: Dữ liệu lịch sử đặt phòng của khách hàng này vẫn được giữ lại.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCustomer(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
