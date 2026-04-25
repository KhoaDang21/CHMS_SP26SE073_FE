import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  RefreshCw,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { RoleBadge } from "../../components/common/RoleBadge";
import { staffNavItems } from "../../config/staffNavItems";
import { diningService } from "../../services/diningService";
import type { DiningOrder } from "../../types/dining.types";
import BackofficeNotificationBell from '../../components/common/BackofficeNotificationBell';

const dateISO = (d: Date) => d.toISOString().slice(0, 10);

const timeLabel = (startTime: string) => {
  const v = String(startTime || "").trim();
  if (!v) return "—";
  return v.slice(0, 5);
};

const canGoToPending = (current: string) => String(current || "").toUpperCase() !== "PREPARING";

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
    if (status === "PENDING" && !canGoToPending(current)) {
      toast.error("Đã PREPARING thì không được lùi về PENDING");
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

  const navigationItems = staffNavItems.map((item) => ({
    name: item.label,
    icon: item.icon,
    path: item.path,
    active: item.path === "/staff/dining/orders",
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className="text-xs text-cyan-200">Kitchen Board</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active ? "bg-white/20 text-white font-medium" : "text-cyan-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 border-t border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? "S"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name ?? "Staff"}</p>
                <RoleBadge role={currentUser?.role || "staff"} size="sm" />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-cyan-500/30">
            <button
              onClick={handleLogout}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

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
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                                  isServed
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
                                disabled={!isPending && !canGoToPending(st)}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                  isPending
                                    ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                                    : !canGoToPending(st)
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                }`}
                                title={!canGoToPending(st) ? "Không thể lùi về chờ sau khi đã bắt đầu làm" : ""}
                              >
                                Chờ xác nhận
                              </button>
                              <button
                                onClick={() => setStatus(o, "PREPARING")}
                                disabled={isPreparing || isServed}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                  isPreparing
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : isServed
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                Đang làm
                              </button>
                              <button
                                onClick={() => setStatus(o, "SERVED")}
                                disabled={isServed}
                                type="button"
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                  isServed
                                    ? "bg-green-50 text-green-800 border-green-200"
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

