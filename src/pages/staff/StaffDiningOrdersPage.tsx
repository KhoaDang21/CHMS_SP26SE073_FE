import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Menu,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import StaffSidebar from "../../components/staff/StaffSidebar";
import { diningService } from "../../services/diningService";
import type { DiningOrder } from "../../types/dining.types";
import BackofficeNotificationBell from '../../components/common/BackofficeNotificationBell';

const dateISO = (d: Date) => d.toISOString().slice(0, 10);

const timeLabel = (startTime: string) => {
  const v = String(startTime || "").trim();
  if (!v) return "—";
  return v.slice(0, 5);
};

// Check if can transition to a given status
const canTransition = (current: string, target: string): boolean => {
  const st = String(current || "").toUpperCase();
  const tgt = String(target || "").toUpperCase();

  // Cannot transition to same status
  if (st === tgt) return false;

  // Once SERVED (final state), cannot transition
  if (st === "SERVED") return false;

  // Cannot go back to PENDING from any other status
  if (tgt === "PENDING") return false;

  // PENDING can go to PREPARING or SERVED
  if (st === "PENDING" && (tgt === "PREPARING" || tgt === "SERVED")) return true;

  // PREPARING can only go to SERVED
  if (st === "PREPARING" && tgt === "SERVED") return true;

  return false;
};

export default function StaffDiningOrdersPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [date, setDate] = useState(dateISO(new Date()));
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DiningOrder[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await diningService.staffGetOrders(date);
      setOrders(list);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tải danh sách đơn món");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const grouped = useMemo(() => {
    const map = new Map<string, DiningOrder[]>();
    orders.forEach((o) => {
      const key = String(o.startTime || "");
      const list = map.get(key) ?? [];
      list.push(o);
      map.set(key, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  const handleLogout = () => {
    authService.logout();
    toast.success("Đăng xuất thành công!");
    navigate("/auth/login");
  };

  const setStatus = async (order: DiningOrder, status: "PENDING" | "PREPARING" | "SERVED") => {
    const current = String(order.status || "").toUpperCase();
    if (!canTransition(current, status)) {
      const reason = current === "SERVED"
        ? "Đơn đã phục vụ, không thể thay đổi"
        : status === "PENDING"
          ? "Không thể lùi về chờ xác nhận"
          : "Thao tác này không hợp lệ";
      toast.error(reason);
      return;
    }
    try {
      await diningService.staffUpdateOrderStatus(order.id, status);
      toast.success(`Đã cập nhật: ${status}`);
      setOrders((prev) => prev.map((x) => (x.id === order.id ? { ...x, status } : x)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể cập nhật trạng thái");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <StaffSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath="/staff/dining/orders"
        userName={currentUser?.name}
        userRole={currentUser?.role || 'staff'}
        onLogout={handleLogout}
      />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
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
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-cyan-700" />
                  Đơn món trong ngày
                </h2>
                <p className="text-sm text-gray-500">Chờ xác nhận → Đang làm → Đã phục vụ</p>
              </div>
            </div>
            <BackofficeNotificationBell />
          </div>
        </header>

        <main className="p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Chọn ngày</div>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>
            <button
              onClick={load}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <p className="text-gray-900 font-semibold">Không có đơn món trong ngày này.</p>
              <p className="text-gray-500 text-sm mt-1">Chọn ngày khác hoặc làm mới.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([startTime, list]) => (
                <div key={startTime} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-700" />
                      {timeLabel(startTime)}
                      <span className="text-sm text-gray-500 font-medium">({list.length} món)</span>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {list.map((o) => {
                      const st = String(o.status || "").toUpperCase();
                      const isPreparing = st === "PREPARING";
                      const isServed = st === "SERVED";
                      const isPending = st === "PENDING";
                      return (
                        <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 flex gap-4">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {o.imageUrl ? (
                              <img src={o.imageUrl} alt={o.comboName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <UtensilsCrossed className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate">{o.comboName}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {o.serveLocation === "BEACH" ? "Phục vụ: Bãi biển" : "Phục vụ: Phòng"}
                                </div>
                                {!!o.note && <div className="text-xs text-gray-500 mt-1 line-clamp-2">Ghi chú: {o.note}</div>}
                              </div>
                              <span
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${isServed
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : isPreparing
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                  }`}
                              >
                                {isServed ? "Đã phục vụ" : isPreparing ? "Đang làm" : "Chờ xác nhận"}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => setStatus(o, "PENDING")}
                                disabled={!canTransition(st, "PENDING")}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${isPending
                                  ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                                  : !canTransition(st, "PENDING")
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                title={!canTransition(st, "PENDING") ? "Không thể lùi về chờ sau khi đã tiến hành" : ""}
                              >
                                Chờ xác nhận
                              </button>
                              <button
                                onClick={() => setStatus(o, "PREPARING")}
                                disabled={!canTransition(st, "PREPARING")}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${isPreparing
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : !canTransition(st, "PREPARING")
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                              >
                                Đang làm
                              </button>
                              <button
                                onClick={() => setStatus(o, "SERVED")}
                                disabled={!canTransition(st, "SERVED")}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${isServed
                                  ? "bg-green-50 text-green-800 border-green-200"
                                  : !canTransition(st, "SERVED")
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                              >
                                Đã phục vụ
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

