import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import MainLayout from "../../layouts/MainLayout";
import { bookingService } from "../../services/bookingService";
import { diningService } from "../../services/diningService";
import type { DiningOrder } from "../../types/dining.types";

const timeLabel = (t: string) => String(t || "").slice(0, 5);

export default function BookingDiningOrdersPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DiningOrder[]>([]);

  const load = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const detail = await bookingService.getBookingDetail(bookingId);
      const list = ((detail as any)?.diningOrders ?? (detail as any)?.DiningOrders ?? []) as DiningOrder[];
      setOrders(Array.isArray(list) ? list : []);
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
    try {
      await diningService.customerCancelOrder(id);
      toast.success("Đã hủy món");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Không thể hủy món");
    }
  };

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
          <h1 className="text-xl font-bold text-gray-900">Danh sách đơn món</h1>
          <p className="text-sm text-gray-500 mt-1">Lịch sử đơn của booking hiện tại.</p>

          {loading ? (
            <div className="text-sm text-gray-500 mt-6 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
              Chưa có đơn món nào.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orders.map((o: any) => {
                const id = String(o?.id ?? o?.Id ?? "");
                const status = String(o?.status ?? o?.Status ?? "").toUpperCase();
                const canCancel = status === "PENDING";
                return (
                  <div key={id} className="rounded-2xl border border-gray-200 bg-white p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-900">{o?.comboName ?? o?.ComboName ?? "Combo"}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {String(o?.orderDate ?? o?.OrderDate ?? "").slice(0, 10)} • {timeLabel(String(o?.startTime ?? o?.StartTime ?? ""))}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {String(o?.serveLocation ?? o?.ServeLocation ?? "") === "BEACH" ? "Bãi biển" : "Phòng"} • {Number(o?.totalAmount ?? o?.TotalAmount ?? o?.price ?? o?.Price ?? 0).toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelOrder(id)}
                      disabled={!canCancel}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${canCancel ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"}`}
                    >
                      <XCircle className="w-4 h-4" />
                      Hủy
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
