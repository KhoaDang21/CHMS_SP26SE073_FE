import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  BadgePercent,
  Ticket,
  Clock3,
  CircleCheck,
  CircleX,
  Eye,
  Gift,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { promotionService } from '../../services/promotionService';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import type {
  Promotion,
  PromotionStatus,
  PromotionType,
  DiscountType,
  CreatePromotionDTO,
  UpdatePromotionDTO,
} from '../../types/promotion.types';

const initialForm: CreatePromotionDTO = {
  name: '',
  description: '',
  code: '',
  type: 'DISCOUNT_PERCENTAGE',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  maxDiscount: undefined,
  minBookingValue: undefined,
  startDate: '',
  endDate: '',
  maxUses: undefined,
  applicableHomestays: [],
};

const statusMeta: Record<PromotionStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Đang hoạt động', className: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Tạm tắt', className: 'bg-gray-100 text-gray-700' },
  ARCHIVED: { label: 'Lưu trữ', className: 'bg-red-100 text-red-700' },
};

const typeMeta: Record<PromotionType, { label: string; className: string }> = {
  DISCOUNT_PERCENTAGE: { label: 'Giảm %', className: 'bg-blue-100 text-blue-700' },
  DISCOUNT_FIXED: { label: 'Giảm tiền', className: 'bg-purple-100 text-purple-700' },
  COUPON: { label: 'Coupon', className: 'bg-orange-100 text-orange-700' },
  FLASH_SALE: { label: 'Flash sale', className: 'bg-pink-100 text-pink-700' },
  SEASONAL: { label: 'Theo mùa', className: 'bg-cyan-100 text-cyan-700' },
};

const discountTypeLabel: Record<DiscountType, string> = {
  PERCENTAGE: 'Phần trăm',
  FIXED_AMOUNT: 'Số tiền cố định',
};

function safeList(response: any): Promotion[] {
  if (Array.isArray(response)) return response;
  const data = response?.data ?? response?.result ?? response;
  if (Array.isArray(data)) return data;
  return (data?.items ?? data?.Items ?? data?.promotions ?? data?.data ?? []) as Promotion[];
}

function toCurrency(value?: number) {
  if (!value) return '0 ₫';
  return `${Number(value).toLocaleString('vi-VN')} ₫`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
}

