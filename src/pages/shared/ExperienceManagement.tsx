import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CalendarDays,
  ListFilter,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Tag,
  Clock,
  Users,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { experienceService } from '../../services/experienceService';
import {
  experienceSchedulesService,
  type ExperienceSchedule,
  type ScheduleParticipant,
  type HiddenGemStepRequest,
  type ScheduleHiddenGem,
} from '../../services/experienceSchedulesService';

import { serviceCategoryService } from '../../services/serviceCategoryService';
import type {
  ExperienceCategory,
  ExperiencePayload,
  LocalExperience,
  ServiceCategoryPayload,
} from '../../types/experience.types';
import { adminNavItemsGrouped, managerNavItemsGrouped } from '../../config/adminNavItemsGrouped';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { homestayService } from '../../services/homestayService';
import type { Homestay } from '../../types/homestay.types';
import { employeeService } from '../../services/employeeService';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

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

type ActiveTab = 'categories' | 'services' | 'schedules' | 'hidden-gems';

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

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const pickProvinceValue = (item: any): { id: string | null; name: string | null } => {
  const provinceId =
    item?.managedProvinceId ||
    item?.assignedProvinceId ||
    item?.managedProvince?.id ||
    item?.assignedProvince?.id ||
    item?.provinceId ||
    null;

  const provinceName =
    item?.managedProvinceName ||
    item?.assignedProvinceName ||
    item?.managedProvince?.name ||
    item?.assignedProvince?.name ||
    item?.provinceName ||
    null;

  return {
    id: provinceId ? String(provinceId) : null,
    name: provinceName ? String(provinceName) : null,
  };
};

