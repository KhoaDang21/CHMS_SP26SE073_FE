import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, XCircle, UtensilsCrossed, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import MainLayout from "../../layouts/MainLayout";
import { diningService } from "../../services/diningService";
import type { DiningOrder } from "../../types/dining.types";

const timeLabel = (t: string) => String(t || "").slice(0, 5);
const fmtVND = (n: number) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: "Chờ xác nhận", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  PREPARING: { label: "Đang làm",     color: "#2563eb", bg: "#dbeafe", border: "#bfdbfe" },
  SERVED:    { label: "Đã phục vụ",   color: "#059669", bg: "#d1fae5", border: "#a7f3d0" },
  CANCELLED: { label: "Đã hủy",       color: "#94a3b8", bg: "#f1f5f9", border: "#e2e8f0" },
};

export default function BookingDiningOrdersPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [orders, setOrders] = useState<DiningOrder[]>([]);

  const load = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      // Gọi trực tiếp manager orders API để lấy đầy đủ thông tin đơn theo bookingId
      // Fallback: lấy từ booking detail nếu có
      const { bookingService } = await import("../../services/bookingService");
      const detail = await bookingService.getBookingDetail(bookingId);
      const raw: any[] = (detail as any)?.diningOrders ?? (detail as any)?.DiningOrders ?? [];
      if (Array.isArray(raw) && raw.length > 0) {
        setOrders(raw.map((o: any) => ({
          id: String(o?.id ?? o?.Id ?? ""),
          comboName: String(o?.comboName ?? o?.ComboName ?? "Combo"),
          imageUrl: o?.imageUrl ?? o?.ImageUrl,
          orderDate: String(o?.orderDate ?? o?.OrderDate ?? ""),
          startTime: String(o?.startTime ?? o?.StartTime ?? ""),
          endTime: String(o?.endTime ?? o?.EndTime ?? ""),
          serveLocation: String(o?.serveLocation ?? o?.ServeLocation ?? "ROOM"),
          status: String(o?.status ?? o?.Status ?? "PENDING"),
          price: Number(o?.price ?? o?.Price ?? 0),
          totalAmount: Number(o?.totalAmount ?? o?.TotalAmount ?? o?.price ?? o?.Price ?? 0),
          paymentStatus: String(o?.paymentStatus ?? o?.PaymentStatus ?? ""),
          note: o?.note ?? o?.Note,
          itemCount: Number(o?.itemCount ?? o?.ItemCount ?? 1),
          items: [],
        })));
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const cancelOrder = async (id: string) => {
    setCancelling(id);
    try {
      await diningService.customerCancelOrder(id);
      toast.success("Đã hủy món. Tiền đã được trừ khỏi hóa đơn.");
      // Optimistic update — đổi status ngay, rồi reload
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)),
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Không thể hủy món");
    } finally {
      setCancelling(null);
    }
  };

  const activeOrders = orders.filter((o) => o.status.toUpperCase() !== "CANCELLED");
  const cancelledOrders = orders.filter((o) => o.status.toUpperCase() === "CANCELLED");
  const totalActive = activeOrders.reduce((s, o) => s + (o.totalAmount || o.price || 0), 0);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(`/customer/bookings/${bookingId}/dining`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đặt món
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-cyan-700" />
              Đơn món đã đặt
            </h1>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-sm text-gray-500">Lịch sử đơn của booking hiện tại.</p>

          {/* Tổng tiền active */}
          {activeOrders.length > 0 && (
            <div className="mt-4 rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-cyan-800 font-medium">
                {activeOrders.length} đơn đang hoạt động
              </span>
              <span className="text-base font-bold text-cyan-900">{fmtVND(totalActive)}</span>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-500 mt-6 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
              <UtensilsCrossed className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              Chưa có đơn món nào.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {/* Active orders first */}
              {activeOrders.map((o) => <OrderCard key={o.id} order={o} cancelling={cancelling} onCancel={cancelOrder} />)}
              {/* Cancelled orders */}
              {cancelledOrders.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Đã hủy</div>
                  {cancelledOrders.map((o) => <OrderCard key={o.id} order={o} cancelling={cancelling} onCancel={cancelOrder} />)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function OrderCard({
  order,
  cancelling,
  onCancel,
}: {
  order: DiningOrder;
  cancelling: string | null;
  onCancel: (id: string) => void;
}) {
  const status = String(order.status || "").toUpperCase();
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  const canCancel = status === "PENDING";
  const isCancelling = cancelling === order.id;

  return (
    <div
      className={`rounded-2xl border p-4 flex items-start justify-between gap-4 transition-opacity ${
        status === "CANCELLED" ? "opacity-60" : ""
      }`}
      style={{ borderColor: cfg.border, backgroundColor: status === "CANCELLED" ? "#f8fafc" : "#fff" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 truncate">{order.comboName}</span>
          {(order.itemCount ?? 0) > 1 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              x{order.itemCount}
            </span>
          )}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {String(order.orderDate || "").slice(0, 10)}
          {order.startTime ? ` • ${timeLabel(order.startTime)}` : ""}
          {order.endTime ? ` – ${timeLabel(order.endTime)}` : ""}
        </div>
        <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
          <span>{order.serveLocation === "BEACH" ? "🏖 Bãi biển" : "🛏 Phòng"}</span>
          <span className="font-semibold text-gray-800">
            {fmtVND(order.totalAmount || order.price || 0)}
          </span>
        </div>
        {order.note && (
          <div className="text-xs text-gray-400 mt-1 italic truncate">Ghi chú: {order.note}</div>
        )}
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(order.id)}
          disabled={isCancelling}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:opacity-50"
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Hủy
        </button>
      )}
    </div>
  );
}
