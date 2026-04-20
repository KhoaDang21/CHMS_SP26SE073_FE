import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, CheckCircle2, Gauge, Loader2, LogOut, MapPinned, Menu, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { publicHomestayService } from '../../services/publicHomestayService';
import type { Homestay } from '../../types/homestay.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import { managerNavItems } from '../../config/managerNavItems';
import {
  bicycleGamificationService,
  type HiddenGemPayload,
} from '../../services/bicycleGamificationService';

const tabs = [
  { key: 'operation', label: 'Bàn giao & Thu hồi', icon: Bike },
  { key: 'bicycles', label: 'Kho xe đạp', icon: Gauge },
  { key: 'damage', label: 'Bảng phạt hư hỏng', icon: ShieldAlert },
  { key: 'routes', label: 'Lộ trình & Hidden Gems', icon: MapPinned },
] as const;

const staffNavItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/staff/dashboard' },
  { id: 'bookings', label: 'Bookings', path: '/staff/bookings' },
  { id: 'reviews', label: 'Reviews', path: '/staff/reviews' },
  { id: 'bicycles', label: 'Mini-game xe đạp', path: '/staff/bicycles' },
  { id: 'travel-guides', label: 'Cẩm nang du lịch', path: '/travel-guides' },
  { id: 'tickets', label: 'Tickets', path: '/staff/tickets' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const getText = (value: unknown, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const extractAssignedHomestayIds = (employee: any): string[] => {
  const rawIds = Array.isArray(employee?.assignedHomestayIds) ? employee.assignedHomestayIds : [];
  const fromIds = rawIds.map((item: unknown) => String(item ?? '').trim()).filter(Boolean);

  const fromObjects = Array.isArray(employee?.assignedHomestays)
    ? employee.assignedHomestays
        .map((item: any) => String(item?.id ?? item?.homestayId ?? '').trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...fromIds, ...fromObjects]));
};

const homestayMatchesAnyAssignedHome = (homestay: Homestay, assignedIds: string[]): boolean => {
  const homestayId = String(homestay?.id ?? '').trim();
  if (homestayId && assignedIds.includes(homestayId)) {
    return true;
  }

  const homestayName = String(homestay?.name ?? '').trim();
  if (homestayName) {
    return assignedIds.some((assigned) => normalizeText(assigned) === normalizeText(homestayName));
  }

  return false;
};

