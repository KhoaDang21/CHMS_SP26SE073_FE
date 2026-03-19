import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  Crown,
  Sparkles,
  LayoutGrid,
  List,
  Home,
  Menu,
  X,
  Building2,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { amenityService } from '../../services/amenityService';
import type { Amenity, CreateAmenityDTO, UpdateAmenityDTO, AmenityCategory, AmenityStats } from '../../types/amenity.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { authService } from '../../services/authService';


// Category labels
const categoryLabels: Record<AmenityCategory, { vi: string; en: string; color: string }> = {
  basic: { vi: 'Cơ bản', en: 'Basic', color: 'bg-blue-100 text-blue-700' },
  kitchen: { vi: 'Bếp', en: 'Kitchen', color: 'bg-orange-100 text-orange-700' },
  bathroom: { vi: 'Phòng tắm', en: 'Bathroom', color: 'bg-cyan-100 text-cyan-700' },
  entertainment: { vi: 'Giải trí', en: 'Entertainment', color: 'bg-purple-100 text-purple-700' },
  outdoor: { vi: 'Ngoài trời', en: 'Outdoor', color: 'bg-green-100 text-green-700' },
  safety: { vi: 'An toàn', en: 'Safety', color: 'bg-red-100 text-red-700' },
  service: { vi: 'Dịch vụ', en: 'Service', color: 'bg-indigo-100 text-indigo-700' },
  other: { vi: 'Khác', en: 'Other', color: 'bg-gray-100 text-gray-700' },
};

