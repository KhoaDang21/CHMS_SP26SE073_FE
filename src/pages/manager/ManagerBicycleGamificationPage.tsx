import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  Building2,
  CheckCircle2,
  Gauge,
  Loader2,
  LogOut,
  MapPinned,
  Menu,
  ShieldAlert,
  X,
} from "lucide-react";
import { decode, encode } from "@googlemaps/polyline-codec";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { publicHomestayService } from "../../services/publicHomestayService";
import { managerHomestayService } from "../../services/managerHomestayService";
import { managerBookingService } from "../../services/managerBookingService";
import { adminBookingService } from "../../services/adminBookingService";
import type { Booking } from "../../types/booking.types";
import type { Homestay } from "../../types/homestay.types";
import { RoleBadge } from "../../components/common/RoleBadge";
import {
  adminNavItemsGrouped,
  managerNavItemsGrouped,
} from "../../config/adminNavItemsGrouped";
import AdminSidebar from "../../components/admin/AdminSidebar";
import {
  bicycleGamificationService,
  type HiddenGemPayload,
} from "../../services/bicycleGamificationService";

const tabs = [
  { key: "bicycles", label: "Kho xe đạp", icon: Gauge },
  { key: "routes", label: "Lộ trình & Hidden Gems", icon: MapPinned },
  { key: "operation", label: "Bàn giao & Thu hồi", icon: Bike },
  { key: "damage", label: "Bảng phạt hư hỏng", icon: ShieldAlert },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const getText = (value: unknown, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrencyVnd = (value: unknown): string => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat("vi-VN").format(safeAmount)} VND`;
};

const getStatusLabel = (status: unknown): string => {
  const value = String(status ?? "").toUpperCase();
  if (value === "AVAILABLE") return "Sẵn sàng";
  if (value === "IN_USE" || value === "RENTED") return "Đang sử dụng";
  if (value === "MAINTENANCE") return "Bảo trì";
  if (value === "INACTIVE") return "Ngừng hoạt động";
  return value || "Không rõ";
};

const getStatusClassName = (status: unknown): string => {
  const value = String(status ?? "").toUpperCase();
  if (value === "AVAILABLE")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (value === "IN_USE" || value === "RENTED")
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (value === "MAINTENANCE")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (value === "INACTIVE") return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatDistanceKm = (value: unknown): string => {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return "0 km";
  return `${distance.toLocaleString("vi-VN")} km`;
};

const formatDurationMinutes = (value: unknown): string => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 phút";
  if (minutes < 60) return `${minutes.toLocaleString("vi-VN")} phút`;
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

const computeDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateRouteMetrics = (
  points: Array<Pick<RoutePoint, "latitude" | "longitude">>,
): { totalDistanceKm: number; estimatedMinutes: number } | null => {
  if (points.length < 2) {
    return null;
  }

  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalKm += computeDistanceKm(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude,
    );
  }

  return {
    totalDistanceKm: Number(totalKm.toFixed(2)),
    estimatedMinutes: Math.max(1, Math.round(totalKm * 5)),
  };
};

// Single clear street basemap (Carto Voyager)
const SINGLE_ROUTE_MAP_STYLE = {
  key: "cartoVoyager",
  label: "Carto Voyager (clear streets)",
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
};

const RouteMapAutoFit = ({
  points,
  trigger,
}: {
  points: Array<Pick<RoutePoint, "latitude" | "longitude">>;
  trigger: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 15, {
        animate: true,
        duration: 0.4,
      });
      return;
    }

    map.fitBounds(
      points.map(
        (point) => [point.latitude, point.longitude] as [number, number],
      ),
      { padding: [28, 28], maxZoom: 16 },
    );
  }, [map, points, trigger]);

  return null;
};

const encodePolyline = (
  points: Array<Pick<RoutePoint, "latitude" | "longitude">>,
): string => {
  const path: [number, number][] = points.map((point) => [
    point.latitude,
    point.longitude,
  ]);
  return encode(path, 5);
};

const decodePolyline = (value: unknown): Array<[number, number]> => {
  const text = String(value ?? "").trim();
  if (!text) {
    return [];
  }

  try {
    return decode(text, 5) as Array<[number, number]>;
  } catch {
    return [];
  }
};

const RoutePolylinePreview = ({
  polyline,
  tileUrl,
  tileAttribution,
}: {
  polyline: unknown;
  tileUrl: string;
  tileAttribution: string;
}) => {
  const points = decodePolyline(polyline);

  if (points.length === 0) {
    return (
      <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        Chưa có dữ liệu map để hiển thị
      </div>
    );
  }

  return (
    <>
      <div className="mt-2 h-48 overflow-hidden rounded-lg border border-slate-200">
        <MapContainer center={points[0]} zoom={13} className="h-full w-full">
          <TileLayer attribution={tileAttribution} url={tileUrl} />
          <RouteMapAutoFit
            points={points.map((point) => ({
              latitude: point[0],
              longitude: point[1],
            }))}
            trigger={points.length}
          />
          {points.length > 1 && (
            <Polyline
              positions={points}
              pathOptions={{ color: "#0891b2", weight: 4 }}
            />
          )}
          {points.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === points.length - 1;
            // Điểm bắt đầu: xanh lá | Điểm kết thúc: xanh dương | Điểm dừng giữa: vàng
            const color = isStart
              ? "#16a34a"
              : isEnd
                ? "#2563eb"
                : "#ca8a04";
            const fillColor = isStart
              ? "#22c55e"
              : isEnd
                ? "#3b82f6"
                : "#eab308";
            return (
              <CircleMarker
                key={`${point[0]}-${point[1]}-${index}`}
                center={point}
                radius={isStart || isEnd ? 6 : 5}
                pathOptions={{
                  color,
                  fillColor,
                  fillOpacity: 0.9,
                }}
              />
            );
          })}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          Điểm bắt đầu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
          Điểm dừng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
          Điểm kết thúc
        </span>
      </div>
    </>
  );
};

export default function ManagerBicycleGamificationPage() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isAllowed = role === "admin" || role === "manager";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [selectedHomestayId, setSelectedHomestayId] = useState("");

  const [activeTab, setActiveTab] = useState<TabKey>("bicycles");
  const visibleTabs = isAdmin
    ? tabs
    : tabs.filter((tab) => tab.key !== "operation");

  const [bicycles, setBicycles] = useState<any[]>([]);
  const [damageCatalogs, setDamageCatalogs] = useState<any[]>([]);
  const [localRoutes, setLocalRoutes] = useState<any[]>([]);

  const [rentBookingId, setRentBookingId] = useState("");
  const [rentBicycleId, setRentBicycleId] = useState("");
  const [returnRentalId, setReturnRentalId] = useState("");
  const [returnDamageIds, setReturnDamageIds] = useState<string[]>([]);
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]);
  const [loadingOperationData, setLoadingOperationData] = useState(false);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? "bicycles");
    }
  }, [activeTab, visibleTabs]);

  const [bicycleCode, setBicycleCode] = useState("");
  const [bicycleType, setBicycleType] = useState("CITY");
  const [pricePerDay, setPricePerDay] = useState("100000");
  const [bicycleStatus, setBicycleStatus] = useState("AVAILABLE");

  const [damageName, setDamageName] = useState("");
  const [fineAmount, setFineAmount] = useState("50000");

  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [totalDistanceKm, setTotalDistanceKm] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [routeStartLatitude, setRouteStartLatitude] = useState("");
  const [routeStartLongitude, setRouteStartLongitude] = useState("");
  const [routeEndLatitude, setRouteEndLatitude] = useState("");
  const [routeEndLongitude, setRouteEndLongitude] = useState("");
  const [routeStopLatitude, setRouteStopLatitude] = useState("");
  const [routeStopLongitude, setRouteStopLongitude] = useState("");
  const [routeStops, setRouteStops] = useState<RoutePoint[]>([]);
  const [polylineMap, setPolylineMap] = useState("");
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [enableHiddenGems, setEnableHiddenGems] = useState(false);
  const [showHiddenGemsPanel, setShowHiddenGemsPanel] = useState(false);
  const [hiddenGems, setHiddenGems] = useState<HiddenGemPayload[]>([]);
  const [hiddenGemName, setHiddenGemName] = useState("");
  const [hiddenGemDescription, setHiddenGemDescription] = useState("");
  const [hiddenGemLatitude, setHiddenGemLatitude] = useState("");
  const [hiddenGemLongitude, setHiddenGemLongitude] = useState("");
  const [hiddenGemRewardPoints, setHiddenGemRewardPoints] = useState("10");
  const groupedNavItems = isAdmin
    ? adminNavItemsGrouped
    : managerNavItemsGrouped;

  const initializeRouteDraftFromHomestay = (homestay?: Homestay) => {
    const latitude = Number(homestay?.latitude);
    const longitude = Number(homestay?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const latText = String(latitude);
    const lngText = String(longitude);

    // Simple default route: start at home -> stop at home (draft) -> end at home.
    setRouteStartLatitude(latText);
    setRouteStartLongitude(lngText);
    setRouteStopLatitude(latText);
    setRouteStopLongitude(lngText);
    setRouteEndLatitude(latText);
    setRouteEndLongitude(lngText);
    setRouteStops([]);
  };

  useEffect(() => {
    if (!isAllowed) {
      toast.error("Bạn không có quyền truy cập chức năng này");
      navigate("/", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const list = isAdmin
          ? (await publicHomestayService.list({ page: 1, pageSize: 300 })).Items || []
          : await managerHomestayService.list();

        if (!list.length) {
          setHomestays([]);
          setSelectedHomestayId("");
          if (!isAdmin) {
            toast.warning("Không có homestay nào thuộc tỉnh bạn được phân công.");
          }
          return;
        }

        setHomestays(list);
        setSelectedHomestayId((prev) => {
          const stillValid = list.some((h) => h.id === prev);
          return stillValid ? prev : (list[0]?.id ?? "");
        });
      } catch (error) {
        console.error("Load homestays error:", error);
        toast.error("Không thể tải danh sách homestay");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAdmin, isAllowed, navigate]);

  // Auto-initialize route points from homestay coordinates when homestay is selected
  useEffect(() => {
    if (!selectedHomestayId || !homestays.length) {
      return;
    }

    const selectedHomestay = homestays.find((h) => h.id === selectedHomestayId);
    if (selectedHomestay) {
      initializeRouteDraftFromHomestay(selectedHomestay);
    }
  }, [selectedHomestayId, homestays]);

  // calculateRouteMetrics is used only for derived preview values in this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const startLatitude = Number(routeStartLatitude);
    const startLongitude = Number(routeStartLongitude);
    const endLatitude = Number(routeEndLatitude);
    const endLongitude = Number(routeEndLongitude);

    if (
      !Number.isFinite(startLatitude) ||
      !Number.isFinite(startLongitude) ||
      !Number.isFinite(endLatitude) ||
      !Number.isFinite(endLongitude)
    ) {
      return;
    }

    const points: Array<Pick<RoutePoint, "latitude" | "longitude">> = [
      { latitude: startLatitude, longitude: startLongitude },
      ...routeStops.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
      { latitude: endLatitude, longitude: endLongitude },
    ];

    const metrics = calculateRouteMetrics(points);
    if (!metrics) {
      return;
    }

    setTotalDistanceKm(String(metrics.totalDistanceKm));
    setEstimatedMinutes(String(metrics.estimatedMinutes));
  }, [
    routeStartLatitude,
    routeStartLongitude,
    routeEndLatitude,
    routeEndLongitude,
    routeStops,
  ]);

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
      console.error("Refresh manager bicycle data error:", error);
      toast.error("Không thể tải dữ liệu quản lý xe đạp");
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
      if (isAdmin) {
        bookingList = await adminBookingService.getAllBookings();
      } else {
        // manager
        const raw = await managerBookingService.getBookings(1, 300);
        bookingList = raw as unknown as Booking[];
      }
      const filtered = bookingList.filter((booking) => {
        const hId = String(booking.homestayId ?? "");
        const status = String(booking.status ?? "").toLowerCase();
        return (
          hId === selectedHomestayId &&
          (status === "confirmed" || status === "checked_in")
        );
      });
      setStaffBookings(filtered);
    } catch (error) {
      console.error("Refresh operation data error:", error);
    } finally {
      setLoadingOperationData(false);
    }
  };

  useEffect(() => {
    void refreshManagerData();
    void refreshOperationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHomestayId]);

  const handleRent = async () => {
    if (!rentBookingId.trim() || !rentBicycleId.trim()) {
      toast.error("Vui lòng nhập bookingId và bicycleId");
      return;
    }

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.rent({
        bookingId: rentBookingId.trim(),
        bicycleId: rentBicycleId.trim(),
      });

      if (!result.success) {
        toast.error(result.message || "Không thể bàn giao xe");
        return;
      }

      toast.success(result.message || "Bàn giao xe thành công");
      setRentBookingId("");
      setRentBicycleId("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnRentalId.trim()) {
      toast.error("Vui lòng nhập rentalId");
      return;
    }

    const damageIds = returnDamageIds;

    setSubmitting(true);
    try {
      const result = await bicycleGamificationService.returnBicycle({
        rentalId: returnRentalId.trim(),
        damageCatalogIds: damageIds,
      });

      if (!result.success) {
        toast.error(result.message || "Không thể thu hồi xe");
        return;
      }

      toast.success(result.message || "Thu hồi xe thành công");
      setReturnRentalId("");
      setReturnDamageIds([]);
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBicycle = async () => {
    if (!bicycleCode.trim()) {
      toast.error("Vui lòng nhập mã xe");
      return;
    }

    if (!selectedHomestayId) {
      toast.error("Vui lòng chọn homestay");
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
        toast.error(result.message || "Không thể thêm xe");
        return;
      }

      toast.success(result.message || "Thêm xe thành công");
      setBicycleCode("");
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDamage = async () => {
    if (!damageName.trim()) {
      toast.error("Vui lòng nhập tên lỗi");
      return;
    }

    if (!selectedHomestayId) {
      toast.error("Vui lòng chọn homestay");
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
        toast.error(result.message || "Không thể thêm lỗi hư hỏng");
        return;
      }

      toast.success(result.message || "Đã thêm lỗi hư hỏng");
      setDamageName("");
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
      .filter(
        (item) =>
          item.name &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude),
      );
  };

  // Generate polyline from 3 input coordinates and auto-calculate metrics
  const handleGeneratePolylinePreview = () => {
    const startLat = Number(routeStartLatitude);
    const startLng = Number(routeStartLongitude);
    const stopLat = Number(routeStopLatitude);
    const stopLng = Number(routeStopLongitude);
    const endLat = Number(routeEndLatitude);
    const endLng = Number(routeEndLongitude);

    // Validate all coordinates
    if (
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      !Number.isFinite(stopLat) ||
      !Number.isFinite(stopLng) ||
      !Number.isFinite(endLat) ||
      !Number.isFinite(endLng)
    ) {
      toast.error("Vui lòng nhập tất cả 3 điểm với tọa độ hợp lệ");
      return;
    }

    // Create 3-point route
    const routePoints: RoutePoint[] = [
      { latitude: startLat, longitude: startLng, label: "Bắt đầu" },
      { latitude: stopLat, longitude: stopLng, label: "Dừng" },
      { latitude: endLat, longitude: endLng, label: "Kết thúc" },
    ];

    // Calculate metrics
    const metrics = calculateRouteMetrics(routePoints);
    if (!metrics) {
      toast.error("Không thể tính toán quãng đường");
      return;
    }

    // Generate polyline
    const encodedPolyline = encode(
      routePoints.map((p) => [p.latitude, p.longitude] as [number, number]),
      5,
    );

    // Update state
    setPolylineMap(encodedPolyline);
    setTotalDistanceKm(String(metrics.totalDistanceKm));
    setEstimatedMinutes(String(metrics.estimatedMinutes));
    setShowMapPreview(true);

    toast.success("Đã tạo polyline và tính toán metrics!");
  };

  const handleCreateRoute = async () => {
    if (!selectedHomestayId) {
      toast.error("Vui lòng chọn homestay");
      return;
    }

    if (!routeName.trim()) {
      toast.error("Vui lòng nhập tên lộ trình");
      return;
    }

    // Get 3 input coordinates
    const startLat = Number(routeStartLatitude);
    const startLng = Number(routeStartLongitude);
    const stopLat = Number(routeStopLatitude);
    const stopLng = Number(routeStopLongitude);
    const endLat = Number(routeEndLatitude);
    const endLng = Number(routeEndLongitude);

    // Validate all coordinates are valid
    if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) {
      toast.error("Vui lòng nhập tọa độ điểm bắt đầu hợp lệ");
      return;
    }

    if (!Number.isFinite(stopLat) || !Number.isFinite(stopLng)) {
      toast.error("Vui lòng nhập tọa độ điểm dừng hợp lệ");
      return;
    }

    if (!Number.isFinite(endLat) || !Number.isFinite(endLng)) {
      toast.error("Vui lòng nhập tọa độ điểm kết thúc hợp lệ");
      return;
    }

    // Assemble 3 points
    const routePoints: RoutePoint[] = [
      { latitude: startLat, longitude: startLng, label: "Điểm bắt đầu" },
      { latitude: stopLat, longitude: stopLng, label: "Điểm dừng" },
      { latitude: endLat, longitude: endLng, label: "Điểm kết thúc" },
    ];

    // Calculate metrics
    const routeMetrics = calculateRouteMetrics(routePoints);
    if (!routeMetrics) {
      toast.error("Không thể tính quãng đường cho lộ trình này");
      return;
    }

    setSubmitting(true);
    try {
      const generatedPolyline = encodePolyline(routePoints);
      const hiddenGems = parseHiddenGems();

      const result = await bicycleGamificationService.createLocalRoute({
        homestayId: selectedHomestayId,
        routeName: routeName.trim(),
        description: routeDescription.trim(),
        totalDistanceKm: routeMetrics.totalDistanceKm,
        estimatedMinutes: routeMetrics.estimatedMinutes,
        polylineMap: generatedPolyline,
        hiddenGems,
      });

      if (!result.success) {
        toast.error(result.message || "Không thể tạo lộ trình");
        return;
      }

      toast.success(result.message || "Tạo lộ trình thành công");
      // Reset form
      setRouteName("");
      setRouteDescription("");
      setRouteStartLatitude("");
      setRouteStartLongitude("");
      setRouteStopLatitude("");
      setRouteStopLongitude("");
      setRouteEndLatitude("");
      setRouteEndLongitude("");
      setTotalDistanceKm("");
      setEstimatedMinutes("");
      setEnableHiddenGems(false);
      setShowHiddenGemsPanel(false);
      setHiddenGems([]);
      setHiddenGemName("");
      setHiddenGemDescription("");
      setHiddenGemLatitude("");
      setHiddenGemLongitude("");
      setHiddenGemRewardPoints("10");
      await refreshManagerData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHiddenGem = () => {
    const latitude = Number(hiddenGemLatitude);
    const longitude = Number(hiddenGemLongitude);

    if (!hiddenGemName.trim()) {
      toast.error("Vui lòng nhập tên hidden gem");
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error("Vui lòng nhập latitude/longitude hidden gem hợp lệ");
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

    setHiddenGemName("");
    setHiddenGemDescription("");
    setHiddenGemLatitude("");
    setHiddenGemLongitude("");
    setHiddenGemRewardPoints("10");
  };

  if (!isAllowed) return null;

  const handleLogout = () => {
    authService.logout();
    toast.success("Đăng xuất thành công!");
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} bg-white shadow-lg w-64`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-gray-900">
                  CHMS {isAdmin ? "Admin" : "Manager"}
                </h1>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Hệ thống quản trị" : "Quản lý vận hành"}
                </p>
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
                {user?.name?.charAt(0)?.toUpperCase() ?? (isAdmin ? "A" : "M")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {user?.name ?? (isAdmin ? "Admin" : "Manager")}
                </p>
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
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
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
                <h2 className="text-xl font-bold text-gray-900">
                  Mini-game xe đạp
                </h2>
                <p className="text-sm text-gray-500">
                  Vận hành gamification cho khách
                </p>
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
                  Trò chơi xe đạp
                </p>
                <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl">
                  Vận hành xe đạp mini-game
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Quản lý kho xe, bảng phạt, lộ trình và phục vụ bàn giao/thu
                  hồi xe cho khách.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${active
                      ? "border-cyan-300 bg-cyan-50 text-cyan-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-cyan-200 hover:text-cyan-700"
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
              <label className="text-sm font-medium text-gray-700">
                Homestay
              </label>
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
          </section>

          {loading ? (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {isAdmin && activeTab === "operation" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">
                      Bàn giao xe cho khách
                    </h2>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 text-xs text-cyan-800">
                        💡 Chọn booking đang hoạt động và xe còn trống để bàn
                        giao.
                      </div>
                      {loadingOperationData ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải danh sách booking...
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                              Chọn Booking cần bàn giao xe
                            </label>
                            <select
                              value={rentBookingId}
                              onChange={(e) => setRentBookingId(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="">-- Chọn booking --</option>
                              {staffBookings.map((booking) => (
                                <option key={booking.id} value={booking.id}>
                                  {booking.bookingCode} - {booking.customerName}{" "}
                                  (
                                  {booking.status === "checked_in"
                                    ? "Đã nhận phòng"
                                    : "Đã xác nhận"}
                                  )
                                </option>
                              ))}
                            </select>
                            {staffBookings.length === 0 && (
                              <p className="text-xs text-gray-500">
                                Không có booking đang hoạt động tại homestay
                                này.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                              Chọn Xe đang sẵn sàng
                            </label>
                            <select
                              value={rentBicycleId}
                              onChange={(e) => setRentBicycleId(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="">-- Chọn xe --</option>
                              {bicycles
                                .filter(
                                  (b: any) =>
                                    String(b?.status || "").toUpperCase() ===
                                    "AVAILABLE",
                                )
                                .map((bicycle: any) => (
                                  <option
                                    key={String(bicycle.id)}
                                    value={String(bicycle.id)}
                                  >
                                    {String(
                                      bicycle.bicycleCode || "Xe chưa mã",
                                    )}{" "}
                                    - {String(bicycle.type || "N/A")}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleRent}
                        disabled={
                          submitting || !rentBookingId || !rentBicycleId
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Bàn giao xe
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">
                      Thu hồi xe & phạt hư hỏng
                    </h2>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Rental ID (bắt buộc)
                        </label>
                        <input
                          value={returnRentalId}
                          onChange={(e) => setReturnRentalId(e.target.value)}
                          placeholder="Nhập Rental ID (UUID)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          Chọn lỗi hư hỏng (nếu có)
                        </p>
                        {damageCatalogs.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            Homestay chưa có bảng lỗi. Hệ thống sẽ thu hồi xe
                            không tính phạt.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {damageCatalogs.map((damage: any) => {
                              const damageId = String(damage?.id || "");
                              const checked =
                                returnDamageIds.includes(damageId);
                              return (
                                <label
                                  key={damageId}
                                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setReturnDamageIds((prev) => [
                                          ...prev,
                                          damageId,
                                        ]);
                                      } else {
                                        setReturnDamageIds((prev) =>
                                          prev.filter((id) => id !== damageId),
                                        );
                                      }
                                    }}
                                  />
                                  <span>
                                    {String(
                                      damage?.damageName || "Lỗi không tên",
                                    )}{" "}
                                    —{" "}
                                    {Number(
                                      damage?.fineAmount || 0,
                                    ).toLocaleString("vi-VN")}{" "}
                                    VND
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

              {activeTab === "bicycles" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">
                      Thêm xe mới
                    </h2>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Mã xe
                        </label>
                        <input
                          value={bicycleCode}
                          onChange={(e) => setBicycleCode(e.target.value)}
                          placeholder="Ví dụ: BK-001"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Loại xe
                        </label>
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
                        <label className="text-sm font-medium text-gray-700">
                          Giá thuê/ngày (VND)
                        </label>
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
                        <label className="text-sm font-medium text-gray-700">
                          Trạng thái
                        </label>
                        <select
                          value={bicycleStatus}
                          onChange={(e) => setBicycleStatus(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="IN_USE">IN_USE</option>
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
                    <h3 className="text-base font-bold text-gray-900">
                      Danh sách xe
                    </h3>

                    {bicycles.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có xe nào trong kho
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Hãy thêm xe mới để bắt đầu vận hành mini-game.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {bicycles.map((bicycle: any, index: number) => {
                          const bicycleCodeText = getText(
                            bicycle?.bicycleCode,
                            "Chưa có mã xe",
                          );
                          const bicycleTypeText = getText(bicycle?.type, "N/A");
                          const status = bicycle?.status;
                          const bicycleKey = getText(
                            bicycle?.id,
                            `${bicycleCodeText}-${index}`,
                          );

                          return (
                            <div
                              key={bicycleKey}
                              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-gray-900">
                                    {bicycleCodeText}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(status)}`}
                                >
                                  {getStatusLabel(status)}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">
                                    Loại xe
                                  </p>
                                  <p className="mt-1 font-medium text-gray-900">
                                    {bicycleTypeText}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-emerald-600">
                                    Giá thuê/ngày
                                  </p>
                                  <p className="mt-1 font-medium text-gray-900">
                                    {formatCurrencyVnd(bicycle?.pricePerDay)}
                                  </p>
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

              {activeTab === "damage" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">
                      Thêm lỗi hư hỏng
                    </h2>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Tên lỗi hư hỏng
                        </label>
                        <input
                          value={damageName}
                          onChange={(e) => setDamageName(e.target.value)}
                          placeholder="Ví dụ: Thủng lốp, Xước sơn, Lỗi phanh..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Số tiền phạt (VND)
                        </label>
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
                    <h3 className="text-base font-bold text-gray-900">
                      Danh sách bảng phạt
                    </h3>
                    {damageCatalogs.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có mục phạt nào
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Thêm lỗi hư hỏng để xây dựng bảng phạt.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {damageCatalogs.map((damage: any, index: number) => (
                          <div
                            key={String(damage?.id || index)}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold text-gray-900">
                                  {index + 1}.{" "}
                                  {String(
                                    damage?.damageName || "Lỗi không tên",
                                  )}
                                </p>
                              </div>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                {Number(damage?.fineAmount || 0).toLocaleString(
                                  "vi-VN",
                                )}{" "}
                                VND
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "routes" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-lg font-bold text-gray-900">
                      Tạo lộ trình mới
                    </h2>
                    <div className="mt-4 space-y-4">
                      {/* Route basics */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Tên lộ trình
                        </label>
                        <input
                          value={routeName}
                          onChange={(e) => setRouteName(e.target.value)}
                          placeholder="Ví dụ: Tuyến biển sáng"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Mô tả lộ trình
                        </label>
                        <input
                          value={routeDescription}
                          onChange={(e) => setRouteDescription(e.target.value)}
                          placeholder="Ví dụ: Tuyến đạp xe check-in bãi biển"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      {/* 3-point coordinate input: Start → Stop → End */}
                      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 space-y-4">
                        <p className="text-sm font-semibold text-gray-900">
                          Nhập 3 điểm lộ trình
                        </p>

                        {/* Start point */}
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase mb-2">
                            Điểm bắt đầu
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.000001"
                              value={routeStartLatitude}
                              onChange={(e) =>
                                setRouteStartLatitude(e.target.value)
                              }
                              placeholder="Latitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              step="0.000001"
                              value={routeStartLongitude}
                              onChange={(e) =>
                                setRouteStartLongitude(e.target.value)
                              }
                              placeholder="Longitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        {/* Stop point */}
                        <div className="border-t border-cyan-200 pt-3">
                          <p className="text-xs font-medium text-gray-600 uppercase mb-2">
                            Điểm dừng (giữa)
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.000001"
                              value={routeStopLatitude}
                              onChange={(e) =>
                                setRouteStopLatitude(e.target.value)
                              }
                              placeholder="Latitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              step="0.000001"
                              value={routeStopLongitude}
                              onChange={(e) =>
                                setRouteStopLongitude(e.target.value)
                              }
                              placeholder="Longitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        {/* End point */}
                        <div className="border-t border-cyan-200 pt-3">
                          <p className="text-xs font-medium text-gray-600 uppercase mb-2">
                            Điểm kết thúc
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.000001"
                              value={routeEndLatitude}
                              onChange={(e) =>
                                setRouteEndLatitude(e.target.value)
                              }
                              placeholder="Latitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              step="0.000001"
                              value={routeEndLongitude}
                              onChange={(e) =>
                                setRouteEndLongitude(e.target.value)
                              }
                              placeholder="Longitude"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Calculated metrics (read-only) */}
                      <div className="grid grid-cols-2 gap-3 rounded-lg bg-blue-50 p-3">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">
                            Quãng đường
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {totalDistanceKm ? `${totalDistanceKm} km` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-medium">
                            Thời gian ước tính
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {estimatedMinutes
                              ? `${estimatedMinutes} phút`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {/* Map preview button */}
                      <button
                        type="button"
                        onClick={handleGeneratePolylinePreview}
                        className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition"
                      >
                        📍 Xem trước lộ trình trên bản đồ
                      </button>

                      {/* Map preview section */}
                      {showMapPreview && polylineMap && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              Xem trước lộ trình
                            </h3>
                            <button
                              type="button"
                              onClick={() => setShowMapPreview(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="h-80 rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
                            <MapContainer
                              center={[
                                Number(routeStartLatitude) || 16.0,
                                Number(routeStartLongitude) || 108.0,
                              ]}
                              zoom={13}
                              className="h-full w-full"
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                              />
                              {/* Route points markers */}
                              <CircleMarker
                                center={[
                                  Number(routeStartLatitude),
                                  Number(routeStartLongitude),
                                ]}
                                radius={8}
                                pathOptions={{
                                  color: "#059669",
                                  fillColor: "#10b981",
                                  fillOpacity: 0.9,
                                  weight: 2,
                                }}
                              />
                              <CircleMarker
                                center={[
                                  Number(routeStopLatitude),
                                  Number(routeStopLongitude),
                                ]}
                                radius={8}
                                pathOptions={{
                                  color: "#f59e0b",
                                  fillColor: "#fbbf24",
                                  fillOpacity: 0.9,
                                  weight: 2,
                                }}
                              />
                              <CircleMarker
                                center={[
                                  Number(routeEndLatitude),
                                  Number(routeEndLongitude),
                                ]}
                                radius={8}
                                pathOptions={{
                                  color: "#dc2626",
                                  fillColor: "#ef4444",
                                  fillOpacity: 0.9,
                                  weight: 2,
                                }}
                              />
                              {/* Polyline */}
                              {(() => {
                                const decodedPoints = decode(polylineMap, 5);
                                return (
                                  <Polyline
                                    positions={decodedPoints.map(
                                      ([lat, lng]) => [lat, lng] as [number, number],
                                    )}
                                    pathOptions={{
                                      color: "#0891b2",
                                      weight: 4,
                                      opacity: 0.8,
                                    }}
                                  />
                                );
                              })()}
                            </MapContainer>
                          </div>
                          <div className="mt-3 text-xs text-gray-600">
                            <p>
                              🟢 Bắt đầu | 🟡 Dừng | 🔴 Kết thúc
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Hidden gems section (optional) */}
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Hidden Gems (tùy chọn)
                            </p>
                            <p className="text-xs text-gray-500">
                              Bạn có thể bỏ qua nếu tuyến không có điểm thưởng.
                            </p>
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
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${enableHiddenGems
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {enableHiddenGems ? "Đang bật" : "Bật hidden gems"}
                          </button>
                        </div>

                        {enableHiddenGems && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setShowHiddenGemsPanel((prev) => !prev)
                              }
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 mb-3"
                            >
                              {showHiddenGemsPanel
                                ? "▼ Ẩn form hidden gems"
                                : "▶ Mở form hidden gems"}
                            </button>

                            {showHiddenGemsPanel && (
                              <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <input
                                    value={hiddenGemName}
                                    onChange={(e) =>
                                      setHiddenGemName(e.target.value)
                                    }
                                    placeholder="Tên điểm"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    value={hiddenGemDescription}
                                    onChange={(e) =>
                                      setHiddenGemDescription(e.target.value)
                                    }
                                    placeholder="Mô tả"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={hiddenGemLatitude}
                                    onChange={(e) =>
                                      setHiddenGemLatitude(e.target.value)
                                    }
                                    placeholder="Latitude"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    type="number"
                                    step="0.000001"
                                    value={hiddenGemLongitude}
                                    onChange={(e) =>
                                      setHiddenGemLongitude(e.target.value)
                                    }
                                    placeholder="Longitude"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <input
                                    type="number"
                                    value={hiddenGemRewardPoints}
                                    onChange={(e) =>
                                      setHiddenGemRewardPoints(e.target.value)
                                    }
                                    placeholder="Điểm thưởng"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={handleAddHiddenGem}
                                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-50 w-full"
                                >
                                  Thêm hidden gem
                                </button>

                                {hiddenGems.length > 0 && (
                                  <div className="space-y-2">
                                    {hiddenGems.map((item, index) => (
                                      <div
                                        key={`${item.name}-${index}`}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                                      >
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {index + 1}. {item.name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {item.latitude}, {item.longitude} •{" "}
                                            {toNumber(
                                              String(item.rewardPoints ?? 0),
                                            )}{" "}
                                            điểm
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setHiddenGems((prev) =>
                                              prev.filter(
                                                (_, currentIndex) =>
                                                  currentIndex !== index,
                                              ),
                                            )
                                          }
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

                      {/* Submit button */}
                      <button
                        type="button"
                        onClick={handleCreateRoute}
                        disabled={submitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
                      >
                        {submitting ? "Đang tạo..." : "Tạo lộ trình"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-900">
                      Danh sách lộ trình
                    </h3>
                    {localRoutes.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Chưa có lộ trình nào
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Tạo lộ trình mới để hiển thị danh sách tại đây.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                        {localRoutes.map((route: any, index: number) => {
                          const routeNameText = getText(
                            pickRouteValue(route, [
                              "routeName",
                              "RouteName",
                              "name",
                              "Name",
                            ]),
                            `Lộ trình ${index + 1}`,
                          );
                          const routeDescriptionText = getText(
                            pickRouteValue(route, [
                              "description",
                              "Description",
                            ]),
                            "Không có mô tả",
                          );
                          const routeKey = getText(
                            pickRouteValue(route, ["id", "Id"]),
                            `${routeNameText}-${index}`,
                          );
                          const hiddenGemRaw = pickRouteValue(route, [
                            "hiddenGems",
                            "HiddenGems",
                          ]);
                          const hiddenGemList = Array.isArray(hiddenGemRaw)
                            ? hiddenGemRaw
                            : [];
                          const totalDistance = pickRouteValue(route, [
                            "totalDistanceKm",
                            "TotalDistanceKm",
                          ]);
                          const estimatedDuration = pickRouteValue(route, [
                            "estimatedMinutes",
                            "EstimatedMinutes",
                          ]);
                          const polylineText = getText(
                            pickRouteValue(route, [
                              "polylineMap",
                              "PolylineMap",
                              "polyline",
                              "Polyline",
                              "encodedPolyline",
                              "EncodedPolyline",
                            ]),
                            "Chưa có polyline",
                          );

                          return (
                            <div
                              key={routeKey}
                              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-gray-900">
                                    {routeNameText}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {routeDescriptionText}
                                  </p>
                                </div>
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                  {hiddenGemList.length} hidden gems
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-blue-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-blue-600">
                                    Quãng đường
                                  </p>
                                  <p className="mt-1 font-medium text-gray-900">
                                    {formatDistanceKm(totalDistance)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-amber-50 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-amber-600">
                                    Thời gian ước tính
                                  </p>
                                  <p className="mt-1 font-medium text-gray-900">
                                    {formatDurationMinutes(estimatedDuration)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Polyline Map
                                </p>
                                <p className="mt-1 break-all font-mono text-xs text-slate-800">
                                  {polylineText}
                                </p>
                                {polylineText !== "Chưa có polyline" && (
                                  <RoutePolylinePreview
                                    polyline={polylineText}
                                    tileAttribution={
                                      SINGLE_ROUTE_MAP_STYLE.attribution
                                    }
                                    tileUrl={SINGLE_ROUTE_MAP_STYLE.url}
                                  />
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