const homestayMatchesProvince = (
  homestay: Homestay,
  province: { id: string | null; name: string | null },
): boolean => {
  const homestayProvinceId = String((homestay as any)?.provinceId || '').trim();
  const homestayProvinceName = String(homestay?.provinceName || '').trim();

  if (province.id && homestayProvinceId) {
    return homestayProvinceId === province.id;
  }

  if (province.name && homestayProvinceName) {
    return normalizeText(homestayProvinceName) === normalizeText(province.name);
  }

  return false;
};

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
  const [managerProvince, setManagerProvince] = useState<{ id: string | null; name: string | null }>({
    id: null,
    name: null,
  });

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

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    experienceId: '',
    startDate: '',
    endDate: '',
    daysOfWeek: [] as number[],
    startTime: '08:00',
    endTime: '17:00',
    maxQuantity: 10,
  });
  const [creatingSchedules, setCreatingSchedules] = useState(false);
  const [lookupScheduleId, setLookupScheduleId] = useState('');
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState<ScheduleParticipant[]>([]);
  const [viewExperienceId, setViewExperienceId] = useState('');
  const [viewingSchedulesLoading, setViewingSchedulesLoading] = useState(false);
  const [viewingSchedules, setViewingSchedules] = useState<ExperienceSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [expandedStepEditorScheduleId, setExpandedStepEditorScheduleId] = useState('');
  const [creatingScheduleStep, setCreatingScheduleStep] = useState(false);

  // ── Tab Điểm đến ──────────────────────────────────────────────────────────
  const [gemTabExperienceId, setGemTabExperienceId] = useState('');
  const [gemTabSchedules, setGemTabSchedules] = useState<ExperienceSchedule[]>([]);
  const [gemTabSchedulesLoading, setGemTabSchedulesLoading] = useState(false);
  const [gemTabScheduleId, setGemTabScheduleId] = useState('');
  const [gemTabGems, setGemTabGems] = useState<ScheduleHiddenGem[]>([]);
  const [gemTabGemsLoading, setGemTabGemsLoading] = useState(false);
  const [gemTabTotal, setGemTabTotal] = useState(0);
  // ──────────────────────────────────────────────────────────────────────────

  const [scheduleStepForm, setScheduleStepForm] = useState({
    stepOrder: 1,
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    checkInRadiusMeters: '50',
    rewardPoints: '0',
    isRequired: true,
    createStep: true,
    localRouteId: '',
  });

  const groupedNavItems = isAdmin ? adminNavItemsGrouped : managerNavItemsGrouped;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [serviceList, categoryList, homeList] = await Promise.all([
        experienceService.list(),
        serviceCategoryService.list(),
        homestayService.getAllAdminHomestays(),
      ]);

      let province = { id: null as string | null, name: null as string | null };
      if (!isAdmin && user?.id) {
        const profile = await employeeService.getEmployeeById(String(user.id));
        if (profile) {
          province = pickProvinceValue(profile);
        }
      }

      const allowedHomestays = isAdmin
        ? homeList
        : homeList.filter((item) => homestayMatchesProvince(item, province));

      const allowedHomestayIds = new Set(allowedHomestays.map((item) => item.id));
      const scopedServices = isAdmin
        ? serviceList
        : serviceList.filter((item) => allowedHomestayIds.has(String(item.homestayId || '')));

      setManagerProvince(province);
      setServices(scopedServices);
      setCategories(categoryList);
      setHomestays(allowedHomestays);

      if (!isAdmin && !province.id && !province.name) {
        toast.warning('Bạn chưa được phân công tỉnh quản lý, danh sách dịch vụ sẽ trống.');
      }
    } catch (error) {
      console.error('Load experience management data error:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    if (!isAdmin && !homestays.some((item) => item.id === serviceForm.homestayId)) {
      toast.error('Homestay không thuộc tỉnh bạn được phân công');
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

  const handleLookupParticipants = async () => {
    const scheduleId = lookupScheduleId.trim();
    if (!scheduleId) {
      toast.error('Vui lòng nhập schedule ID');
      return;
    }

    setParticipantsLoading(true);
    try {
      const list = await experienceSchedulesService.getScheduleParticipants(scheduleId);
      setParticipants(list);
      if (list.length === 0) {
        toast.info('Không có người tham gia hoặc schedule chưa có dữ liệu');
      } else {
        toast.success(`Đã tải ${list.length} người tham gia`);
      }
    } catch (error) {
      console.error('Lookup participants error:', error);
      toast.error('Không thể tải danh sách người tham gia');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleViewSchedulesByExperience = async () => {
    const experienceId = viewExperienceId.trim();
    if (!experienceId) {
      toast.error('Vui lòng chọn dịch vụ');
      return;
    }

    setViewingSchedulesLoading(true);
    try {
      const list = await experienceSchedulesService.getSchedulesByExperienceId(experienceId);
      setViewingSchedules(list);
      if (list.length === 0) {
        toast.info('Chưa có lịch trình cho dịch vụ này');
      } else {
        toast.success(`Đã tải ${list.length} lịch trình`);
      }
    } catch (error) {
      console.error('View schedules error:', error);
      toast.error('Không thể tải lịch trình của dịch vụ');
    } finally {
      setViewingSchedulesLoading(false);
    }
  };

  const handleCreateScheduleStep = async () => {
    const scheduleId = selectedScheduleId.trim();
    if (!scheduleId) {
      toast.error('Vui lòng chọn lịch trình');
      return;
    }
    if (!scheduleStepForm.name.trim()) {
      toast.error('Vui lòng nhập tên điểm đến');
      return;
    }
    if (!scheduleStepForm.latitude.trim() || !scheduleStepForm.longitude.trim()) {
      toast.error('Vui lòng nhập tọa độ (latitude, longitude)');
      return;
    }

    const payload: HiddenGemStepRequest = {
      name: scheduleStepForm.name.trim(),
      description: scheduleStepForm.description.trim() || undefined,
      latitude: Number(scheduleStepForm.latitude),
      longitude: Number(scheduleStepForm.longitude),
      rewardPoints: scheduleStepForm.rewardPoints.trim() ? Number(scheduleStepForm.rewardPoints) : 0,
      createStep: scheduleStepForm.createStep,
      stepOrder: scheduleStepForm.stepOrder || 1,
      checkInRadiusMeters: scheduleStepForm.checkInRadiusMeters.trim() ? Number(scheduleStepForm.checkInRadiusMeters) : 50,
      isRequired: scheduleStepForm.isRequired,
      localRouteId: scheduleStepForm.localRouteId.trim() || undefined,
    };

    setCreatingScheduleStep(true);
    try {
      const result = await experienceSchedulesService.createHiddenGemStep(scheduleId, payload);
      if (!result.success) {
        toast.error(result.message || 'Không thể tạo hidden gem step');
        return;
      }

      toast.success(result.message || 'Tạo điểm đến và step thành công!');
      setScheduleStepForm((p) => ({
        ...p,
        stepOrder: p.stepOrder + 1,
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        checkInRadiusMeters: '50',
        rewardPoints: '0',
        isRequired: true,
        createStep: true,
        localRouteId: '',
      }));
    } catch (error) {
      console.error('Create hidden gem step error:', error);
      toast.error('Không thể tạo hidden gem step');
    } finally {
      setCreatingScheduleStep(false);
    }
  };

  const handleToggleScheduleStepEditor = (scheduleId: string) => {
    const nextExpandedScheduleId = expandedStepEditorScheduleId === scheduleId ? '' : scheduleId;
    setSelectedScheduleId(scheduleId);
    setExpandedStepEditorScheduleId(nextExpandedScheduleId);
  };

  // ── Tab Điểm đến: load schedules theo experience ──────────────────────────
  const loadGemTabSchedules = useCallback(async (experienceId: string) => {
    setGemTabExperienceId(experienceId);
    setGemTabScheduleId('');
    setGemTabGems([]);
    setGemTabTotal(0);
    if (!experienceId.trim()) {
      setGemTabSchedules([]);
      return;
    }
    setGemTabSchedulesLoading(true);
    try {
      const list = await experienceSchedulesService.getSchedulesByExperienceId(experienceId);
      setGemTabSchedules(list);
    } catch {
      toast.error('Không thể tải lịch trình');
      setGemTabSchedules([]);
    } finally {
      setGemTabSchedulesLoading(false);
    }
  }, []);

  // ── Tab Điểm đến: load hidden gems theo schedule ──────────────────────────
  const loadGemTabGems = useCallback(async (scheduleId: string) => {
    setGemTabScheduleId(scheduleId);
    if (!scheduleId.trim()) {
      setGemTabGems([]);
      setGemTabTotal(0);
      return;
    }
    setGemTabGemsLoading(true);
    try {
      const result = await experienceSchedulesService.getHiddenGemsBySchedule(scheduleId);
      if (result.success) {
        setGemTabGems(result.hiddenGems);
        setGemTabTotal(result.total);
      } else {
        toast.error(result.message || 'Không thể tải điểm đến');
        setGemTabGems([]);
        setGemTabTotal(0);
      }
    } catch {
      toast.error('Không thể tải điểm đến');
      setGemTabGems([]);
      setGemTabTotal(0);
    } finally {
      setGemTabGemsLoading(false);
    }
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

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

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          <AdminSidebar groupedItems={groupedNavItems} />
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
            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'schedules' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Lịch trình
            </button>
            <button
              onClick={() => setActiveTab('hidden-gems')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'hidden-gems' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Điểm đến
            </button>
          </div>

          {activeTab === 'services' && (
            <div className="space-y-4">
              {!isAdmin && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                  Phạm vi hiển thị theo tỉnh quản lý: {managerProvince.name || 'Chưa phân công'}
                </div>
              )}
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

          {activeTab === 'schedules' && (
            <div className="space-y-4">
              {!isAdmin && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                  Lịch trình cho tỉnh quản lý: {managerProvince.name || 'Chưa phân công'}
                </div>
              )}

              {showScheduleForm && (
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Tạo Lịch Trình Mới</h3>
                    <button
                      onClick={() => setShowScheduleForm(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!scheduleFormData.experienceId || !scheduleFormData.startDate || !scheduleFormData.endDate || scheduleFormData.daysOfWeek.length === 0) {
                      toast.error('Vui lòng điền đầy đủ thông tin');
                      return;
                    }
                    setCreatingSchedules(true);
                    try {
                      const result = await experienceSchedulesService.bulkCreateSchedules(scheduleFormData);
                      if (result.success) {
                        toast.success(result.message);
                        setShowScheduleForm(false);
                        setScheduleFormData({
                          experienceId: '',
                          startDate: '',
                          endDate: '',
                          daysOfWeek: [],
                          startTime: '08:00',
                          endTime: '17:00',
                          maxQuantity: 10,
                        });
                      } else {
                        toast.error(result.message);
                      }
                    } catch (error) {
                      toast.error('Lỗi khi tạo lịch trình');
                    } finally {
                      setCreatingSchedules(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dịch vụ <span className="text-red-500">*</span></label>
                      <select
                        value={scheduleFormData.experienceId}
                        onChange={(e) => setScheduleFormData(p => ({ ...p, experienceId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">-- Chọn dịch vụ --</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Ngày bắt đầu <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={scheduleFormData.startDate}
                          onChange={(e) => setScheduleFormData(p => ({ ...p, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Ngày kết thúc <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={scheduleFormData.endDate}
                          onChange={(e) => setScheduleFormData(p => ({ ...p, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trong tuần <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <label key={day.value} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={scheduleFormData.daysOfWeek.includes(day.value)}
                              onChange={(e) => setScheduleFormData(p => ({
                                ...p,
                                daysOfWeek: e.target.checked
                                  ? [...p.daysOfWeek, day.value]
                                  : p.daysOfWeek.filter(d => d !== day.value)
                              }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-gray-700">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Giờ bắt đầu <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={scheduleFormData.startTime}
                          onChange={(e) => setScheduleFormData(p => ({ ...p, startTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Giờ kết thúc <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={scheduleFormData.endTime}
                          onChange={(e) => setScheduleFormData(p => ({ ...p, endTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Số lượng tối đa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={scheduleFormData.maxQuantity}
                        onChange={(e) => setScheduleFormData(p => ({ ...p, maxQuantity: parseInt(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <button type="button" onClick={() => setShowScheduleForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Hủy
                      </button>
                      <button type="submit" disabled={creatingSchedules} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50">
                        {creatingSchedules ? 'Đang tạo...' : 'Tạo Lịch Trình'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {!showScheduleForm && (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                  >
                    <Plus className="w-5 h-5" />
                    Tạo Lịch Trình Mới
                  </button>

                  <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Tra cứu lịch trình theo Schedule ID</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Dùng API participants để xem danh sách người tham gia của một lịch trình.
                    </p>

                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        value={lookupScheduleId}
                        onChange={(e) => setLookupScheduleId(e.target.value)}
                        placeholder="Nhập schedule ID (GUID)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleLookupParticipants}
                        disabled={participantsLoading}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50"
                      >
                        {participantsLoading ? 'Đang tải...' : 'Xem người tham gia'}
                      </button>
                    </div>

                    <div className="mt-4">
                      {participantsLoading ? (
                        <div className="text-sm text-gray-500">Đang tải danh sách...</div>
                      ) : participants.length === 0 ? (
                        <div className="text-sm text-gray-500">Chưa có dữ liệu hiển thị.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full min-w-[680px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tên</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SĐT</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tham gia lúc</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {participants.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900">{p.name || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{p.email || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{p.phone || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{p.status || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {p.joinedAt ? new Date(p.joinedAt).toLocaleString('vi-VN') : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-cyan-700" />
                        <h4 className="font-semibold text-cyan-900">Xem lịch trình theo dịch vụ</h4>
                      </div>
                      {/* <p className="text-sm text-cyan-800">
                        Chọn một dịch vụ địa phương để xem các lịch trình hiện có từ API <span className="font-medium">/api/localexperienceschedule/experience/{`{experienceId}`}</span>.
                      </p> */}

                      <div className="flex flex-col lg:flex-row gap-3">
                        <select
                          value={viewExperienceId}
                          onChange={(e) => setViewExperienceId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-cyan-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">-- Chọn dịch vụ --</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} {service.homestayName ? `• ${service.homestayName}` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleViewSchedulesByExperience}
                          disabled={viewingSchedulesLoading}
                          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                        >
                          {viewingSchedulesLoading ? 'Đang tải...' : 'Xem lịch trình'}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {viewingSchedulesLoading ? (
                          <div className="text-sm text-cyan-800">Đang tải lịch trình...</div>
                        ) : viewingSchedules.length === 0 ? (
                          <div className="text-sm text-cyan-800">Chưa có lịch trình để hiển thị.</div>
                        ) : (
                          viewingSchedules.map((schedule) => {
                            const scheduleDate = schedule.date || schedule.availableDate || schedule.serviceDate || '';
                            const isSelected = selectedScheduleId === schedule.id;
                            const isExpanded = expandedStepEditorScheduleId === schedule.id;

                            return (
                              <div
                                key={schedule.id}
                                className={`rounded-lg border px-4 py-3 transition-colors ${isSelected ? 'border-cyan-400 bg-cyan-50' : 'border-cyan-100 bg-white'}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedScheduleId(schedule.id)}
                                  className="w-full text-left flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {scheduleDate ? new Date(scheduleDate).toLocaleDateString('vi-VN') : '—'}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {schedule.startTime ?? '—'} - {schedule.endTime ?? '—'}
                                      {typeof schedule.price === 'number' && schedule.price > 0 ? ` • ${schedule.price.toLocaleString('vi-VN')}đ` : ''}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 md:text-right">
                                    <div>Còn: {schedule.remainingSlots ?? schedule.maxParticipants ?? '-'}</div>
                                    <div className="text-xs">ID: {schedule.id}</div>
                                  </div>
                                </button>

                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleScheduleStepEditor(schedule.id)}
                                    className="px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 text-sm"
                                  >
                                    {isExpanded ? 'Ẩn tạo step' : 'Tạo step'}
                                  </button>
                                </div>

                                {isExpanded && (
                                  <div className="mt-4 rounded-xl border border-cyan-100 bg-white p-4 space-y-4">
                                    <div>
                                      <h5 className="font-semibold text-gray-900">Tạo điểm đến (Hidden Gem) cho lịch trình</h5>
                                      <p className="text-sm text-gray-500 mt-0.5">
                                        Tạo hidden gem mới và gắn vào lịch trình này trong một lần gọi.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Tên điểm đến <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          value={scheduleStepForm.name}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, name: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                          placeholder="Ví dụ: Đền Tháp Mộ"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Latitude <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          value={scheduleStepForm.latitude}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, latitude: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                          placeholder="Ví dụ: 13.6610"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Longitude <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          value={scheduleStepForm.longitude}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, longitude: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                          placeholder="Ví dụ: 109.2297"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính check-in (m)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={scheduleStepForm.checkInRadiusMeters}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, checkInRadiusMeters: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reward points</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={scheduleStepForm.rewardPoints}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, rewardPoints: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự step</label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={scheduleStepForm.stepOrder}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, stepOrder: parseInt(e.target.value) || 1 }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Local Route ID (tùy chọn)</label>
                                        <input
                                          value={scheduleStepForm.localRouteId}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, localRouteId: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                          placeholder="UUID của local route"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                      <textarea
                                        value={scheduleStepForm.description}
                                        onChange={(e) => setScheduleStepForm((p) => ({ ...p, description: e.target.value }))}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Mô tả chi tiết về điểm đến"
                                      />
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={scheduleStepForm.createStep}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, createStep: e.target.checked }))}
                                        />
                                        Tạo HIDDEN_GEM step ngay
                                      </label>
                                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={scheduleStepForm.isRequired}
                                          onChange={(e) => setScheduleStepForm((p) => ({ ...p, isRequired: e.target.checked }))}
                                        />
                                        Bắt buộc check-in
                                      </label>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                      <button
                                        type="button"
                                        onClick={() => setScheduleStepForm({
                                          stepOrder: 1,
                                          name: '',
                                          description: '',
                                          latitude: '',
                                          longitude: '',
                                          checkInRadiusMeters: '50',
                                          rewardPoints: '0',
                                          isRequired: true,
                                          createStep: true,
                                          localRouteId: '',
                                        })}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                      >
                                        Làm mới
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCreateScheduleStep}
                                        disabled={creatingScheduleStep}
                                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                                      >
                                        {creatingScheduleStep ? 'Đang tạo...' : 'Tạo điểm đến'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center py-4 text-gray-500">
                Tạo lịch trình mới, nhập schedule ID để xem người tham gia, hoặc chọn dịch vụ để xem lịch trình
              </div>
            </div>
          )}

          {activeTab === 'hidden-gems' && (
            <div className="space-y-4">
              {/* Info banner */}
              {!isAdmin && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                  Xem điểm check-in (hidden gems) theo lịch trình của tỉnh: <span className="font-semibold">{managerProvince.name || 'Chưa phân công'}</span>
                </div>
              )}

              {/* Bộ lọc: chọn Experience → Schedule */}
              <div className="bg-white rounded-xl shadow-md p-5 border border-gray-200 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                  Chọn tour và lịch trình
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Dropdown Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tour (dịch vụ)</label>
                    <div className="relative">
                      <select
                        value={gemTabExperienceId}
                        onChange={(e) => void loadGemTabSchedules(e.target.value)}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                      >
                        <option value="">-- Chọn tour --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}{s.homestayName ? ` • ${s.homestayName}` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dropdown Schedule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lịch trình</label>
                    <div className="relative">
                      <select
                        value={gemTabScheduleId}
                        onChange={(e) => void loadGemTabGems(e.target.value)}
                        disabled={!gemTabExperienceId || gemTabSchedulesLoading}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">
                          {gemTabSchedulesLoading ? 'Đang tải...' : '-- Chọn lịch trình --'}
                        </option>
                        {gemTabSchedules.map((sch) => {
                          const d = sch.date || sch.availableDate || sch.serviceDate || '';
                          const dateLabel = d ? new Date(d).toLocaleDateString('vi-VN') : '—';
                          const shortId = sch.id.slice(0, 8);
                          return (
                            <option key={sch.id} value={sch.id}>
                              {dateLabel} • {sch.startTime ?? '—'} - {sch.endTime ?? '—'} • {shortId}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {gemTabScheduleId && (
                      <p className="mt-1 text-xs text-gray-400">Schedule ID: {gemTabScheduleId}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Danh sách hidden gems */}
              {gemTabScheduleId && (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                      <h4 className="font-semibold text-gray-900">Điểm check-in</h4>
                      {!gemTabGemsLoading && (
                        <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                          {gemTabTotal} điểm
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => void loadGemTabGems(gemTabScheduleId)}
                      disabled={gemTabGemsLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {gemTabGemsLoading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                  </div>

                  {/* Body */}
                  {gemTabGemsLoading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                      <div className="text-center space-y-2">
                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Đang tải điểm đến...</p>
                      </div>
                    </div>
                  ) : gemTabGems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <MapPin className="w-10 h-10 opacity-30" />
                      <p className="text-sm">Chưa có điểm check-in nào cho lịch trình này</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {gemTabGems.map((gem, idx) => (
                        <div key={gem.stepId} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                          {/* Step order badge */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-bold">
                            {gem.stepOrder || idx + 1}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900">{gem.name}</p>
                                {gem.description && (
                                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{gem.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {gem.isRequired && (
                                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-600 font-medium">
                                    Bắt buộc
                                  </span>
                                )}
                                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {gem.latitude.toFixed(4)}, {gem.longitude.toFixed(4)}
                              </span>
                              {gem.checkInRadiusMeters !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  Bán kính: {gem.checkInRadiusMeters}m
                                </span>
                              )}
                              {gem.rewardPoints !== undefined && (
                                <span className="font-semibold text-cyan-600">
                                  {gem.rewardPoints} điểm
                                </span>
                              )}
                              {gem.localRouteName && (
                                <span className="text-gray-400">Route: {gem.localRouteName}</span>
                              )}
                            </div>

                            <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
                              <span>Step ID: {gem.stepId.slice(0, 8)}…</span>
                              <span>Gem ID: {gem.hiddenGemId.slice(0, 8)}…</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Placeholder khi chưa chọn schedule */}
              {!gemTabScheduleId && gemTabExperienceId && !gemTabSchedulesLoading && gemTabSchedules.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-400">
                  Tour này chưa có lịch trình nào.
                </div>
              )}
              {!gemTabExperienceId && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-400">
                  Chọn tour và lịch trình để xem danh sách điểm check-in.
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

