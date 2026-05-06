import { useEffect, useState } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
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
import { equipmentLendingService } from '../../services/equipmentLendingService';
import { managerHomestayService } from '../../services/managerHomestayService';
import type { Equipment } from '../../types/equipment.types';
import type { Homestay } from '../../types/homestay.types';

const CATEGORIES = ['Swimming', 'Water Sports', 'Sports', 'Beach', 'Other'];

interface EquipmentForm {
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  depositAmount: number;
  rentalFee: number;
  imageUrl: string;
  description: string;
  condition: 'good' | 'fair' | 'maintenance';
  isActive: boolean;
}

export default function ManagerEquipmentPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const groupedNavItems = managerNavItemsGrouped;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [homestayId, setHomestayId] = useState<string>('');
  const [loadingHomestays, setLoadingHomestays] = useState(false);

  const [loading, setLoading] = useState(false);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyTarget, setSafetyTarget] = useState<Equipment | null>(null);
  const [safetyCondition, setSafetyCondition] = useState<'GOOD' | 'NEEDS_INSPECTION' | 'DAMAGED' | 'RETIRED'>('GOOD');
  const [safetyStatus, setSafetyStatus] = useState<'COMPLIANT' | 'INSPECTION_DUE' | 'BLOCKED'>('COMPLIANT');
  const [safetyNote, setSafetyNote] = useState('');
  const [nextInspectionDueAt, setNextInspectionDueAt] = useState('');

  const [formData, setFormData] = useState<EquipmentForm>({
    name: '',
    category: 'Swimming',
    totalQuantity: 1,
    availableQuantity: 1,
    depositAmount: 0,
    rentalFee: 0,
    imageUrl: '',
    description: '',
    condition: 'good',
    isActive: true,
  });

  // Load equipment from API when homestayId changes
  useEffect(() => {
    const loadEquipment = async () => {
      if (!homestayId) {
        console.log('No homestayId selected, skipping equipment load');
        return;
      }
      console.log('Loading equipment for homestayId:', homestayId);
      setLoading(true);
      try {
        const items = await equipmentLendingService.managerGetEquipment(homestayId);
        console.log('Equipment loaded successfully:', items);
        setAllEquipment(items);
      } catch (err) {
        console.error('Error loading equipment:', err);
        toast.error('Không thể tải danh sách đồ dùng');
        setAllEquipment([]);
      } finally {
        setLoading(false);
      }
    };
    loadEquipment();
  }, [homestayId]);

  useEffect(() => {
    const loadHomestays = async () => {
      setLoadingHomestays(true);
      try {
        const list = await managerHomestayService.list();
        setHomestays(list);
        setHomestayId((current) => {
          if (list.length === 0) return '';
          const stillValid = list.some((item) => String(item.id) === String(current));
          return stillValid ? current : String(list[0].id);
        });

        if (list.length === 0) {
          toast.info('Không có homestay nào được phân công cho manager này.');
        }
      } catch (err) {
        console.error('Error loading manager homestays:', err);
        toast.error('Không thể tải danh sách homestay');
        setHomestays([]);
        setHomestayId('');
      } finally {
        setLoadingHomestays(false);
      }
    };

    loadHomestays();
  }, []);

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
    if (formData.totalQuantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }
    if (formData.availableQuantity < 0 || formData.availableQuantity > formData.totalQuantity) {
      toast.error('Số lượng có sẵn phải từ 0 đến tổng số lượng');
      return;
    }

    setIsSubmitting(true);
    (async () => {
      try {
        const newItem = await equipmentLendingService.managerCreateEquipment({
          homestayId,
          name: formData.name.trim(),
          category: formData.category,
          totalQuantity: formData.totalQuantity,
          availableQuantity: formData.availableQuantity,
          depositAmount: formData.depositAmount,
          rentalFee: formData.rentalFee,
          imageUrl: formData.imageUrl.trim() || undefined,
          description: formData.description.trim() || undefined,
          condition: formData.condition as 'good' | 'fair' | 'maintenance',
          isActive: formData.isActive,
        });

        if (newItem) {
          setAllEquipment((prev) => [newItem, ...prev]);
          toast.success(`Đã thêm ${formData.name}`);
          setShowAddModal(false);
          resetForm();
        } else {
          toast.error('Tạo đồ dùng thất bại');
        }
      } catch (err) {
        console.error('Error adding equipment:', err);
        toast.error('Lỗi khi tạo đồ dùng');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleUpdateEquipment = () => {
    if (!editingItem) return;
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên đồ dùng');
      return;
    }
    if (formData.totalQuantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }
    if (formData.availableQuantity < 0 || formData.availableQuantity > formData.totalQuantity) {
      toast.error('Số lượng có sẵn phải từ 0 đến tổng số lượng');
      return;
    }

    setIsSubmitting(true);
    (async () => {
      try {
        const updated = await equipmentLendingService.managerUpdateEquipment(editingItem.id, {
          name: formData.name.trim(),
          category: formData.category,
          totalQuantity: formData.totalQuantity,
          availableQuantity: formData.availableQuantity,
          depositAmount: formData.depositAmount,
          rentalFee: formData.rentalFee,
          imageUrl: formData.imageUrl.trim() || undefined,
          description: formData.description.trim() || undefined,
          condition: formData.condition,
          isActive: formData.isActive,
        });

        if (updated) {
          setAllEquipment((prev) =>
            prev.map((item) => (item.id === editingItem.id ? updated : item))
          );
          toast.success(`Đã cập nhật ${formData.name}`);
          setEditingItem(null);
          setShowAddModal(false);
          resetForm();
        } else {
          toast.error('Cập nhật thất bại');
        }
      } catch (err) {
        console.error('Error updating equipment:', err);
        toast.error('Lỗi khi cập nhật đồ dùng');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleDeleteEquipment = (id: string) => {
    const item = equipment.find((e) => e.id === id);
    if (!item) return;

    if (!confirm(`Bạn có chắc muốn xóa "${item.name}" không?`)) return;

    (async () => {
      try {
        const success = await equipmentLendingService.managerDeleteEquipment(id);
        if (success) {
          setAllEquipment((prev) => prev.filter((item) => item.id !== id));
          toast.success('Đã xóa đồ dùng');
        } else {
          toast.error('Xóa thất bại');
        }
      } catch (err) {
        console.error('Error deleting equipment:', err);
        toast.error('Lỗi khi xóa đồ dùng');
      }
    })();
  };

  const handleSubmitSafetyInspection = async () => {
    if (!safetyTarget) return;
    setIsSubmitting(true);
    try {
      const payload = {
        conditionStatus: safetyCondition,
        safetyStatus,
        nextInspectionDueAt: nextInspectionDueAt || undefined,
        safetyNote: safetyNote || undefined,
      };
      const updated = await equipmentLendingService.managerSafetyInspection(safetyTarget.id, payload);
      if (updated) {
        setAllEquipment((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        toast.success('Đã lưu kết quả kiểm tra an toàn');
      } else {
        toast.error('Lưu kiểm tra thất bại');
      }
      setShowSafetyModal(false);
      setSafetyTarget(null);
    } catch (err) {
      console.error('Error submitting safety inspection', err);
      toast.error('Lỗi khi lưu kiểm tra an toàn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Swimming',
      totalQuantity: 1,
      availableQuantity: 1,
      depositAmount: 0,
      rentalFee: 0,
      imageUrl: '',
      description: '',
      condition: 'good',
      isActive: true,
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      totalQuantity: item.totalQuantity ?? item.quantity,
      availableQuantity: item.availableQuantity ?? item.available,
      depositAmount: item.depositAmount ?? 0,
      rentalFee: item.rentalFee ?? 0,
      imageUrl: item.imageUrl ?? item.image ?? '',
      description: item.description || '',
      condition: item.condition,
      isActive: item.isActive,
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

        <nav className="p-4">
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
                  disabled={loadingHomestays || homestays.length === 0}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[280px] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {loadingHomestays ? (
                    <option value="">Đang tải homestay...</option>
                  ) : homestays.length === 0 ? (
                    <option value="">Không có homestay phù hợp</option>
                  ) : (
                    homestays.map((h) => (
                      <option key={String(h.id)} value={String(h.id)}>
                        {h.name}
                      </option>
                    ))
                  )}
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
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý đồ dùng</h1>
              <p className="text-gray-600 mt-1">
                {selectedHomestay ? `Homestay: ${selectedHomestay.name}` : 'Chọn homestay để quản lý'}
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Thêm đồ dùng
            </button>
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
                    <div className="h-40 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-16 h-16 text-white opacity-50" />
                      )}
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
                          onClick={() => { setSafetyTarget(item); setShowSafetyModal(true); setSafetyCondition((item as any).conditionStatus ?? 'GOOD'); setSafetyStatus((item as any).safetyStatus ?? 'COMPLIANT'); setSafetyNote((item as any).safetyNote ?? ''); setNextInspectionDueAt((item as any).nextInspectionDueAt ?? ''); }}
                          className="flex-1 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          Kiểm tra
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
                      Ảnh
                    </th>
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
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        Không có đồ dùng nào
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </td>
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
                                onClick={() => { setSafetyTarget(item); setShowSafetyModal(true); setSafetyCondition((item as any).conditionStatus ?? 'GOOD'); setSafetyStatus((item as any).safetyStatus ?? 'COMPLIANT'); setSafetyNote((item as any).safetyNote ?? ''); setNextInspectionDueAt((item as any).nextInspectionDueAt ?? ''); }}
                                className="p-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-lg transition-colors"
                              >
                                Kiểm tra
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
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-10">
              <div className="flex min-h-full items-start justify-center">
                <div className="my-8 w-full max-w-2xl max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                  <h2 className="mb-5 text-2xl font-bold text-slate-900">
                    {editingItem ? 'Sửa đồ dùng' : 'Thêm đồ dùng mới'}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Tên *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Kính bơi"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Loại *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Tổng số lượng *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.totalQuantity}
                        onChange={(e) => {
                          const nextTotalQuantity = parseInt(e.target.value) || 1;
                          setFormData({
                            ...formData,
                            totalQuantity: nextTotalQuantity,
                            availableQuantity: Math.min(formData.availableQuantity, nextTotalQuantity),
                          });
                        }}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Số lượng có sẵn *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formData.totalQuantity}
                        value={formData.availableQuantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            availableQuantity: Math.max(
                              0,
                              Math.min(parseInt(e.target.value) || 0, formData.totalQuantity)
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Tiền cọc *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.depositAmount}
                          onChange={(e) =>
                            setFormData({ ...formData, depositAmount: parseInt(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Phí thuê *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.rentalFee}
                          onChange={(e) =>
                            setFormData({ ...formData, rentalFee: parseInt(e.target.value) || 0 })
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Ảnh URL
                      </label>
                      <input
                        type="text"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                      />
                      {formData.imageUrl.trim() ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Preview ảnh
                            </span>
                            <span className="max-w-[70%] truncate text-xs text-slate-400">
                              {formData.imageUrl.trim()}
                            </span>
                          </div>
                          <div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
                            <img
                              src={formData.imageUrl.trim()}
                              alt={formData.name || 'Equipment preview'}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                          Chưa có ảnh để preview
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="good">Tốt</option>
                        <option value="fair">Bình thường</option>
                        <option value="maintenance">Bảo trì</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Kích hoạt đồ dùng</span>
                    </label>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Mô tả
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mô tả chi tiết..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 pb-2">
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingItem(null);
                        resetForm();
                      }}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={editingItem ? handleUpdateEquipment : handleAddEquipment}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang xử lý...' : editingItem ? 'Cập nhật' : 'Thêm'} đồ dùng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Safety Inspection Modal */}
          {showSafetyModal && safetyTarget && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-10">
              <div className="flex min-h-full items-start justify-center">
                <div className="my-8 w-full max-w-2xl max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                  <h2 className="mb-5 text-2xl font-bold text-slate-900">Kiểm tra an toàn</h2>
                  <p className="text-sm text-slate-600 mb-4">{safetyTarget.name}</p>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Tình trạng thiết bị</label>
                      <select value={safetyCondition} onChange={(e) => setSafetyCondition(e.target.value as any)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5">
                        <option value="GOOD">GOOD</option>
                        <option value="NEEDS_INSPECTION">NEEDS_INSPECTION</option>
                        <option value="DAMAGED">DAMAGED</option>
                        <option value="RETIRED">RETIRED</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Trạng thái an toàn</label>
                      <select value={safetyStatus} onChange={(e) => setSafetyStatus(e.target.value as any)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5">
                        <option value="COMPLIANT">COMPLIANT</option>
                        <option value="INSPECTION_DUE">INSPECTION_DUE</option>
                        <option value="BLOCKED">BLOCKED</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Ghi chú</label>
                      <textarea rows={3} value={safetyNote} onChange={(e) => setSafetyNote(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Ngày kiểm tra tiếp theo (tùy chọn)</label>
                      <input type="datetime-local" value={nextInspectionDueAt} onChange={(e) => setNextInspectionDueAt(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowSafetyModal(false); setSafetyTarget(null); }} disabled={isSubmitting} className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">Hủy</button>
                    <button onClick={handleSubmitSafetyInspection} disabled={isSubmitting} className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold">{isSubmitting ? 'Đang xử lý...' : 'Lưu kiểm tra'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
