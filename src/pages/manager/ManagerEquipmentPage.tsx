import { useRef, useState } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Package,
  CheckCircle,
  Clock,
  Grid3x3,
  List,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { managerNavItemsGrouped } from '../../config/adminNavItemsGrouped';
import AdminSidebar from '../../components/admin/AdminSidebar';
import type { Equipment } from '../../types/equipment.types';

const CATEGORIES = ['Swimming', 'Water Sports', 'Sports', 'Beach', 'Other'];

const MOCK_HOMESTAYS = [
  { id: 'hs-1', name: 'Sunrise Beach Homestay' },
  { id: 'hs-2', name: 'Blue Coral Retreat' },
  { id: 'hs-3', name: 'Ocean Breeze Villa' },
];

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-1',
    homestayId: 'hs-1',
    name: 'Kính bơi',
    category: 'Swimming',
    quantity: 20,
    available: 15,
    borrowed: 5,
    condition: 'good',
    description: 'Kính bơi chuyên nghiệp, chống tia UV',
    isActive: true,
  },
  {
    id: 'eq-2',
    homestayId: 'hs-1',
    name: 'Áo phao',
    category: 'Swimming',
    quantity: 30,
    available: 22,
    borrowed: 8,
    condition: 'good',
    description: 'Áo phao an toàn, nhiều size',
    isActive: true,
  },
  {
    id: 'eq-3',
    homestayId: 'hs-2',
    name: 'Thuyền SUP',
    category: 'Water Sports',
    quantity: 5,
    available: 3,
    borrowed: 2,
    condition: 'good',
    description: 'Thuyền Stand-up Paddle board',
    isActive: true,
  },
  {
    id: 'eq-4',
    homestayId: 'hs-2',
    name: 'Bóng đá',
    category: 'Sports',
    quantity: 10,
    available: 8,
    borrowed: 2,
    condition: 'good',
    description: 'Bóng đá size 5 tiêu chuẩn',
    isActive: true,
  },
  {
    id: 'eq-5',
    homestayId: 'hs-3',
    name: 'Bóng chuyền',
    category: 'Sports',
    quantity: 8,
    available: 6,
    borrowed: 2,
    condition: 'good',
    description: 'Bóng chuyền bãi biển',
    isActive: true,
  },
  {
    id: 'eq-6',
    homestayId: 'hs-3',
    name: 'Ván lướt sóng',
    category: 'Water Sports',
    quantity: 6,
    available: 4,
    borrowed: 1,
    condition: 'fair',
    description: 'Surfboard cho người mới',
    isActive: true,
  },
];

interface EquipmentForm {
  name: string;
  category: string;
  quantity: number;
  description: string;
  condition: 'good' | 'fair' | 'maintenance';
}

