import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Building2, CheckCircle2, Gauge, Loader2, LogOut, MapPinned, Menu, ShieldAlert, X } from 'lucide-react';
import { decode, encode } from '@googlemaps/polyline-codec';
import type { LeafletMouseEvent } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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
  { key: 'bicycles', label: 'Kho xe đạp', icon: Gauge },
  { key: 'routes', label: 'Lộ trình & Hidden Gems', icon: MapPinned },
  { key: 'operation', label: 'Bàn giao & Thu hồi', icon: Bike },
  { key: 'damage', label: 'Bảng phạt hư hỏng', icon: ShieldAlert },
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

const formatCurrencyVnd = (value: unknown): string => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat('vi-VN').format(safeAmount)} VND`;
};

const getStatusLabel = (status: unknown): string => {
  const value = String(status ?? '').toUpperCase();
  if (value === 'AVAILABLE') return 'Sẵn sàng';
  if (value === 'RENTED') return 'Đang cho thuê';
  if (value === 'MAINTENANCE') return 'Bảo trì';
  if (value === 'INACTIVE') return 'Ngừng hoạt động';
  return value || 'Không rõ';
};

const getStatusClassName = (status: unknown): string => {
  const value = String(status ?? '').toUpperCase();
  if (value === 'AVAILABLE') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'RENTED') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (value === 'MAINTENANCE') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (value === 'INACTIVE') return 'bg-gray-100 text-gray-700 border-gray-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const formatDistanceKm = (value: unknown): string => {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return '0 km';
  return `${distance.toLocaleString('vi-VN')} km`;
};

const formatDurationMinutes = (value: unknown): string => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 phút';
  if (minutes < 60) return `${minutes.toLocaleString('vi-VN')} phút`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain > 0 ? `${hours} giờ ${remain} phút` : `${hours} giờ`;
};

const pickRouteValue = (route: any, keys: string[]): unknown => {
  for (const key of keys) {
    if (route?.[key] !== undefined && route?.[key] !== null) {
      return route[key];
    }
  }
  return undefined;
};

interface RoutePoint {
  latitude: number;
  longitude: number;
  label: string;
}

type RoutePointTarget = 'start' | 'stop' | 'end';

const VIETNAM_CENTER: [number, number] = [16.0, 108.0];
const VIETNAM_ZOOM = 6;

const RouteMapClickHandler = ({ onClick }: { onClick: (latitude: number, longitude: number) => void }) => {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
};

const RouteMapAutoFit = ({
  points,
  trigger,
}: {
  points: Array<Pick<RoutePoint, 'latitude' | 'longitude'>>;
  trigger: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 15, { animate: true, duration: 0.4 });
      return;
    }

    map.fitBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number]),
      { padding: [28, 28], maxZoom: 16 },
    );
  }, [map, points, trigger]);

  return null;
};

const RouteMapFlyTo = ({
  target,
}: {
  target: { latitude: number; longitude: number; zoom: number; trigger: number } | null;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.latitude, target.longitude], target.zoom, { animate: true, duration: 0.5 });
  }, [map, target]);

  return null;
};

const encodePolyline = (points: Array<Pick<RoutePoint, 'latitude' | 'longitude'>>): string => {
  const path: [number, number][] = points.map((point) => [point.latitude, point.longitude]);
  return encode(path, 5);
};

const decodePolyline = (value: unknown): Array<[number, number]> => {
  const text = String(value ?? '').trim();
  if (!text) {
    return [];
  }

  try {
    return decode(text, 5) as Array<[number, number]>;
  } catch {
    return [];
  }
};

const RoutePolylinePreview = ({ polyline }: { polyline: unknown }) => {
  const points = decodePolyline(polyline);

  if (points.length === 0) {
    return (
      <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        Chưa có dữ liệu map để hiển thị
      </div>
    );
  }

  return (
    <div className="mt-2 h-48 overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={points[0]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RouteMapAutoFit points={points.map((point) => ({ latitude: point[0], longitude: point[1] }))} trigger={points.length} />
        {points.length > 1 && (
          <Polyline positions={points} pathOptions={{ color: '#0891b2', weight: 4 }} />
        )}
        {points.map((point, index) => (
          <CircleMarker
            key={`${point[0]}-${point[1]}-${index}`}
            center={point}
            radius={4}
            pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9 }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const getHomestayProvinceId = (homestay: any): string => {
  return String(
    homestay?.provinceId ||
      homestay?.ProvinceId ||
      homestay?.province?.id ||
      homestay?.Province?.Id ||
      '',
  );
};

const getHomestayProvinceName = (homestay: any): string => {
  return String(homestay?.provinceName || homestay?.ProvinceName || '').trim();
};

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
  const homestayProvinceId = getHomestayProvinceId(homestay);
  const homestayProvinceName = getHomestayProvinceName(homestay);

  if (province.id && homestayProvinceId) {
    return homestayProvinceId === province.id;
  }

  if (province.name && homestayProvinceName) {
    return normalizeText(homestayProvinceName) === normalizeText(province.name);
  }

  return false;
};

export default function ManagerBicycleGamificationPage() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isAllowed = role === 'admin' || role === 'manager';

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [selectedHomestayId, setSelectedHomestayId] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('bicycles');

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
  const [bicycleStatus, setBicycleStatus] = useState('AVAILABLE');

  const [damageName, setDamageName] = useState('');
  const [fineAmount, setFineAmount] = useState('50000');

  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [polylineMap, setPolylineMap] = useState('');
  const [totalDistanceKm, setTotalDistanceKm] = useState('2');
  const [estimatedMinutes, setEstimatedMinutes] = useState('20');
  const [routeStartLabel, setRouteStartLabel] = useState('Điểm bắt đầu');
  const [routeStartLatitude, setRouteStartLatitude] = useState('');
  const [routeStartLongitude, setRouteStartLongitude] = useState('');
  const [routeEndLabel, setRouteEndLabel] = useState('Điểm kết thúc');
  const [routeEndLatitude, setRouteEndLatitude] = useState('');
  const [routeEndLongitude, setRouteEndLongitude] = useState('');
  const [routeStopLabel, setRouteStopLabel] = useState('');
  const [routeStopLatitude, setRouteStopLatitude] = useState('');
  const [routeStopLongitude, setRouteStopLongitude] = useState('');
  const [routeStops, setRouteStops] = useState<RoutePoint[]>([]);
  const [routePointTarget, setRoutePointTarget] = useState<RoutePointTarget>('start');
  const [mapFitTrigger, setMapFitTrigger] = useState(1);
  const [mapFlyTarget, setMapFlyTarget] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
    trigger: number;
  } | null>(null);
  const [enableHiddenGems, setEnableHiddenGems] = useState(false);
  const [showHiddenGemsPanel, setShowHiddenGemsPanel] = useState(false);
  const [hiddenGems, setHiddenGems] = useState<HiddenGemPayload[]>([]);
  const [hiddenGemName, setHiddenGemName] = useState('');
  const [hiddenGemDescription, setHiddenGemDescription] = useState('');
  const [hiddenGemLatitude, setHiddenGemLatitude] = useState('');
  const [hiddenGemLongitude, setHiddenGemLongitude] = useState('');
  const [hiddenGemRewardPoints, setHiddenGemRewardPoints] = useState('10');

  const navItems = isAdmin ? adminNavItems : managerNavItems;

  useEffect(() => {
    if (!isAllowed) {
      toast.error('Bạn không có quyền truy cập chức năng này');
      navigate('/', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const userId = String(user?.id || '').trim();
        const provinceSource = userId ? await employeeService.getEmployeeById(userId) : null;
        const assignedProvince = provinceSource ? pickProvinceValue(provinceSource) : { id: null, name: null };

        if (!assignedProvince.id && !assignedProvince.name) {
          setHomestays([]);
          setSelectedHomestayId('');
          toast.warning('Bạn chưa được phân công tỉnh quản lý.');
          return;
        }

        const paged = await publicHomestayService.list({ page: 1, pageSize: 300 });
        const list = paged.Items || [];
        const filtered = list.filter((homestay) => homestayMatchesProvince(homestay, assignedProvince));

        setHomestays(filtered);

        if (filtered.length > 0) {
          setSelectedHomestayId((prev) => {
            const stillValid = filtered.some((homestay) => homestay.id === prev);
            return stillValid ? prev : filtered[0].id;
          });
        } else {
          setSelectedHomestayId('');
          toast.warning('Không có homestay nào thuộc tỉnh bạn được phân công.');
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
  }, [selectedHomestayId]);

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
        status: bicycleStatus.trim(),
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
    if (!enableHiddenGems) return [];

    return hiddenGems
      .map((item) => ({
        name: getText(item?.name),
        description: getText(item?.description),
        latitude: Number(item?.latitude),
        longitude: Number(item?.longitude),
        rewardPoints: Number(item?.rewardPoints || 0),
      }))
      .filter((item) => item.name && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  };

  const hasValidStartAndEnd = () => {
    const startLatitude = Number(routeStartLatitude);
    const startLongitude = Number(routeStartLongitude);
    const endLatitude = Number(routeEndLatitude);
    const endLongitude = Number(routeEndLongitude);

    return (
      Number.isFinite(startLatitude) &&
      Number.isFinite(startLongitude) &&
      Number.isFinite(endLatitude) &&
      Number.isFinite(endLongitude)
    );
  };

  const getDraftStopPoint = (): RoutePoint | null => {
    const latitude = Number(routeStopLatitude);
    const longitude = Number(routeStopLongitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      label: getText(routeStopLabel, `Điểm dừng ${routeStops.length + 1}`),
    };
  };

  const getRoutePoints = (): RoutePoint[] => {
    const startLatitude = Number(routeStartLatitude);
    const startLongitude = Number(routeStartLongitude);
    const endLatitude = Number(routeEndLatitude);
    const endLongitude = Number(routeEndLongitude);

    const points: RoutePoint[] = [];

    if (Number.isFinite(startLatitude) && Number.isFinite(startLongitude)) {
      points.push({
        latitude: startLatitude,
        longitude: startLongitude,
        label: getText(routeStartLabel, 'Điểm bắt đầu'),
      });
    }

    points.push(...routeStops);

    const draftStop = getDraftStopPoint();
    if (draftStop) {
      points.push(draftStop);
    }

    if (Number.isFinite(endLatitude) && Number.isFinite(endLongitude)) {
      points.push({
        latitude: endLatitude,
        longitude: endLongitude,
        label: getText(routeEndLabel, 'Điểm kết thúc'),
      });
    }

    return points;
  };

  const handleAddRouteStop = () => {
    const draftStop = getDraftStopPoint();
    if (!draftStop) {
      toast.error('Vui lòng nhập latitude và longitude hợp lệ');
      return;
    }

    setRouteStops((prev) => [
      ...prev,
      draftStop,
    ]);

    setRouteStopLabel('');
    setRouteStopLatitude('');
    setRouteStopLongitude('');
  };

  const handleGeneratePolyline = () => {
    if (!hasValidStartAndEnd()) {
      toast.error('Cần nhập đủ điểm bắt đầu và điểm kết thúc');
      return;
    }

    const routePoints = getRoutePoints();

    if (routePoints.length < 2) {
      toast.error('Cần có điểm bắt đầu và điểm kết thúc để tạo polylineMap');
      return;
    }

    setPolylineMap(encodePolyline(routePoints));
    toast.success('Đã tạo polylineMap từ các điểm tuyến đường');
  };

  const handleMapPickPoint = (latitude: number, longitude: number) => {
    const latText = latitude.toFixed(6);
    const lngText = longitude.toFixed(6);

    if (routePointTarget === 'start') {
      setRouteStartLatitude(latText);
      setRouteStartLongitude(lngText);
      return;
    }

    if (routePointTarget === 'end') {
      setRouteEndLatitude(latText);
      setRouteEndLongitude(lngText);
      return;
    }

    setRouteStopLatitude(latText);
    setRouteStopLongitude(lngText);
  };

  const getCurrentTargetCoordinates = (target: RoutePointTarget) => {
    if (target === 'start') {
      const latitude = Number(routeStartLatitude);
      const longitude = Number(routeStartLongitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }

    if (target === 'end') {
      const latitude = Number(routeEndLatitude);
      const longitude = Number(routeEndLongitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }

    const latitude = Number(routeStopLatitude);
    const longitude = Number(routeStopLongitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  };

  const handleSelectMapTarget = (target: RoutePointTarget) => {
    setRoutePointTarget(target);

    const coordinates = getCurrentTargetCoordinates(target);
    if (!coordinates) {
      return;
    }

    setMapFlyTarget({
      ...coordinates,
      zoom: 16,
      trigger: Date.now(),
    });
  };

  const handleMapJumpToCurrentTarget = () => {
    const coordinates = getCurrentTargetCoordinates(routePointTarget);

    if (!coordinates) {
      toast.error('Mục đang chọn chưa có tọa độ hợp lệ để nhảy nhanh');
      return;
    }

    setMapFlyTarget({
      ...coordinates,
      zoom: 16,
      trigger: Date.now(),
    });
  };

  const handleMapFitRoute = () => {
    const points = getRoutePoints();
    if (points.length === 0) {
      toast.error('Chưa có điểm nào để fit bản đồ');
      return;
    }

    setMapFitTrigger((prev) => prev + 1);
  };

  const handleMapGoToVietnam = () => {
    setMapFlyTarget({
      latitude: VIETNAM_CENTER[0],
      longitude: VIETNAM_CENTER[1],
      zoom: VIETNAM_ZOOM,
      trigger: Date.now(),
    });
  };

  const handleClearRouteStops = () => {
    setRouteStops([]);
    setRouteStopLabel('');
    setRouteStopLatitude('');
    setRouteStopLongitude('');
    setPolylineMap('');
  };

  const handleCreateRoute = async () => {
    if (!selectedHomestayId) {
      toast.error('Vui lòng chọn homestay');
      return;
    }

    if (!routeName.trim()) {
      toast.error('Vui lòng nhập tên lộ trình');
      return;
    }

    if (!hasValidStartAndEnd()) {
      toast.error('Vui lòng nhập đủ điểm bắt đầu và điểm kết thúc');
      return;
    }

    const routePoints = getRoutePoints();

    if (routePoints.length < 2) {
      toast.error('Vui lòng nhập điểm bắt đầu và điểm kết thúc');
      return;
    }

    const hiddenGems = parseHiddenGems();

    setSubmitting(true);
    try {
      const generatedPolyline = polylineMap.trim() || encodePolyline(routePoints);
      const result = await bicycleGamificationService.createLocalRoute({
        homestayId: selectedHomestayId,
        routeName: routeName.trim(),
        description: routeDescription.trim(),
        totalDistanceKm: toNumber(totalDistanceKm),
        estimatedMinutes: toNumber(estimatedMinutes),
        polylineMap: generatedPolyline,
        hiddenGems,
      });

      if (!result.success) {
        toast.error(result.message || 'Không thể tạo lộ trình');
        return;
      }

      toast.success(result.message || 'Tạo lộ trình thành công');
      setRouteName('');
      setRouteDescription('');
      setPolylineMap('');
      setRouteStartLabel('Điểm bắt đầu');
      setRouteStartLatitude('');
      setRouteStartLongitude('');
      setRouteEndLabel('Điểm kết thúc');
      setRouteEndLatitude('');
      setRouteEndLongitude('');
      handleClearRouteStops();
      setEnableHiddenGems(false);
      setShowHiddenGemsPanel(false);
      setHiddenGems([]);
      setHiddenGemName('');
      setHiddenGemDescription('');
      setHiddenGemLatitude('');
      setHiddenGemLongitude('');
      setHiddenGemRewardPoints('10');
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHiddenGem = () => {
    const latitude = Number(hiddenGemLatitude);
    const longitude = Number(hiddenGemLongitude);

    if (!hiddenGemName.trim()) {
      toast.error('Vui lòng nhập tên hidden gem');
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Vui lòng nhập latitude/longitude hidden gem hợp lệ');
      return;
    }

    setHiddenGems((prev) => [
      ...prev,
      {
        name: hiddenGemName.trim(),
        description: hiddenGemDescription.trim(),
        latitude,
        longitude,
        rewardPoints: toNumber(hiddenGemRewardPoints),
      },
    ]);

    setHiddenGemName('');
    setHiddenGemDescription('');
    setHiddenGemLatitude('');
    setHiddenGemLongitude('');
    setHiddenGemRewardPoints('10');
  };

  if (!isAllowed) return null;

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const routePreviewPoints = getRoutePoints();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-gray-900">CHMS {isAdmin ? 'Admin' : 'Manager'}</h1>
                <p className="text-xs text-gray-500">{isAdmin ? 'Management System' : 'Quản lý vận hành'}</p>
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

          <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'bicycles';
              return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
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
                {user?.name?.charAt(0)?.toUpperCase() ?? (isAdmin ? 'A' : 'M')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.name ?? (isAdmin ? 'Admin' : 'Manager')}</p>
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
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700"
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
        <div className="px-6 py-6 lg:px-8">
          <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700">
                  <Bike className="h-4 w-4" />
                  Bicycle Gamification
                </p>
                <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl">Vận hành xe đạp mini-game</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Quản lý kho xe, bảng phạt, lộ trình và phục vụ bàn giao/thu hồi xe cho khách.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm text-gray-700">
                <p>
                  Role hiện tại: <span className="font-semibold uppercase text-cyan-700">{role}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {tabs.map((tab) => {
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

              {activeTab === 'bicycles' && (
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

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                        <select
                          value={bicycleStatus}
                          onChange={(e) => setBicycleStatus(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="RENTED">RENTED</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
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
                        <p className="mt-1 text-xs text-gray-500">Hãy thêm xe mới để bắt đầu vận hành mini-game.</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {bicycles.map((bicycle: any, index: number) => {
                          const bicycleCodeText = getText(bicycle?.bicycleCode, 'Chưa có mã xe');
                          const bicycleTypeText = getText(bicycle?.type, 'N/A');
                          const status = bicycle?.status;
                          const bicycleKey = getText(bicycle?.id, `${bicycleCodeText}-${index}`);

                          return (
                            <div key={bicycleKey} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-gray-900">{bicycleCodeText}</p>
                                </div>
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(status)}`}>
                                  {getStatusLabel(status)}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">Loại xe</p>
                                  <p className="mt-1 font-medium text-gray-900">{bicycleTypeText}</p>
                                </div>
                                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-emerald-600">Giá thuê/ngày</p>
                                  <p className="mt-1 font-medium text-gray-900">{formatCurrencyVnd(bicycle?.pricePerDay)}</p>
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

              {activeTab === 'damage' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Thêm lỗi hư hỏng</h2>
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
                    <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                      {JSON.stringify(damageCatalogs, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'routes' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">Tạo lộ trình mới</h2>
                    <div className="mt-4 space-y-4">
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
                        <label className="text-sm font-medium text-gray-700">Mô tả lộ trình</label>
                        <input
                          value={routeDescription}
                          onChange={(e) => setRouteDescription(e.target.value)}
                          placeholder="Ví dụ: Tuyến đạp xe check-in bãi biển"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Tổng quãng đường (km)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={totalDistanceKm}
                            onChange={(e) => setTotalDistanceKm(e.target.value)}
                            placeholder="Ví dụ: 5.5"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Thời gian ước tính (phút)</label>
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

                      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Điểm bắt đầu</p>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              value={routeStartLabel}
                              onChange={(e) => setRouteStartLabel(e.target.value)}
                              placeholder="Tên điểm bắt đầu"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeStartLatitude}
                              onChange={(e) => setRouteStartLatitude(e.target.value)}
                              placeholder="Latitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeStartLongitude}
                              onChange={(e) => setRouteStartLongitude(e.target.value)}
                              placeholder="Longitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="border-t border-cyan-200 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Điểm dừng</p>
                              <p className="text-xs text-gray-600">Có thể thêm nhiều điểm dừng ở giữa tuyến.</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleGeneratePolyline}
                                className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
                              >
                                Tạo polyline
                              </button>
                              <button
                                type="button"
                                onClick={handleClearRouteStops}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Xóa điểm dừng
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              value={routeStopLabel}
                              onChange={(e) => setRouteStopLabel(e.target.value)}
                              placeholder="Tên điểm dừng"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeStopLatitude}
                              onChange={(e) => setRouteStopLatitude(e.target.value)}
                              placeholder="Latitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeStopLongitude}
                              onChange={(e) => setRouteStopLongitude(e.target.value)}
                              placeholder="Longitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddRouteStop}
                            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-50"
                          >
                            Thêm điểm dừng
                          </button>

                          {routeStops.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {routeStops.map((stop, index) => (
                                <div key={`${stop.label}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                  <div>
                                    <p className="font-medium text-gray-900">{index + 1}. {stop.label}</p>
                                    <p className="text-xs text-gray-500">{stop.latitude}, {stop.longitude}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setRouteStops((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-cyan-200 pt-4">
                          <p className="text-sm font-semibold text-gray-900">Điểm kết thúc</p>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input
                              value={routeEndLabel}
                              onChange={(e) => setRouteEndLabel(e.target.value)}
                              placeholder="Tên điểm kết thúc"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeEndLatitude}
                              onChange={(e) => setRouteEndLatitude(e.target.value)}
                              placeholder="Latitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={routeEndLongitude}
                              onChange={(e) => setRouteEndLongitude(e.target.value)}
                              placeholder="Longitude"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Polyline Map</label>
                          <input
                            value={polylineMap}
                            onChange={(e) => setPolylineMap(e.target.value)}
                            placeholder="Tự tạo hoặc chỉnh tay nếu cần"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                          <p className="text-sm font-semibold text-gray-900">Xem trước lộ trình</p>
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectMapTarget('start')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                  routePointTarget === 'start'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                Chọn điểm bắt đầu
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectMapTarget('stop')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                  routePointTarget === 'stop'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                Chọn điểm dừng
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectMapTarget('end')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                  routePointTarget === 'end'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                Chọn điểm kết thúc
                              </button>
                              <button
                                type="button"
                                onClick={handleMapJumpToCurrentTarget}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                              >
                                Nhảy tới điểm đang chọn
                              </button>
                              <button
                                type="button"
                                onClick={handleMapFitRoute}
                                className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100"
                              >
                                Fit toàn tuyến
                              </button>
                              <button
                                type="button"
                                onClick={handleMapGoToVietnam}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                              >
                                Về Việt Nam
                              </button>
                            </div>
                            <p className="text-xs text-gray-600">
                              Mẹo: Chọn Start/Stop/End rồi bấm "Nhảy tới điểm đang chọn" để map tự tới đúng khu vực trước khi click.
                            </p>
                            <div className="h-64 overflow-hidden rounded-lg border border-gray-200">
                              <MapContainer center={VIETNAM_CENTER} zoom={VIETNAM_ZOOM} className="h-full w-full">
                                <TileLayer
                                  attribution="&copy; OpenStreetMap contributors"
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <RouteMapClickHandler onClick={handleMapPickPoint} />
                                <RouteMapAutoFit points={routePreviewPoints} trigger={mapFitTrigger} />
                                <RouteMapFlyTo target={mapFlyTarget} />
                                {routePreviewPoints.length > 1 && (
                                  <Polyline positions={routePreviewPoints.map((point) => [point.latitude, point.longitude] as [number, number])} pathOptions={{ color: '#0891b2', weight: 4 }} />
                                )}
                                {routePreviewPoints.map((point, index) => (
                                  <CircleMarker
                                    key={`${point.label}-${index}`}
                                    center={[point.latitude, point.longitude]}
                                    radius={6}
                                    pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9 }}
                                  />
                                ))}
                              </MapContainer>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Hidden Gems (tùy chọn)</p>
                            <p className="text-xs text-gray-500">Bạn có thể bỏ qua nếu tuyến không có điểm thưởng.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEnableHiddenGems((prev) => {
                                const next = !prev;
                                setShowHiddenGemsPanel(next);
                                return next;
                              });
                            }}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                              enableHiddenGems
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {enableHiddenGems ? 'Đang bật' : 'Bật hidden gems'}
                          </button>
                        </div>

                        {enableHiddenGems && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setShowHiddenGemsPanel((prev) => !prev)}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700"
                            >
                              {showHiddenGemsPanel ? 'Ẩn form hidden gems' : 'Mở form hidden gems'}
                            </button>

                            {showHiddenGemsPanel && (
                              <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <input
                                    value={hiddenGemName}
                                    onChange={(e) => setHiddenGemName(e.target.value)}
                                    placeholder="Tên điểm"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    value={hiddenGemDescription}
                                    onChange={(e) => setHiddenGemDescription(e.target.value)}
                                    placeholder="Mô tả"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <input
                                    value={hiddenGemLatitude}
                                    onChange={(e) => setHiddenGemLatitude(e.target.value)}
                                    placeholder="Latitude"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    value={hiddenGemLongitude}
                                    onChange={(e) => setHiddenGemLongitude(e.target.value)}
                                    placeholder="Longitude"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    value={hiddenGemRewardPoints}
                                    onChange={(e) => setHiddenGemRewardPoints(e.target.value)}
                                    placeholder="Điểm thưởng"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={handleAddHiddenGem}
                                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-50"
                                >
                                  Thêm hidden gem
                                </button>

                                {hiddenGems.length > 0 && (
                                  <div className="space-y-2">
                                    {hiddenGems.map((item, index) => (
                                      <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                                        <div>
                                          <p className="font-medium text-gray-900">{index + 1}. {item.name}</p>
                                          <p className="text-xs text-gray-500">{item.latitude}, {item.longitude} • {toNumber(String(item.rewardPoints ?? 0))} điểm</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setHiddenGems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))}
                                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
                        <p className="mt-1 text-xs text-gray-500">Tạo lộ trình mới để hiển thị danh sách tại đây.</p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {localRoutes.map((route: any, index: number) => {
                          const routeNameText = getText(
                            pickRouteValue(route, ['routeName', 'RouteName', 'name', 'Name']),
                            `Lộ trình ${index + 1}`,
                          );
                          const routeDescriptionText = getText(
                            pickRouteValue(route, ['description', 'Description']),
                            'Không có mô tả',
                          );
                          const routeKey = getText(
                            pickRouteValue(route, ['id', 'Id']),
                            `${routeNameText}-${index}`,
                          );
                          const hiddenGemRaw = pickRouteValue(route, ['hiddenGems', 'HiddenGems']);
                          const hiddenGemList = Array.isArray(hiddenGemRaw) ? hiddenGemRaw : [];
                          const totalDistance = pickRouteValue(route, ['totalDistanceKm', 'TotalDistanceKm']);
                          const estimatedDuration = pickRouteValue(route, ['estimatedMinutes', 'EstimatedMinutes']);
                          const polylineText = getText(
                            pickRouteValue(route, [
                              'polylineMap',
                              'PolylineMap',
                              'polyline',
                              'Polyline',
                              'encodedPolyline',
                              'EncodedPolyline',
                            ]),
                            'Chưa có polyline',
                          );

                          return (
                            <div key={routeKey} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-gray-900">{routeNameText}</p>
                                  <p className="mt-1 text-sm text-gray-600">{routeDescriptionText}</p>
                                </div>
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                  {hiddenGemList.length} hidden gems
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">Quãng đường</p>
                                  <p className="mt-1 font-medium text-gray-900">{formatDistanceKm(totalDistance)}</p>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-amber-600">Thời gian ước tính</p>
                                  <p className="mt-1 font-medium text-gray-900">{formatDurationMinutes(estimatedDuration)}</p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Polyline Map</p>
                                <p className="mt-1 break-all font-mono text-xs text-slate-800">{polylineText}</p>
                                {polylineText !== 'Chưa có polyline' && (
                                  <RoutePolylinePreview polyline={polylineText} />
                                )}
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
        </div>
      </div>
    </div>
  );
}