// Available icons as URLs - Comprehensive list for homestay amenities
const availableIcons = [
  // Basic Amenities
  { name: 'WiFi', url: 'https://cdn-icons-png.flaticon.com/512/93/93158.png' },
  { name: 'Điều hòa', url: 'https://cdn-icons-png.flaticon.com/128/7969/7969763.png' },
  { name: 'Máy sưởi', url: 'https://cdn-icons-png.flaticon.com/128/1677/1677058.png' },
  { name: 'Quạt máy', url: 'https://cdn-icons-png.flaticon.com/128/11385/11385117.png' },

  // Kitchen
  { name: 'Bếp', url: 'https://cdn-icons-png.flaticon.com/128/2851/2851928.png' },
  { name: 'Tủ lạnh', url: 'https://cdn-icons-png.flaticon.com/128/4352/4352967.png' },
  { name: 'Lò vi sóng', url: 'https://cdn-icons-png.flaticon.com/128/1547/1547889.png' },
  { name: 'Máy pha cà phê', url: 'https://cdn-icons-png.flaticon.com/128/3019/3019817.png' },
  { name: 'Ấm đun nước', url: 'https://cdn-icons-png.flaticon.com/128/1941/1941802.png' },
  { name: 'Máy rửa chén', url: 'https://cdn-icons-png.flaticon.com/128/2564/2564393.png' },
  { name: 'Lò nướng', url: 'https://cdn-icons-png.flaticon.com/128/9997/9997745.png' },
  { name: 'Nồi cơm điện', url: 'https://cdn-icons-png.flaticon.com/128/3956/3956442.png' },

  // Bathroom
  { name: 'Máy sấy tóc', url: 'https://cdn-icons-png.flaticon.com/128/6367/6367568.png' },
  { name: 'Sen vòi', url: 'https://cdn-icons-png.flaticon.com/128/10772/10772673.png' },
  { name: 'Bồn tắm', url: 'https://cdn-icons-png.flaticon.com/128/259/259973.png' },
  { name: 'Máy giặt', url: 'https://cdn-icons-png.flaticon.com/128/1104/1104590.png' },
  { name: 'Máy sấy quần áo', url: 'https://cdn-icons-png.flaticon.com/128/17521/17521642.png' },
  { name: 'Bàn ủi', url: 'https://cdn-icons-png.flaticon.com/128/2236/2236584.png' },

  // Entertainment
  { name: 'Smart TV', url: 'https://cdn-icons-png.flaticon.com/128/1023/1023521.png' },
  { name: 'Netflix', url: 'https://cdn-icons-png.flaticon.com/128/732/732228.png' },
  { name: 'Loa Bluetooth', url: 'https://cdn-icons-png.flaticon.com/128/895/895591.png' },
  { name: 'Bàn bi-a', url: 'https://cdn-icons-png.flaticon.com/128/4295/4295376.png' },
  { name: 'Game console', url: 'https://cdn-icons-png.flaticon.com/128/686/686589.png' },

  // Outdoor
  { name: 'Hồ bơi', url: 'https://cdn-icons-png.flaticon.com/128/9629/9629334.png' },
  { name: 'Ban công', url: 'https://cdn-icons-png.flaticon.com/128/16187/16187032.png' },
  { name: 'Sân vườn', url: 'https://cdn-icons-png.flaticon.com/128/1010/1010368.png' },
  { name: 'BBQ', url: 'https://cdn-icons-png.flaticon.com/128/2946/2946507.png' },
  { name: 'Bãi đậu xe', url: 'https://cdn-icons-png.flaticon.com/128/708/708949.png' },
  { name: 'Tắm nắng', url: 'https://cdn-icons-png.flaticon.com/128/4336/4336494.png' },

  // Safety & Security
  { name: 'Két an toàn', url: 'https://cdn-icons-png.flaticon.com/512/1611/1611179.png' },
  { name: 'Camera an ninh', url: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' },
  { name: 'Khóa điện tử', url: 'https://cdn-icons-png.flaticon.com/512/6195/6195699.png' },
  { name: 'Chuông cửa', url: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png' },
  { name: 'Bình cứu hỏa', url: 'https://cdn-icons-png.flaticon.com/512/785/785116.png' },
  { name: 'Báo khói', url: 'https://cdn-icons-png.flaticon.com/512/4149/4149705.png' },

  // Services
  { name: 'Phòng gym', url: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png' },
  { name: 'Dọn phòng', url: 'https://cdn-icons-png.flaticon.com/512/3050/3050150.png' },
  { name: 'Thú cưng', url: 'https://cdn-icons-png.flaticon.com/512/2138/2138440.png' },
  { name: 'Đón tiễn sân bay', url: 'https://cdn-icons-png.flaticon.com/128/995/995334.png' },
  { name: 'Cho thuê xe', url: 'https://cdn-icons-png.flaticon.com/128/14023/14023024.png' },

  // Others
  { name: 'View biển', url: 'https://cdn-icons-png.flaticon.com/128/17813/17813814.png' },
  { name: 'View núi', url: 'https://cdn-icons-png.flaticon.com/128/7811/7811712.png' },
  { name: 'Cho trẻ em', url: 'https://cdn-icons-png.flaticon.com/512/3050/3050156.png' },
  { name: 'Phù hợp gia đình', url: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' },
  { name: 'Laptop-friendly', url: 'https://cdn-icons-png.flaticon.com/512/3143/3143636.png' },
];

export default function AmenityManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<AmenityCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

  const user = authService.getCurrentUser();

  // Form state
  const [formData, setFormData] = useState<CreateAmenityDTO>({
    name: '',
    category: 'basic',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/93/93158.png',
  });

  // Calculate stats from amenities data
  const stats: AmenityStats = {
    total: amenities.length,
    active: amenities.filter(a => a.isActive).length,
    inactive: amenities.filter(a => !a.isActive).length,
    premium: amenities.filter(a => a.isPremium).length,
    byCategory: amenities.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {} as Record<AmenityCategory, number>),
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const amenitiesData = await amenityService.getAllAmenities();
      setAmenities(amenitiesData);
    } catch (error) {
      console.error('Error loading amenities:', error);
      toast.error('Không thể tải dữ liệu tiện ích');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng điền tên tiện ích');
      return;
    }

    try {
      const result = await amenityService.createAmenity(formData);
      if (result?.success) {
        toast.success('Thêm tiện ích thành công');
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        toast.error(result?.message || 'Không thể thêm tiện ích');
      }
    } catch (error) {
      console.error('Error creating amenity:', error);
      toast.error('Không thể thêm tiện ích. Vui lòng kiểm tra dữ liệu nhập.');
    }
  };

  const handleUpdate = async () => {
    if (!editingAmenity) return;

    if (!formData.name.trim()) {
      toast.error('Vui lòng điền tên tiện ích');
      return;
    }

    try {
      const result = await amenityService.updateAmenity(editingAmenity.id, {
        ...formData,
        iconFile,
      });
      if (result?.success) {
        toast.success('Cập nhật tiện ích thành công');
        setShowModal(false);
        setEditingAmenity(null);
        resetForm();
        loadData();
      } else {
        toast.error(result?.message || 'Không thể cập nhật tiện ích');
      }
    } catch (error) {
      console.error('Error updating amenity:', error);
      toast.error('Không thể cập nhật tiện ích');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tiện ích này?')) return;

    try {
      const result = await amenityService.deleteAmenity(id);
      if (result?.success) {
        toast.success('Xóa tiện ích thành công');
        loadData();
      } else {
        toast.error(result?.message || 'Không thể xóa tiện ích');
      }
    } catch (error) {
      console.error('Error deleting amenity:', error);
      toast.error('Không thể xóa tiện ích');
    }
  };

  const handleToggleStatus = async (amenity: Amenity) => {
    try {
      const updateData: UpdateAmenityDTO = {
        name: amenity.name,
        category: amenity.category,
        iconUrl: amenity.iconUrl,
        isActive: !amenity.isActive
      };
      const result = await amenityService.updateAmenity(amenity.id, updateData);
      if (result?.success) {
        toast.success('Cập nhật trạng thái thành công');
        loadData();
      } else {
        toast.error(result?.message || 'Không thể cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const openEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setIconFile(null);
    setFormData({
      name: amenity.name,
      category: amenity.category,
      iconUrl: amenity.iconUrl,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'basic',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/93/93158.png',
    });
    setIconFile(null);
    setEditingAmenity(null);
  };

  const filteredAmenities = amenities.filter((amenity) => {
    const matchesSearch =
      amenity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amenity.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amenity.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === 'all' || amenity.category === filterCategory;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && amenity.isActive) ||
      (filterStatus === 'inactive' && !amenity.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'homestays', label: 'Quản lý Homestay', icon: Home, path: '/admin/homestays' },
    { id: 'amenities', label: 'Quản lý tiện ích', icon: Sparkles, path: '/admin/amenities' },
    { id: 'bookings', label: 'Đặt phòng', icon: CalendarDays, path: '/admin/bookings' },
    { id: 'customers', label: 'Khách hàng', icon: Users, path: '/admin/customers' },
    { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/admin/staff' },
    { id: 'revenue', label: 'Doanh thu', icon: TrendingUp, path: '/admin/revenue' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/admin/settings' },
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
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white shadow-lg w-64`}
      >
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

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'amenities';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
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
                <h2 className="text-xl font-bold text-gray-900">Quản lý Tiện ích</h2>
                <p className="text-sm text-gray-500">Quản lý các tiện ích và dịch vụ của homestay</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Tổng tiện ích</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Đang hoạt động</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Ngừng hoạt động</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive}</h3>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Tiện ích cao cấp</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.premium}</h3>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tiện ích..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as AmenityCategory | 'all')}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Tất cả danh mục</option>
                  {Object.entries(categoryLabels).map(([key, value]) => (
                    <option key={key} value={key}>{value.vi}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Thêm tiện ích
              </button>
            </div>
          </div>

          {/* Amenities Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAmenities.map((amenity) => {
                const categoryInfo = categoryLabels[amenity.category] || categoryLabels.other;

                return (
                  <div
                    key={amenity.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Icon & Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center p-2">
                          <img
                            src={amenity.iconUrl}
                            alt={amenity.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/93/93158.png';
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          {amenity.isPremium && (
                            <Crown className="w-5 h-5 text-amber-500" />
                          )}
                          {amenity.isActive && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="font-bold text-gray-900 mb-1">{amenity.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{amenity.nameEn}</p>

                      {/* Category Badge */}
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${categoryInfo.color}`}>
                        {categoryInfo.vi}
                      </span>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{amenity.description}</p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(amenity)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${amenity.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                        >
                          {amenity.isActive ? 'Tắt' : 'Bật'}
                        </button>
                        <button
                          onClick={() => openEditModal(amenity)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(amenity.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiện ích</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Premium</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAmenities.map((amenity) => {
                    const categoryInfo = categoryLabels[amenity.category] || categoryLabels.other;

                    return (
                      <tr key={amenity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0 p-2">
                              <img
                                src={amenity.iconUrl}
                                alt={amenity.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/93/93158.png';
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{amenity.name}</p>
                              <p className="text-sm text-gray-500">{amenity.nameEn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                            {categoryInfo.vi}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-gray-600 truncate">{amenity.description}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {amenity.isPremium ? (
                            <Crown className="w-5 h-5 text-amber-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {amenity.isActive ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(amenity)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${amenity.isActive
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                            >
                              {amenity.isActive ? 'Tắt' : 'Bật'}
                            </button>
                            <button
                              onClick={() => openEditModal(amenity)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(amenity.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {filteredAmenities.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy tiện ích</h3>
              <p className="text-gray-500">Thử thay đổi bộ lọc hoặc thêm tiện ích mới</p>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAmenity ? 'Chỉnh sửa tiện ích' : 'Thêm tiện ích mới'}
                  </h2>
                </div>

                <div className="p-6 space-y-4">
                  {/* Name (Vietnamese) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên tiện ích <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="VD: WiFi tốc độ cao"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as AmenityCategory })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(categoryLabels).map(([key, value]) => (
                        <option key={key} value={key}>{value.vi}</option>
                      ))}
                    </select>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn Icon <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 font-normal ml-2">
                        ({availableIcons.length} icons có sẵn)
                      </span>
                    </label>

                    {/* Icon Grid with Scroll */}
                    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-6 gap-2">
                        {availableIcons.map((icon) => (
                          <button
                            key={icon.url}
                            type="button"
                            onClick={() => setFormData({ ...formData, iconUrl: icon.url })}
                            className={`relative p-2 border-2 rounded-lg hover:border-blue-400 transition-all hover:scale-105 flex flex-col items-center gap-1 ${formData.iconUrl === icon.url
                                ? 'border-blue-600 bg-blue-50 shadow-md'
                                : 'border-gray-300 bg-white'
                              }`}
                            title={icon.name}
                          >
                            <img
                              src={icon.url}
                              alt={icon.name}
                              className="w-8 h-8"
                              onError={(e) => {
                                e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/93/93158.png';
                              }}
                            />
                            <span className="text-[9px] text-gray-600 text-center line-clamp-1 w-full">
                              {icon.name}
                            </span>
                            {formData.iconUrl === icon.url && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Click vào icon để chọn
                    </p>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hoặc tải file icon mới
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setIconFile(file);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {iconFile && (
                        <p className="text-xs text-green-600 mt-1">Đã chọn file: {iconFile.name}</p>
                      )}
                    </div>

                    {/* Icon Preview */}
                    {formData.iconUrl && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-300">
                        <p className="text-xs font-medium text-gray-700 mb-2">Icon đã chọn:</p>
                        <div className="flex items-center gap-3">
                          <img
                            src={formData.iconUrl}
                            alt="Preview"
                            className="w-10 h-10 border border-gray-200 rounded p-1"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/93/93158.png';
                            }}
                          />
                          <span className="text-sm text-gray-600">
                            {availableIcons.find(i => i.url === formData.iconUrl)?.name || 'Icon tùy chỉnh'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={editingAmenity ? handleUpdate : handleCreate}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                  >
                    {editingAmenity ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
