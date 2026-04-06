import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Home,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  X,
  Pencil,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { experienceService } from '../../services/experienceService';
import { serviceCategoryService } from '../../services/serviceCategoryService';
import type {
  ExperienceCategory,
  ExperiencePayload,
  LocalExperience,
  ServiceCategoryPayload,
} from '../../types/experience.types';
import { adminNavItems } from '../../config/adminNavItems';
import { homestayService } from '../../services/homestayService';
import type { Homestay } from '../../types/homestay.types';

const managerNavItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
  { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
  { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
  { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
  { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
  { id: 'experiences', label: 'Dịch vụ địa phương', icon: Sparkles, path: '/manager/experiences' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
] as const;

const initialServiceForm: ExperiencePayload = {
  homestayId: '',
  categoryId: '',
  name: '',
  description: '',
  price: undefined,
  unit: '',
  imageUrl: '',
};

const initialCategoryForm: ServiceCategoryPayload = {
  name: '',
  type: '',
  description: '',
  iconUrl: '',
  isActive: true,
};

type ActiveTab = 'categories' | 'services';

const isValidHttpUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const fallbackExperienceImage = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80';

export default function ExperienceManagement() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [services, setServices] = useState<LocalExperience[]>([]);
  const [categories, setCategories] = useState<ExperienceCategory[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('services');

  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<LocalExperience | null>(null);
  const [serviceForm, setServiceForm] = useState<ExperiencePayload>(initialServiceForm);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExperienceCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<ServiceCategoryPayload>(initialCategoryForm);

  const navItems = isAdmin ? adminNavItems : managerNavItems;

  const loadData = async () => {
    setLoading(true);
    try {
      const [serviceList, categoryList, homeList] = await Promise.all([
        experienceService.list(),
        serviceCategoryService.list(),
        homestayService.getAllAdminHomestays(),
      ]);
      setServices(serviceList);
      setCategories(categoryList);
      setHomestays(homeList);
    } catch (error) {
      console.error('Load experience management data error:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    services.forEach((s) => {
      const key = s.categoryId || '';
      if (!key) return;
      usage[key] = (usage[key] || 0) + 1;
    });
    return usage;
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((item) => {
      const matchSearch = !q
        || item.name.toLowerCase().includes(q)
        || (item.description || '').toLowerCase().includes(q)
        || (item.homestayName || '').toLowerCase().includes(q)
        || (item.categoryName || '').toLowerCase().includes(q);
      const matchCategory = serviceCategoryFilter === 'all' || (item.categoryId || '') === serviceCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [services, serviceSearch, serviceCategoryFilter]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((cat) => {
      if (!q) return true;
      return cat.name.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
    });
  }, [categories, categorySearch]);

  const activeCategories = useMemo(
    () => categories.filter((x) => x.isActive !== false),
    [categories],
  );

  const openCreateService = () => {
    setEditingService(null);
    setServiceForm(initialServiceForm);
    setShowServiceModal(true);
  };

  const openEditService = (item: LocalExperience) => {
    setEditingService(item);
    setServiceForm({
      homestayId: item.homestayId || '',
      categoryId: item.categoryId || '',
      name: item.name,
      description: item.description || '',
      price: item.price,
      unit: item.unit || '',
      imageUrl: item.imageUrl || '',
    });
    setShowServiceModal(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(initialCategoryForm);
    setShowCategoryModal(true);
  };

  const openEditCategory = (item: ExperienceCategory) => {
    setEditingCategory(item);
    setCategoryForm({
      name: item.name,
      type: item.type || '',
      description: item.description || '',
      iconUrl: item.iconUrl || '',
      isActive: item.isActive !== false,
    });
    setShowCategoryModal(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.homestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }
    if (!serviceForm.categoryId) {
      toast.error('Vui lòng chọn danh mục');
      return;
    }
    if (!serviceForm.name?.trim()) {
      toast.error('Vui lòng nhập tên dịch vụ');
      return;
    }
    if (serviceForm.imageUrl?.trim() && serviceForm.imageUrl.trim().startsWith('data:')) {
      toast.error('Image URL phải là đường dẫn ảnh hợp lệ, không dùng base64/data URI');
      return;
    }
    if (!isValidHttpUrl(serviceForm.imageUrl || '')) {
      toast.error('Image URL không hợp lệ');
      return;
    }

    setSavingService(true);
    try {
      const payload: ExperiencePayload = {
        homestayId: serviceForm.homestayId,
        categoryId: serviceForm.categoryId,
        name: serviceForm.name.trim(),
        description: serviceForm.description?.trim(),
        price: serviceForm.price,
        unit: serviceForm.unit?.trim(),
        imageUrl: serviceForm.imageUrl?.trim(),
      };

      const result = editingService
        ? await experienceService.update(editingService.id, payload)
        : await experienceService.create(payload);

      if (!result.success) {
        toast.error(result.message || 'Không thể lưu dịch vụ');
        return;
      }

      toast.success(editingService ? 'Cập nhật dịch vụ thành công' : 'Tạo dịch vụ thành công');
      setShowServiceModal(false);
      await loadData();
    } finally {
      setSavingService(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name?.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    setSavingCategory(true);
    try {
      const payload: ServiceCategoryPayload = {
        name: categoryForm.name.trim(),
        type: categoryForm.type?.trim(),
        description: categoryForm.description?.trim(),
        iconUrl: categoryForm.iconUrl?.trim(),
        isActive: categoryForm.isActive ?? true,
      };

      const result = editingCategory
        ? await serviceCategoryService.update(editingCategory.id, payload)
        : await serviceCategoryService.create(payload);

      if (!result.success) {
        toast.error(result.message || 'Không thể lưu danh mục');
        return;
      }

      toast.success(editingCategory ? 'Cập nhật danh mục thành công' : 'Tạo danh mục thành công');
      setShowCategoryModal(false);
      await loadData();
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteService = async (item: LocalExperience) => {
    if (!confirm(`Bạn có chắc muốn xóa dịch vụ "${item.name}"?`)) return;

    const result = await experienceService.remove(item.id);
    if (!result.success) {
      toast.error(result.message || 'Không thể xóa dịch vụ');
      return;
    }
    toast.success('Xóa dịch vụ thành công');
    await loadData();
  };

  const handleDeleteCategory = async (item: ExperienceCategory) => {
    const used = categoryUsage[item.id] || 0;
    if (used > 0) {
      toast.error(`Danh mục đang được dùng bởi ${used} dịch vụ, không thể xóa`);
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${item.name}"?`)) return;

    const result = await serviceCategoryService.remove(item.id);
    if (!result.success) {
      toast.error(result.message || 'Không thể xóa danh mục');
      return;
    }
    toast.success('Xóa danh mục thành công');
    await loadData();
  };

  const handleToggleServiceStatus = async (item: LocalExperience) => {
    const result = await experienceService.updateStatus(item.id, !item.isActive);
    if (!result.success) {
      toast.error(result.message || 'Không thể cập nhật trạng thái');
      return;
    }
    await loadData();
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
              <h1 className="font-bold text-gray-900">{isAdmin ? 'CHMS Admin' : 'CHMS Manager'}</h1>
              <p className="text-xs text-gray-500">Quản lý dịch vụ địa phương</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'experiences';
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
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? 'User'}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quản lý dịch vụ địa phương</h2>
                <p className="text-sm text-gray-500">Quản lý danh mục và dịch vụ đi kèm cho local experiences</p>
              </div>
            </div>
            <button
              onClick={activeTab === 'services' ? openCreateService : openCreateCategory}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'services' ? 'Tạo dịch vụ' : 'Tạo danh mục'}
            </button>
          </div>
        </header>

        <div className="p-6 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Danh mục dịch vụ
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'services' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Dịch vụ
            </button>
          </div>

          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Tìm theo tên, mô tả, homestay..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="relative">
                    <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={serviceCategoryFilter}
                      onChange={(e) => setServiceCategoryFilter(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10 text-gray-500">Đang tải...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredServices.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="mb-3 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        <img
                          src={item.imageUrl || fallbackExperienceImage}
                          alt={item.name}
                          className="h-40 w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = fallbackExperienceImage;
                          }}
                        />
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{item.categoryName || 'Không phân loại'}</p>
                        </div>
                        <button
                          onClick={() => handleToggleServiceStatus(item)}
                          className={`text-xs px-2 py-1 rounded-full border ${item.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                        >
                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
                      )}

                      <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          <span>{typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')}đ` : 'Giá liên hệ'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{item.unit || 'Đơn vị chưa cập nhật'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{item.homestayName || 'Không rõ homestay'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditService(item)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteService(item)}
                          className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Tìm danh mục..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Danh mục</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Loại</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mô tả</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Số dịch vụ</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCategories.map((cat) => {
                      const used = categoryUsage[cat.id] || 0;
                      const active = cat.isActive !== false;
                      return (
                        <tr key={cat.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {cat.iconUrl ? (
                                <img
                                  src={cat.iconUrl}
                                  alt={cat.name}
                                  className="w-6 h-6 rounded object-cover border border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div className="font-medium text-gray-900">{cat.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{cat.type || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{cat.description || '-'}</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{used}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditCategory(cat)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-sm text-red-600"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showServiceModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8"
          onClick={() => setShowServiceModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingService ? 'Chỉnh sửa dịch vụ' : 'Tạo dịch vụ mới'}</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Homestay *</label>
                  <select
                    value={serviceForm.homestayId}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, homestayId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Chọn homestay</option>
                    {homestays.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Danh mục *</label>
                  <select
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Chọn danh mục</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Tên dịch vụ *</label>
                  <input
                    value={serviceForm.name || ''}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Giá (VND)</label>
                  <input
                    type="number"
                    min={0}
                    value={serviceForm.price ?? ''}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Đơn vị</label>
                  <input
                    value={serviceForm.unit ?? ''}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    value={serviceForm.imageUrl || ''}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                  <p className="mt-1 text-xs text-gray-500">Chỉ nên nhập URL ảnh công khai. Không dán chuỗi base64/data URI.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    rows={3}
                    value={serviceForm.description || ''}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 shrink-0 bg-white">
              <button
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveService}
                disabled={savingService}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg disabled:opacity-60"
              >
                {savingService ? 'Đang lưu...' : editingService ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingCategory ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên danh mục *</label>
                <input
                  value={categoryForm.name || ''}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Loại (type)</label>
                <input
                  value={categoryForm.type || ''}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ví dụ: outdoor, activity, food"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  rows={3}
                  value={categoryForm.description || ''}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Icon URL</label>
                <input
                  value={categoryForm.iconUrl || ''}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, iconUrl: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive ?? true}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Kích hoạt danh mục
              </label>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 shrink-0 bg-white">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={savingCategory}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg disabled:opacity-60"
              >
                {savingCategory ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