export default function BicycleGamificationPage() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const role = user?.role;
  const canManage = role === 'admin' || role === 'manager';
  const isAllowed = role === 'admin' || role === 'manager' || role === 'staff';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [selectedHomestayId, setSelectedHomestayId] = useState('');
  const [assignedHomestayIds, setAssignedHomestayIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('operation');

  const [bicycles, setBicycles] = useState<any[]>([]);
  const [damageCatalogs, setDamageCatalogs] = useState<any[]>([]);
  const [localRoutes, setLocalRoutes] = useState<any[]>([]);

  const [rentBookingId, setRentBookingId] = useState('');
  const [rentBicycleId, setRentBicycleId] = useState('');
  const [returnRentalId, setReturnRentalId] = useState('');
  const [returnDamageIds, setReturnDamageIds] = useState('');

  const [bicycleCode, setBicycleCode] = useState('');
  const [bicycleType, setBicycleType] = useState('CITY');
  const [pricePerDay, setPricePerDay] = useState('100000');

  const [damageName, setDamageName] = useState('');
  const [fineAmount, setFineAmount] = useState('50000');

  const [routeName, setRouteName] = useState('');
  const [polylineMap, setPolylineMap] = useState('');
  const [distanceKm, setDistanceKm] = useState('2');
  const [estimatedMinutes, setEstimatedMinutes] = useState('20');
  const [hiddenGemsJson, setHiddenGemsJson] = useState('[\n  {"name": "Quán cà phê ven biển", "latitude": 16.0678, "longitude": 108.2208, "rewardPoints": 10}\n]');

  const navItems = role === 'admin'
    ? adminNavItems
    : role === 'manager'
      ? managerNavItems
      : staffNavItems;

  const visibleTabs = useMemo(() => {
    if (canManage) return tabs;
    return tabs.filter((tab) => tab.key === 'operation');
  }, [canManage]);

  useEffect(() => {
    if (!isAllowed) {
      toast.error('Bạn không có quyền truy cập chức năng này');
      navigate('/', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const paged = await publicHomestayService.list({ page: 1, pageSize: 300 });
        const list = paged.Items || [];

        if (role === 'staff') {
          const staffId = String(user?.id || '').trim();
          const profile = staffId ? await employeeService.getEmployeeById(staffId) : null;
          const ids = extractAssignedHomestayIds(profile);
          const filtered = ids.length > 0
            ? list.filter((homestay) => homestayMatchesAnyAssignedHome(homestay, ids))
            : [];

          setAssignedHomestayIds(ids);
          setHomestays(filtered);

          if (filtered.length > 0) {
            setSelectedHomestayId((prev) => (filtered.some((homestay) => homestay.id === prev) ? prev : filtered[0].id));
          } else {
            setSelectedHomestayId('');
            toast.warning('Bạn chưa được phân công homestay nào cho chức năng này.');
          }
        } else {
          setAssignedHomestayIds([]);
          setHomestays(list);
          if (list.length > 0) {
            setSelectedHomestayId((prev) => prev || list[0].id);
          }
        }
      } catch (error) {
        console.error('Load homestays error:', error);
        toast.error('Không thể tải danh sách homestay');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAllowed, navigate]);

  const refreshManagerData = async () => {
    if (!canManage || !selectedHomestayId) {
      setBicycles([]);
      setDamageCatalogs([]);
      setLocalRoutes([]);
      return;
    }

    try {
      const [bicycleList, damageList, routeList] = await Promise.all([
        bicycleGamificationService.listBicycles(selectedHomestayId),
        bicycleGamificationService.listDamageCatalogs(selectedHomestayId),
        bicycleGamificationService.listLocalRoutes(selectedHomestayId),
      ]);
      setBicycles(bicycleList);
      setDamageCatalogs(damageList);
      setLocalRoutes(routeList);
    } catch (error) {
      console.error('Refresh manager bicycle data error:', error);
      toast.error('Không thể tải dữ liệu quản lý xe đạp');
    }
  };

  useEffect(() => {
    void refreshManagerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHomestayId, canManage]);

  const handleRent = async () => {
    if (!rentBookingId.trim() || !rentBicycleId.trim()) {
      toast.error('Vui lòng nhập bookingId và bicycleId');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.rent({
        bookingId: rentBookingId.trim(),
        bicycleId: rentBicycleId.trim(),
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể bàn giao xe');
        return;
      }

      toast.success(result.message || 'Bàn giao xe thành công');
      setRentBookingId('');
      setRentBicycleId('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnRentalId.trim()) {
      toast.error('Vui lòng nhập rentalId');
      return;
    }

    const damageIds = returnDamageIds
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.returnBicycle({
        rentalId: returnRentalId.trim(),
        damageCatalogIds: damageIds,
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể thu hồi xe');
        return;
      }

      toast.success(result.message || 'Thu hồi xe thành công');
      setReturnRentalId('');
      setReturnDamageIds('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBicycle = async () => {
    if (!bicycleCode.trim()) {
      toast.error('Vui lòng nhập mã xe');
      return;
    }

    if (!selectedHomestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.createBicycle({
        homestayId: selectedHomestayId,
        bicycleCode: bicycleCode.trim(),
        type: bicycleType.trim(),
        pricePerDay: toNumber(pricePerDay),
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể thêm xe');
        return;
      }

      toast.success(result.message || 'Thêm xe thành công');
      setBicycleCode('');
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDamage = async () => {
    if (!damageName.trim()) {
      toast.error('Vui lòng nhập tên lỗi');
      return;
    }

    if (!selectedHomestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.createDamageCatalog({
        homestayId: selectedHomestayId,
        damageName: damageName.trim(),
        fineAmount: toNumber(fineAmount),
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể thêm lỗi hư hỏng');
        return;
      }

      toast.success(result.message || 'Đã thêm lỗi hư hỏng');
      setDamageName('');
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const parseHiddenGems = (): HiddenGemPayload[] => {
    const parsed = JSON.parse(hiddenGemsJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        name: getText((item as any)?.name),
        latitude: Number((item as any)?.latitude),
        longitude: Number((item as any)?.longitude),
        rewardPoints: Number((item as any)?.rewardPoints || 0),
      }))
      .filter((item) => item.name && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  };

  const handleCreateRoute = async () => {
    if (!selectedHomestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }

    if (!routeName.trim() || !polylineMap.trim()) {
      toast.error('Vui lòng nhập tên lộ trình và polylineMap');
      return;
    }

    let hiddenGems: HiddenGemPayload[] = [];
    try {
      hiddenGems = parseHiddenGems();
    } catch {
      toast.error('JSON Hidden Gems không hợp lệ');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.createLocalRoute({
        homestayId: selectedHomestayId,
        routeName: routeName.trim(),
        totalDistanceKm: toNumber(distanceKm),
        estimatedMinutes: toNumber(estimatedMinutes),
        polylineMap: polylineMap.trim(),
        hiddenGems,
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể tạo lộ trình');
        return;
      }

      toast.success(result.message || 'Tạo lộ trình thành công');
      setRouteName('');
      setPolylineMap('');
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAllowed) return null;

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const getSidebarStyles = () => {
    if (role === 'staff') {
      return {
        container: 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white',
        border: 'border-cyan-500/30',
        headerBg: 'bg-white/20',
        userAvatarBg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
        navActive: 'bg-white/20 text-white font-medium',
        navInactive: 'text-cyan-100 hover:bg-white/10',
        hoverText: 'text-cyan-100 hover:bg-white/10',
      };
    }
    // Admin & Manager: white sidebar
    return {
      container: 'bg-white shadow-lg text-gray-900',
      border: 'border-gray-200',
      headerBg: 'bg-transparent',
      userAvatarBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      navActive: 'bg-blue-50 text-blue-600 font-medium',
      navInactive: 'text-gray-700 hover:bg-gray-50',
      hoverText: 'text-gray-700 hover:bg-gray-50',
    };
  };

  const styles = getSidebarStyles();

  return (
    <div className={`min-h-screen flex ${role === 'staff' ? 'bg-gray-50' : 'bg-gradient-to-br from-blue-50 to-cyan-50'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 ${styles.container} transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between p-6 border-b ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${styles.headerBg} rounded-lg flex items-center justify-center`}>
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className={`text-xs ${role === 'staff' ? 'text-cyan-200' : 'text-gray-500'}`}>
                  {role?.toUpperCase() === 'MANAGER' ? 'Quản lý vận hành' : role?.toUpperCase() === 'ADMIN' ? 'Management System' : 'Staff Portal'}
                </p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className={`p-6 border-b ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${styles.userAvatarBg} flex items-center justify-center ${role === 'staff' ? 'text-white' : 'text-white'} font-bold text-lg`}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${role === 'staff' ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name ?? 'User'}
                </p>
                <RoleBadge role={user?.role || 'staff'} size="sm" />
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  item.id === 'bicycles' ? styles.navActive : styles.navInactive
                }`}
              >
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className={`p-4 border-t ${styles.border}`}>
            <button
              onClick={handleLogout}
              type="button"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${styles.hoverText}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex-1 lg:ml-64 transition-colors ${role === 'staff' ? 'bg-gray-50' : 'bg-gradient-to-br from-blue-50 to-cyan-50'}`}>
        {/* Header */}
        <header className={`border-b sticky top-0 z-40 ${role === 'staff' ? 'bg-white border-gray-200' : 'bg-white/50 backdrop-blur border-gray-200/50'}`}>
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
                <h2 className="text-xl font-bold text-gray-900">Mini-game Xe Đạp</h2>
                <p className="text-sm text-gray-500">Vận hành gamification cho khách</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                  <Bike className="h-4 w-4" />
                  Bicycle Gamification
                </p>
                <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl">Vận hành xe đạp mini-game</h1>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm text-gray-700">
                <p>
                  Role hiện tại: <span className="font-semibold uppercase text-cyan-700">{role}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-200 hover:text-cyan-700'
                    }`}
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Homestay</label>
              <select
                value={selectedHomestayId}
                onChange={(e) => setSelectedHomestayId(e.target.value)}
                className="min-w-[260px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                {homestays.map((homestay) => (
                  <option key={homestay.id} value={homestay.id}>
                    {homestay.name}
                  </option>
                ))}
              </select>
            </div>
            {role === 'staff' && assignedHomestayIds.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Danh sách này chỉ gồm homestay được phân công cho bạn.
              </p>
            )}
          </section>

          {loading ? (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {activeTab === 'operation' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Bàn giao xe cho khách</h2>
                    <p className="mt-1 text-sm text-gray-500">POST /api/gamification-bicycles/rent</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={rentBookingId}
                        onChange={(e) => setRentBookingId(e.target.value)}
                        placeholder="bookingId"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={rentBicycleId}
                        onChange={(e) => setRentBicycleId(e.target.value)}
                        placeholder="bicycleId"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRent}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Bàn giao xe
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thu hồi xe & phạt hư hỏng</h2>
                    <p className="mt-1 text-sm text-gray-500">POST /api/gamification-bicycles/return</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={returnRentalId}
                        onChange={(e) => setReturnRentalId(e.target.value)}
                        placeholder="rentalId"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={returnDamageIds}
                        onChange={(e) => setReturnDamageIds(e.target.value)}
                        placeholder="damageCatalogIds (cách nhau bằng dấu phẩy)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleReturn}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Thu hồi xe
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {canManage && activeTab === 'bicycles' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thêm xe mới</h2>
                    <p className="mt-1 text-sm text-gray-500">POST /api/manager/bicycles</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={bicycleCode}
                        onChange={(e) => setBicycleCode(e.target.value)}
                        placeholder="bicycleCode"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={bicycleType}
                        onChange={(e) => setBicycleType(e.target.value)}
                        placeholder="type"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={pricePerDay}
                        onChange={(e) => setPricePerDay(e.target.value)}
                        placeholder="pricePerDay"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateBicycle}
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Thêm xe
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-900">Danh sách xe</h3>
                    <p className="mt-1 text-sm text-gray-500">GET /api/manager/bicycles/{'{homestayId}'}</p>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                      {JSON.stringify(bicycles, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {canManage && activeTab === 'damage' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thêm lỗi hư hỏng</h2>
                    <p className="mt-1 text-sm text-gray-500">POST /api/manager/bicycles/damage-catalogs</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={damageName}
                        onChange={(e) => setDamageName(e.target.value)}
                        placeholder="damageName"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={fineAmount}
                        onChange={(e) => setFineAmount(e.target.value)}
                        placeholder="fineAmount"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateDamage}
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Thêm lỗi
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-900">Danh sách bảng phạt</h3>
                    <p className="mt-1 text-sm text-gray-500">GET /api/manager/bicycles/damage-catalogs/{'{homestayId}'}</p>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                      {JSON.stringify(damageCatalogs, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {canManage && activeTab === 'routes' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Tạo lộ trình mới</h2>
                    <p className="mt-1 text-sm text-gray-500">POST /api/manager/bicycles/local-routes</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="routeName"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={polylineMap}
                        onChange={(e) => setPolylineMap(e.target.value)}
                        placeholder="polylineMap"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        placeholder="distanceKm"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(e.target.value)}
                        placeholder="estimatedMinutes"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <textarea
                        value={hiddenGemsJson}
                        onChange={(e) => setHiddenGemsJson(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateRoute}
                        disabled={submitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Tạo lộ trình
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-900">Danh sách lộ trình</h3>
                    <p className="mt-1 text-sm text-gray-500">GET /api/manager/bicycles/local-routes/{'{homestayId}'}</p>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                      {JSON.stringify(localRoutes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