export default function ManagerEquipmentPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const groupedNavItems = managerNavItemsGrouped;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays] = useState(MOCK_HOMESTAYS);
  const [homestayId, setHomestayId] = useState<string>(MOCK_HOMESTAYS[0]?.id ?? '');

  const [loading] = useState(false);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<EquipmentForm>({
    name: '',
    category: 'Swimming',
    quantity: 1,
    description: '',
    condition: 'good',
  });
  const nextEquipmentIdRef = useRef(MOCK_EQUIPMENT.length + 1);

  const equipment = allEquipment.filter((item) => String(item.homestayId) === String(homestayId));

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddEquipment = () => {
    if (!homestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên đồ dùng');
      return;
    }
    if (formData.quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    const newItem: Equipment = {
      id: `eq-${nextEquipmentIdRef.current++}`,
      homestayId,
      name: formData.name.trim(),
      category: formData.category,
      quantity: formData.quantity,
      available: formData.quantity,
      borrowed: 0,
      condition: formData.condition,
      description: formData.description.trim() || undefined,
      isActive: true,
    };
    setAllEquipment((prev) => [newItem, ...prev]);
    toast.success(`Đã thêm ${formData.name}`);
    setShowAddModal(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleUpdateEquipment = () => {
    if (!editingItem) return;

    setIsSubmitting(true);
    setAllEquipment((prev) =>
      prev.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              name: formData.name,
              category: formData.category,
              quantity: formData.quantity,
              available: Math.max(0, formData.quantity - item.borrowed),
              description: formData.description || undefined,
              condition: formData.condition,
            }
          : item
      )
    );
    toast.success(`Đã cập nhật ${formData.name}`);
    setEditingItem(null);
    resetForm();
    setIsSubmitting(false);
  };

  const handleDeleteEquipment = (id: string) => {
    const item = equipment.find((e) => e.id === id);
    if (!item) return;

    if (item.borrowed > 0) {
      toast.error('Không thể xóa đồ dùng đang được mượn!');
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa "${item.name}" không?`)) return;

    setAllEquipment((prev) => prev.filter((item) => item.id !== id));
    toast.success('Đã xóa đồ dùng');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Swimming',
      quantity: 1,
      description: '',
      condition: 'good',
    });
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      description: item.description || '',
      condition: item.condition,
    });
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const totalItems = equipment.reduce((sum, item) => sum + item.quantity, 0);
  const totalAvailable = equipment.reduce((sum, item) => sum + item.available, 0);
  const totalBorrowed = equipment.reduce((sum, item) => sum + item.borrowed, 0);

  const selectedHomestay = homestays.find((h) => String(h.id) === String(homestayId));

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
              <p className="text-xs text-gray-500">Menu & đồ dùng</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
            type="button"
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
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <div className="text-sm text-gray-500">Homestay</div>
                <select
                  value={homestayId}
                  onChange={(e) => setHomestayId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[280px] bg-white"
                >
                  {homestays.map((h) => (
                    <option key={String(h.id)} value={String(h.id)}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <Package className="w-5 h-5 text-blue-600" />
              Quản lý đồ dùng
            </div>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Quản lý đồ dùng</h1>
            <p className="text-gray-600 mt-1">
              {selectedHomestay ? `Homestay: ${selectedHomestay.name}` : 'Chọn homestay để quản lý'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl p-4 border border-blue-100 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Tổng số lượng</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{totalItems}</p>
                  </div>
                  <Package className="w-10 h-10 text-blue-500 opacity-50" />
                </div>
              </div>

              <div className="rounded-xl p-4 border border-green-100 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Có sẵn</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{totalAvailable}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
                </div>
              </div>

              <div className="rounded-xl p-4 border border-orange-100 bg-orange-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Đang mượn</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{totalBorrowed}</p>
                  </div>
                  <Clock className="w-10 h-10 text-orange-500 opacity-50" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm đồ dùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-500 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Không có đồ dùng nào
                </div>
              ) : (
                filteredEquipment.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="h-40 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Package className="w-16 h-16 text-white opacity-50" />
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                          <p className="text-sm text-slate-500">{item.category}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            item.condition === 'good'
                              ? 'bg-green-100 text-green-700'
                              : item.condition === 'fair'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.condition}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Tổng</p>
                          <p className="font-bold text-slate-900">{item.quantity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-green-600">Có sẵn</p>
                          <p className="font-bold text-green-600">{item.available}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-orange-600">Mượn</p>
                          <p className="font-bold text-orange-600">{item.borrowed}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(item.id)}
                          className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                      Tên
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                      Loại
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                      Tổng
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                      Có sẵn
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                      Mượn
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                      Tình trạng
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Không có đồ dùng nào
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-slate-500">{item.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item.category}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            {item.available}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                            {item.borrowed}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              item.condition === 'good'
                                ? 'bg-green-100 text-green-700'
                                : item.condition === 'fair'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEquipment(item.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Add/Edit Modal */}
          {(showAddModal || editingItem) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {editingItem ? 'Sửa đồ dùng' : 'Thêm đồ dùng mới'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tên *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Kính bơi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loại *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Số lượng *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tình trạng *
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condition: e.target.value as 'good' | 'fair' | 'maintenance',
                        })
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="good">Tốt</option>
                      <option value="fair">Bình thường</option>
                      <option value="maintenance">Bảo trì</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mô tả
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mô tả chi tiết..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={editingItem ? handleUpdateEquipment : handleAddEquipment}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý...' : editingItem ? 'Cập nhật' : 'Thêm'} đồ dùng
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
