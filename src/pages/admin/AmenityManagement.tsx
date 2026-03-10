import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  CheckCircle2,
  XCircle,
  Crown,
  Wifi,
  Wind,
  Tv,
  Flame,
  Box,
  Airplay,
  Droplet,
  Waves,
  FlameKindling,
  Trees,
  Lock,
  Camera,
  ShieldCheck,
  Shirt,
  Plane,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react';
import { amenityService } from '../../services/amenityService';
import type { Amenity, CreateAmenityDTO, AmenityCategory, AmenityStats } from '../../types/amenity.types';
import { toast } from 'sonner';

// Icon mapping
const iconMap: Record<string, any> = {
  Wifi, Wind, Tv, Flame, Box, Airplay, Droplet, Waves, 
  FlameKindling, Trees, Lock, Camera, ShieldCheck, Shirt, Plane, Sparkles
};

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

// Available icons as URLs (using generic icon URLs or placeholder)
const availableIcons = [
  { name: 'Wifi', url: 'https://cdn-icons-png.flaticon.com/512/93/93158.png' },
  { name: 'Air Conditioner', url: 'https://cdn-icons-png.flaticon.com/512/2888/2888794.png' },
  { name: 'TV', url: 'https://cdn-icons-png.flaticon.com/512/1998/1998089.png' },
  { name: 'Kitchen', url: 'https://cdn-icons-png.flaticon.com/512/1886/1886715.png' },
  { name: 'Parking', url: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' },
  { name: 'Washing Machine', url: 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png' },
  { name: 'Pool', url: 'https://cdn-icons-png.flaticon.com/512/869/869869.png' },
  { name: 'Security', url: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png' },
  { name: 'Pet Friendly', url: 'https://cdn-icons-png.flaticon.com/512/2138/2138440.png' },
  { name: 'Gym', url: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png' },
];

export default function AmenityManagement() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [stats, setStats] = useState<AmenityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<AmenityCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAmenityDTO>({
    name: '',
    category: 'basic',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/93/93158.png',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [amenitiesData, statsData] = await Promise.all([
        amenityService.getAllAmenities(),
        amenityService.getAmenityStats(),
      ]);
      setAmenities(amenitiesData);
      setStats(statsData);
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
      // Try adding optional fields that backend might expect
      const payload = {
        ...formData,
        nameEn: formData.name, // Duplicate as English name
        description: formData.name,
        descriptionEn: formData.name,
        isPremium: false,
        isActive: true,
      };
      
      console.log('Form data before submit:', formData);
      console.log('Payload with optional fields:', payload);
      
      await amenityService.createAmenity(payload);
      toast.success('Thêm tiện ích thành công');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating amenity:', error);
      toast.error('Không thể thêm tiện ích. Vui lòng kiểm tra dữ liệu nhập.');
    }
  };

  const handleUpdate = async () => {
    if (!editingAmenity) return;

    try {
      await amenityService.updateAmenity(editingAmenity.id, formData);
      toast.success('Cập nhật tiện ích thành công');
      setShowModal(false);
      setEditingAmenity(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error updating amenity:', error);
      toast.error('Không thể cập nhật tiện ích');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tiện ích này?')) return;

    try {
      await amenityService.deleteAmenity(id);
      toast.success('Xóa tiện ích thành công');
      loadData();
    } catch (error) {
      console.error('Error deleting amenity:', error);
      toast.error('Không thể xóa tiện ích');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await amenityService.toggleAmenityStatus(id);
      toast.success('Cập nhật trạng thái thành công');
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const openEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name,
      category: amenity.category,
      iconUrl: amenity.icon,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'basic',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/93/93158.png',
    });
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
    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý Tiện ích</h1>
        <p className="text-gray-600">Quản lý các tiện ích và dịch vụ của homestay</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tổng tiện ích</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.total}</h3>
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
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.active}</h3>
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
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.inactive}</h3>
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
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.premium}</h3>
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
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
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
            const Icon = iconMap[amenity.icon] || Sparkles;
            const categoryInfo = categoryLabels[amenity.category];
            
            return (
              <div
                key={amenity.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex gap-2">
                      {amenity.isPremium && (
                        <Crown className="w-5 h-5 text-amber-500" />
                      )}
                      {amenity.isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
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
                      onClick={() => handleToggleStatus(amenity.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        amenity.isActive
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
                const Icon = iconMap[amenity.icon] || Sparkles;
                const categoryInfo = categoryLabels[amenity.category];
                
                return (
                  <tr key={amenity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-blue-600" />
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
                          onClick={() => handleToggleStatus(amenity.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            amenity.isActive
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
              {/* Name */}
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

              {/* Category - Text Input for Testing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh mục <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Thử: basic, BASIC, Cơ bản, hoặc xem Swagger)</span>
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="basic"
                />
              </div>

              {/* Icon URL - Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.iconUrl}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/icon.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mẫu: https://cdn-icons-png.flaticon.com/512/93/93158.png
                </p>
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
  );
}