export default function PromotionManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PromotionType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<CreatePromotionDTO>(initialForm);

  const user = authService.getCurrentUser();

  useEffect(() => {
    void loadPromotions();
  }, []);

  const navItems = adminNavItems;

  const stats = useMemo(() => {
    return {
      total: promotions.length,
      active: promotions.filter((item) => item.status === 'ACTIVE').length,
      inactive: promotions.filter((item) => item.status === 'INACTIVE').length,
      archived: promotions.filter((item) => item.status === 'ARCHIVED').length,
    };
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    let list = [...promotions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.code?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((item) => item.type === typeFilter);
    }

    return list;
  }, [promotions, searchQuery, statusFilter, typeFilter]);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const response = await promotionService.getAdminList();
      setPromotions(safeList(response));
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast.error('Không thể tải danh sách promotion');
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingPromotion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name || '',
      description: promotion.description || '',
      code: promotion.code || '',
      type: promotion.type,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscount: promotion.maxDiscount,
      minBookingValue: promotion.minBookingValue,
      startDate: promotion.startDate ? promotion.startDate.slice(0, 10) : '',
      endDate: promotion.endDate ? promotion.endDate.slice(0, 10) : '',
      maxUses: promotion.maxUses,
      applicableHomestays: promotion.applicableHomestays || [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFieldChange = <K extends keyof CreatePromotionDTO>(field: K, value: CreatePromotionDTO[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: PromotionType) => {
    const nextDiscountType: DiscountType = type === 'DISCOUNT_FIXED' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
    setFormData((prev) => ({
      ...prev,
      type,
      discountType: nextDiscountType,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên promotion');
      return;
    }
    if (!formData.code?.trim()) {
      toast.error('Vui lòng nhập mã coupon');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Vui lòng chọn thời gian áp dụng');
      return;
    }

    const payload: CreatePromotionDTO | UpdatePromotionDTO = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      applicableHomestays: formData.applicableHomestays?.filter(Boolean),
    };

    try {
      const result = editingPromotion
        ? await promotionService.updatePromotion(editingPromotion.id, payload)
        : await promotionService.createPromotion(payload as CreatePromotionDTO);

      const success = Boolean((result as any)?.success ?? result);
      if (success) {
        toast.success(editingPromotion ? 'Cập nhật promotion thành công' : 'Tạo promotion thành công');
        closeModal();
        void loadPromotions();
        return;
      }

      const message = (result as any)?.message || 'Không thể lưu promotion';
      toast.error(message);
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast.error('Không thể lưu promotion');
    }
  };

  const handleDelete = async (promotion: Promotion) => {
    const confirmed = window.confirm(`Xóa promotion "${promotion.name}"?`);
    if (!confirmed) return;

    try {
      const result = await promotionService.deletePromotion(promotion.id);
      if ((result as any)?.success ?? true) {
        toast.success('Xóa promotion thành công');
        void loadPromotions();
        return;
      }
      toast.error((result as any)?.message || 'Không thể xóa promotion');
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Không thể xóa promotion');
    }
  };

  const handleToggleStatus = async (promotion: Promotion) => {
    try {
      const result = await promotionService.toggleStatus(promotion.id);
      if ((result as any)?.success ?? true) {
        toast.success('Cập nhật trạng thái thành công');
        void loadPromotions();
        return;
      }
      toast.error((result as any)?.message || 'Không thể cập nhật trạng thái');
    } catch (error) {
      console.error('Error toggling promotion status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
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

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'promotions';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
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
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
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
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Promotion</h2>
                <p className="text-gray-600 text-sm">Tạo, cập nhật và theo dõi chương trình khuyến mãi</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm promotion</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng promotion</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-blue-600" />
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
                  <CircleCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tạm tắt</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inactive}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CircleX className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Lưu trữ</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.archived}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Clock3 className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã coupon, mô tả..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PromotionStatus | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Tạm tắt</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>

              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as PromotionType | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="DISCOUNT_PERCENTAGE">Giảm %</option>
                  <option value="DISCOUNT_FIXED">Giảm tiền</option>
                  <option value="COUPON">Coupon</option>
                  <option value="FLASH_SALE">Flash sale</option>
                  <option value="SEASONAL">Theo mùa</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredPromotions.length}</span> / {stats.total} promotion
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang tải danh sách promotion...</p>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy promotion nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPromotions.map((promotion) => (
                <div key={promotion.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <h3 className="font-bold text-gray-900 text-lg">{promotion.name}</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta[promotion.status].className}`}>
                                {statusMeta[promotion.status].label}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeMeta[promotion.type].className}`}>
                                {typeMeta[promotion.type].label}
                              </span>
                            </div>
                            <p className="text-blue-600 font-medium">Mã: {promotion.code || '-'}</p>
                            {promotion.description && <p className="text-gray-600 text-sm mt-1">{promotion.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setSelectedPromotion(promotion)}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Chi tiết</span>
                            </button>
                            <button
                              onClick={() => openEditModal(promotion)}
                              className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Sửa</span>
                            </button>
                            <button
                              onClick={() => handleDelete(promotion)}
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-xs text-gray-500 mb-1">Loại giảm giá</p>
                            <p className="font-semibold text-gray-900">{discountTypeLabel[promotion.discountType]}</p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-xs text-gray-500 mb-1">Giá trị giảm</p>
                            <p className="font-semibold text-gray-900">
                              {promotion.discountType === 'PERCENTAGE' ? `${promotion.discountValue}%` : toCurrency(promotion.discountValue)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-xs text-gray-500 mb-1">Giảm tối đa</p>
                            <p className="font-semibold text-gray-900">{promotion.maxDiscount ? toCurrency(promotion.maxDiscount) : 'Không giới hạn'}</p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-xs text-gray-500 mb-1">Lượt dùng</p>
                            <p className="font-semibold text-gray-900">
                              {promotion.usedCount || 0}
                              {promotion.maxUses ? ` / ${promotion.maxUses}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Thời gian: {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</p>
                            <p>Đơn tối thiểu: {promotion.minBookingValue ? toCurrency(promotion.minBookingValue) : 'Không yêu cầu'}</p>
                            <p>Áp dụng homestay: {promotion.applicableHomestays?.length ? promotion.applicableHomestays.length : 'Tất cả'}</p>
                          </div>

                          <button
                            onClick={() => handleToggleStatus(promotion)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${promotion.status === 'ACTIVE' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
                          >
                            <BadgePercent className="w-4 h-4" />
                            <span>{promotion.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</span>
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

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-2xl font-bold">{editingPromotion ? 'Chỉnh sửa promotion' : 'Tạo promotion mới'}</h2>
                <p className="text-blue-100 text-sm">Thiết lập chương trình khuyến mãi cho admin</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên promotion</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Giảm hè 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mã coupon</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="SUMMER2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại promotion</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as PromotionType)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DISCOUNT_PERCENTAGE">Giảm %</option>
                    <option value="DISCOUNT_FIXED">Giảm tiền</option>
                    <option value="COUPON">Coupon</option>
                    <option value="FLASH_SALE">Flash sale</option>
                    <option value="SEASONAL">Theo mùa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại chiết khấu</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => handleFieldChange('discountType', e.target.value as DiscountType)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PERCENTAGE">Phần trăm</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Nội dung khuyến mãi"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giá trị giảm</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => handleFieldChange('discountValue', Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giảm tối đa</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscount ?? ''}
                    onChange={(e) => handleFieldChange('maxDiscount', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Đơn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minBookingValue ?? ''}
                    onChange={(e) => handleFieldChange('minBookingValue', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFieldChange('startDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleFieldChange('endDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUses ?? ''}
                    onChange={(e) => handleFieldChange('maxUses', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Homestay áp dụng</label>
                <input
                  type="text"
                  value={formData.applicableHomestays?.join(', ') || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'applicableHomestays',
                      e.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập id homestay, cách nhau bởi dấu phẩy. Để trống nếu áp dụng tất cả"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {editingPromotion ? 'Cập nhật' : 'Tạo promotion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPromotion && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-2xl font-bold">Chi tiết promotion</h2>
                <p className="text-blue-100 text-sm">{selectedPromotion.name}</p>
              </div>
              <button onClick={() => setSelectedPromotion(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMeta[selectedPromotion.status].className}`}>
                  {statusMeta[selectedPromotion.status].label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeMeta[selectedPromotion.type].className}`}>
                  {typeMeta[selectedPromotion.type].label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Mã coupon</p>
                  <p className="font-semibold text-gray-900">{selectedPromotion.code || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Giảm giá</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPromotion.discountType === 'PERCENTAGE'
                      ? `${selectedPromotion.discountValue}%`
                      : toCurrency(selectedPromotion.discountValue)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Thời gian</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedPromotion.startDate)} - {formatDate(selectedPromotion.endDate)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Lượt dùng</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPromotion.usedCount || 0}
                    {selectedPromotion.maxUses ? ` / ${selectedPromotion.maxUses}` : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Đơn tối thiểu</p>
                  <p className="font-semibold text-gray-900">{selectedPromotion.minBookingValue ? toCurrency(selectedPromotion.minBookingValue) : 'Không yêu cầu'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Homestay áp dụng</p>
                  <p className="font-semibold text-gray-900">{selectedPromotion.applicableHomestays?.length ? selectedPromotion.applicableHomestays.join(', ') : 'Tất cả'}</p>
                </div>
              </div>

              {selectedPromotion.description && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-500 mb-1">Mô tả</p>
                  <p className="text-gray-900">{selectedPromotion.description}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedPromotion(null)}
                  className="px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
