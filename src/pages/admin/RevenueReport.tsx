import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Menu,
  X,
  LogOut,
  DollarSign,
  Building2,
  Search,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { adminDashboardService } from '../../services/adminDashboardService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import type { HomestayRevenueData } from '../../types/homestay.types';

export default function RevenueReport() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [revenueData, setRevenueData] = useState<HomestayRevenueData[]>([]);
  const [filteredData, setFilteredData] = useState<HomestayRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'bookings' | 'name'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const user = authService.getCurrentUser();

  const navItems = adminNavItems;

  useEffect(() => {
    void loadRevenueData();
  }, []);

  useEffect(() => {
    filterAndSortData();
  }, [revenueData, searchQuery, sortBy, sortOrder]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const data = await adminDashboardService.getRevenueByHomestay();
      setRevenueData(data);
      toast.success('Tải dữ liệu doanh thu thành công');
    } catch (error) {
      toast.error('Không thể tải dữ liệu doanh thu');
      setRevenueData([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = [...revenueData];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.homestayName.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortBy === 'revenue') {
        aVal = a.totalRevenue;
        bVal = b.totalRevenue;
      } else if (sortBy === 'bookings') {
        aVal = a.totalBookings;
        bVal = b.totalBookings;
      } else {
        return sortOrder === 'asc'
          ? a.homestayName.localeCompare(b.homestayName)
          : b.homestayName.localeCompare(a.homestayName);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredData(filtered);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalBookings = filteredData.reduce((sum, item) => sum + item.totalBookings, 0);

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
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path !== window.location.pathname) {
                    handleNavigation(item.path);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.id === 'revenue'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
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
                <h2 className="text-xl font-bold text-gray-900">Báo cáo doanh thu</h2>
                <p className="text-sm text-gray-500">Xem doanh thu theo từng Homestay</p>
              </div>
            </div>
            <button
              onClick={loadRevenueData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Tải lại</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Total Revenue */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {totalRevenue.toLocaleString('vi-VN')} ₫
              </h3>
              <p className="text-gray-500 text-sm mt-1">Tổng doanh thu</p>
            </div>

            {/* Total Bookings */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{totalBookings}</h3>
              <p className="text-gray-500 text-sm mt-1">Tổng đặt phòng</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm Homestay
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nhập tên Homestay..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sắp xếp theo
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="revenue">Doanh thu</option>
                  <option value="bookings">Số đặt phòng</option>
                  <option value="name">Tên Homestay</option>
                </select>
              </div>
            </div>

            {/* Sort Order Badge */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${sortOrder === 'desc'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {sortOrder === 'desc' ? 'Cao nhất' : 'Thấp nhất'}
                </span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {filteredData.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Không có dữ liệu doanh thu</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        Tên Homestay
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Doanh thu
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Số đặt phòng
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                        Doanh thu trung bình/đặt phòng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {item.homestayName}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                          {item.totalRevenue.toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          {item.totalBookings}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">
                          {item.totalBookings > 0
                            ? (item.totalRevenue / item.totalBookings).toLocaleString('vi-VN')
                            : 0}
                          {' '}₫
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {filteredData.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Số Homestay</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Tổng doanh thu</p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalRevenue.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Doanh thu trung bình/Homestay</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredData.length > 0
                      ? (totalRevenue / filteredData.length).toLocaleString('vi-VN')
                      : 0}
                    {' '}₫
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
