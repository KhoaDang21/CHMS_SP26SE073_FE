import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, CheckCircle2, Gauge, Home, Loader2, LogOut, MapPinned, Menu, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { publicHomestayService } from '../../services/publicHomestayService';
import { staffBookingService } from '../../services/staffBookingService';
import { managerBookingService } from '../../services/managerBookingService';
import { adminBookingService } from '../../services/adminBookingService';
import type { Booking } from '../../types/booking.types';
import type { Homestay } from '../../types/homestay.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import { managerNavItems } from '../../config/managerNavItems';
import { staffNavItems } from '../../config/staffNavItems';
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
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]);
  const [loadingOperationData, setLoadingOperationData] = useState(false);

  const [rentBookingId, setRentBookingId] = useState('');
  const [rentBicycleId, setRentBicycleId] = useState('');
  const [returnRentalId, setReturnRentalId] = useState('');
  const [selectedDamageIds, setSelectedDamageIds] = useState<string[]>([]);

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
    if (!selectedHomestayId) {
      setBicycles([]);
      setDamageCatalogs([]);
      setLocalRoutes([]);
      return;
    }

    try {
      // Staff cần bicycles (để chọn xe bàn giao) và damageCatalogs (để chọn lỗi thu hồi)
      // Manager/Admin cần thêm localRoutes
      const requests: Promise<any[]>[] = [
        bicycleGamificationService.listBicycles(selectedHomestayId),
        bicycleGamificationService.listDamageCatalogs(selectedHomestayId),
      ];
      if (canManage) {
        requests.push(bicycleGamificationService.listLocalRoutes(selectedHomestayId));
      }

      const [bicycleList, damageList, routeList] = await Promise.all(requests);
      setBicycles(bicycleList);
      setDamageCatalogs(damageList);
      if (canManage) setLocalRoutes(routeList ?? []);
    } catch (error) {
      console.error('Refresh manager bicycle data error:', error);
      toast.error('Không thể tải dữ liệu quản lý xe đạp');
    }
  };

  const refreshOperationData = async () => {
    if (!selectedHomestayId) {
      setStaffBookings([]);
      return;
    }

    setLoadingOperationData(true);
    try {
      let bookingList: Booking[] = [];
      if (role === 'admin') {
        bookingList = await adminBookingService.getAllBookings();
      } else if (role === 'manager') {
        const raw = await managerBookingService.getBookings(1, 300);
        bookingList = raw as unknown as Booking[];
      } else {
        bookingList = await staffBookingService.getAllBookings();
      }

      const filtered = bookingList.filter((booking) => {
        const hId = String(booking.homestayId ?? '');
        const status = String(booking.status ?? '').toLowerCase();
        return hId === selectedHomestayId &&
          (status === 'confirmed' || status === 'checked_in');
      });
      setStaffBookings(filtered);
    } catch (error) {
      console.error('Refresh bicycle operation data error:', error);
      toast.error('Không thể tải danh sách booking cho thao tác xe đạp');
    } finally {
      setLoadingOperationData(false);
    }
  };

  useEffect(() => {
    void refreshManagerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHomestayId, canManage]);

  useEffect(() => {
    if (!selectedHomestayId) return;
    void refreshOperationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHomestayId]);

  const handleRent = async () => {
    if (!rentBookingId.trim() || !rentBicycleId.trim()) {
      toast.error('Vui lòng chọn booking và xe');
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
      await refreshManagerData();
      await refreshOperationData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnRentalId.trim()) {
      toast.error('Vui lòng nhập rentalId');
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.returnBicycle({
        rentalId: returnRentalId.trim(),
        damageCatalogIds: selectedDamageIds,
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể thu hồi xe');
        return;
      }

      toast.success(result.message || 'Thu hồi xe thành công');
      setReturnRentalId('');
      setSelectedDamageIds([]);
      await refreshManagerData();
      await refreshOperationData();
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
  const availableBicycles = bicycles.filter(
    (bicycle) => String(bicycle?.status || '').toUpperCase() === 'AVAILABLE',
  );

  return (
    <div className={`min-h-screen flex ${role === 'staff' ? 'bg-gray-50' : 'bg-gradient-to-br from-blue-50 to-cyan-50'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 ${styles.container} transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between p-6 border-b ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${styles.headerBg} rounded-lg flex items-center justify-center`}>
                {role === 'staff' ? <Home className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className={`text-xs ${role === 'staff' ? 'text-cyan-200' : 'text-gray-500'}`}>
                  {role?.toUpperCase() === 'MANAGER' ? 'Quản lý vận hành' : role?.toUpperCase() === 'ADMIN' ? 'Hệ thống quản trị' : 'Staff Portal'}
                </p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${item.id === 'bicycles' ? styles.navActive : styles.navInactive
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={`p-6 border-t ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${styles.userAvatarBg} flex items-center justify-center text-white font-bold text-lg`}>
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
                <h2 className="text-xl font-bold text-gray-900">Mini-game xe đạp</h2>
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
                  Trò chơi xe đạp
                </p>
                <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl">Vận hành xe đạp mini-game</h1>
              </div>

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
                {homestays.length === 0 ? (
                  <option value="">-- Chưa có homestay --</option>
                ) : (
                  homestays.map((homestay) => (
                    <option key={homestay.id} value={homestay.id}>
                      {homestay.name}
                    </option>
                  ))
                )}
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
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 text-xs text-cyan-800">
                        💡 Gợi ý: Chọn booking đang hoạt động từ danh sách bên dưới và chọn xe còn trống để bàn giao nhanh chóng.
                      </div>
                      {loadingOperationData ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải danh sách booking...
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Chọn Booking cần bàn giao xe</label>
                            <select
                              value={rentBookingId}
                              onChange={(e) => setRentBookingId(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="">-- Chọn booking --</option>
                              {staffBookings.map((booking) => (
                                <option key={booking.id} value={booking.id}>
                                  {booking.bookingCode} - {booking.customerName} ({booking.status === 'checked_in' ? 'Đã nhận phòng' : 'Đã xác nhận'})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Chọn Xe đang sẵn sàng</label>
                            <select
                              value={rentBicycleId}
                              onChange={(e) => setRentBicycleId(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="">-- Chọn xe --</option>
                              {availableBicycles.map((bicycle: any) => (
                                <option key={bicycle.id} value={String(bicycle.id)}>
                                  {String(bicycle.bicycleCode || 'Xe chưa mã')} - {String(bicycle.type || 'N/A')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleRent}
                        disabled={submitting || !rentBookingId || !rentBicycleId}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Bàn giao xe
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thu hồi xe & phạt hư hỏng</h2>
                    <div className="mt-4 space-y-3">
                      <input
                        value={returnRentalId}
                        onChange={(e) => setReturnRentalId(e.target.value)}
                        placeholder="Nhập rentalId (bắt buộc)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-sm font-medium text-gray-700">Chọn lỗi hư hỏng (nếu có)</p>
                        {damageCatalogs.length === 0 ? (
                          <p className="text-xs text-gray-500">Homestay chưa có bảng lỗi. Hệ thống sẽ thu hồi xe không tính phạt.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {damageCatalogs.map((damage: any) => {
                              const damageId = String(damage?.id || '');
                              const checked = selectedDamageIds.includes(damageId);
                              return (
                                <label key={damageId} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedDamageIds((prev) => [...prev, damageId]);
                                      } else {
                                        setSelectedDamageIds((prev) => prev.filter((id) => id !== damageId));
                                      }
                                    }}
                                  />
                                  <span>
                                    {String(damage?.damageName || 'Lỗi không tên')} - {Number(damage?.fineAmount || 0).toLocaleString('vi-VN')} VND
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mã xe</label>
                        <input
                          value={bicycleCode}
                          onChange={(e) => setBicycleCode(e.target.value)}
                          placeholder="Ví dụ: BK-001"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Loại xe</label>
                        <select
                          value={bicycleType}
                          onChange={(e) => setBicycleType(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="CITY">CITY</option>
                          <option value="MOUNTAIN">MOUNTAIN</option>
                          <option value="ELECTRIC">ELECTRIC</option>
                          <option value="ROAD">ROAD</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Giá thuê/ngày (VND)</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={pricePerDay}
                          onChange={(e) => setPricePerDay(e.target.value)}
                          placeholder="Ví dụ: 100000"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
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
                    {bicycles.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">Chưa có xe nào trong kho</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {bicycles.map((bicycle: any, index: number) => {
                          const code = String(bicycle?.bicycleCode || 'Chưa có mã');
                          const type = String(bicycle?.type || 'N/A');
                          const status = bicycle?.status;
                          const key = String(bicycle?.id || `${code}-${index}`);
                          const statusLabel = (() => {
                            const v = String(status ?? '').toUpperCase();
                            if (v === 'AVAILABLE') return { label: 'Sẵn sàng', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
                            if (v === 'IN_USE' || v === 'RENTED') return { label: 'Đang sử dụng', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
                            if (v === 'MAINTENANCE') return { label: 'Bảo trì', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
                            return { label: v || 'Không rõ', cls: 'bg-gray-100 text-gray-700 border-gray-200' };
                          })();
                          return (
                            <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-base font-semibold text-gray-900">{code}</p>
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusLabel.cls}`}>
                                  {statusLabel.label}
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">Loại xe</p>
                                  <p className="mt-1 font-medium text-gray-900">{type}</p>
                                </div>
                                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-emerald-600">Giá thuê/ngày</p>
                                  <p className="mt-1 font-medium text-gray-900">{Number(bicycle?.pricePerDay || 0).toLocaleString('vi-VN')} VND</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {canManage && activeTab === 'damage' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thêm lỗi hư hỏng</h2>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Tên lỗi hư hỏng</label>
                        <input
                          value={damageName}
                          onChange={(e) => setDamageName(e.target.value)}
                          placeholder="Ví dụ: Thủng lốp, Xước sơn, Lỗi phanh..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Số tiền phạt (VND)</label>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={fineAmount}
                          onChange={(e) => setFineAmount(e.target.value)}
                          placeholder="Ví dụ: 100000"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
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
                    {damageCatalogs.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">Chưa có mục phạt nào</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {damageCatalogs.map((damage: any, index: number) => (
                          <div key={String(damage?.id || index)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-base font-semibold text-gray-900">{index + 1}. {String(damage?.damageName || 'Lỗi không tên')}</p>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                {Number(damage?.fineAmount || 0).toLocaleString('vi-VN')} VND
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {canManage && activeTab === 'routes' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Tạo lộ trình mới</h2>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Tên lộ trình</label>
                        <input
                          value={routeName}
                          onChange={(e) => setRouteName(e.target.value)}
                          placeholder="Ví dụ: Tuyến biển sáng"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Polyline Map</label>
                        <input
                          value={polylineMap}
                          onChange={(e) => setPolylineMap(e.target.value)}
                          placeholder="Chuỗi encoded polyline"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Quãng đường (km)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(e.target.value)}
                            placeholder="Ví dụ: 5.5"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Thời gian (phút)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(e.target.value)}
                            placeholder="Ví dụ: 20"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Hidden Gems (JSON)</label>
                        <textarea
                          value={hiddenGemsJson}
                          onChange={(e) => setHiddenGemsJson(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                        />
                        <p className="text-xs text-gray-500">Mỗi gem cần: name, latitude, longitude, rewardPoints</p>
                      </div>
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
                    {localRoutes.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">Chưa có lộ trình nào</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {localRoutes.map((route: any, index: number) => {
                          const name = String(route?.routeName || route?.RouteName || `Lộ trình ${index + 1}`);
                          const gems = Array.isArray(route?.hiddenGems || route?.HiddenGems)
                            ? (route?.hiddenGems || route?.HiddenGems)
                            : [];
                          const key = String(route?.id || `${name}-${index}`);
                          return (
                            <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-base font-semibold text-gray-900">{name}</p>
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                  {gems.length} hidden gems
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">Quãng đường</p>
                                  <p className="mt-1 font-medium text-gray-900">{Number(route?.totalDistanceKm || 0).toLocaleString('vi-VN')} km</p>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-amber-600">Thời gian</p>
                                  <p className="mt-1 font-medium text-gray-900">{Number(route?.estimatedMinutes || 0)} phút</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${active
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
        </div>
      </div>
    </div>
  );
}
