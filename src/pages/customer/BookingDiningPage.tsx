import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Check, Clock, MapPin, Loader2, UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";
import MainLayout from "../../layouts/MainLayout";
import { bookingService, type Booking } from "../../services/bookingService";
import { publicHomestayService } from "../../services/publicHomestayService";
import { diningService } from "../../services/diningService";
import type { AvailableDiningTimeSlot, DiningCombo, DiningServeLocation } from "../../types/dining.types";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

const dateISO = (d: Date) => d.toISOString().slice(0, 10);
const timeLabel = (startTime: string) => String(startTime || "").slice(0, 5);

const toDateOnly = (iso: string) => new Date(`${String(iso).slice(0, 10)}T00:00:00`);
const addDaysISO = (iso: string, delta: number) => {
  const d = toDateOnly(iso);
  d.setDate(d.getDate() + delta);
  return dateISO(d);
};
const clampDateISO = (value: string, min: string, max: string) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export default function BookingDiningPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [homestay, setHomestay] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [combos, setCombos] = useState<DiningCombo[]>([]);
  const [date, setDate] = useState(dateISO(new Date()));
  const [slots, setSlots] = useState<AvailableDiningTimeSlot[]>([]);

  const [selectedComboId, setSelectedComboId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [serveLocation, setServeLocation] = useState<DiningServeLocation>("ROOM");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const dateBounds = useMemo(() => {
    const today = dateISO(new Date());
    const checkIn = String((booking as any)?.checkIn ?? (booking as any)?.CheckIn ?? "");
    const checkOut = String((booking as any)?.checkOut ?? (booking as any)?.CheckOut ?? "");

    // Allowed dining dates: [checkIn, checkOut) (exclude checkout day)
    const maxStayDate = checkOut ? addDaysISO(checkOut, -1) : "";
    const minAllowed = checkIn ? (today > checkIn ? today : checkIn) : today;
    const maxAllowed = maxStayDate || today;

    const expired = !!maxStayDate && today > maxStayDate;
    return { today, checkIn, checkOut, minAllowed, maxAllowed, expired };
  }, [booking]);

  const load = async () => {
    if (!bookingId) {
      toast.error("Không tìm thấy mã booking");
      navigate("/customer/bookings");
      return;
    }

    setLoading(true);
    try {
      const detail = await bookingService.getBookingDetail(bookingId);
      if (!detail) {
        toast.error("Không tìm thấy booking");
        navigate("/customer/bookings");
        return;
      }
      setBooking(detail);

      const hs = await publicHomestayService.getById(detail.homestayId);
      setHomestay(hs);

      const comboList = await diningService.customerGetCombos(detail.homestayId);
      setCombos(comboList);
      if (!selectedComboId && comboList.length > 0) setSelectedComboId(comboList[0].id);

      // Clamp selected date to valid range once booking loaded
      const today = dateISO(new Date());
      const checkIn = String((detail as any)?.checkIn ?? (detail as any)?.CheckIn ?? "");
      const checkOut = String((detail as any)?.checkOut ?? (detail as any)?.CheckOut ?? "");
      const maxStayDate = checkOut ? addDaysISO(checkOut, -1) : "";
      const minAllowed = checkIn ? (today > checkIn ? today : checkIn) : today;
      const maxAllowed = maxStayDate || today;
      setDate((prev) => clampDateISO(prev || minAllowed, minAllowed, maxAllowed));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tải dữ liệu đặt món");
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (homestayId: string, d: string) => {
    setLoadingSlots(true);
    try {
      const list = await diningService.customerGetAvailableSlots(homestayId, d);
      setSlots(list);
      // reset selection if not available
      if (selectedSlotId && !list.some((x) => x.id === selectedSlotId && x.isAvailable)) {
        setSelectedSlotId("");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tải khung giờ trống");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (booking?.homestayId && date && !dateBounds.expired) {
      loadSlots(booking.homestayId, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.homestayId, date, dateBounds.expired]);

  const selectedCombo = useMemo(
    () => combos.find((c) => c.id === selectedComboId) ?? null,
    [combos, selectedComboId],
  );
  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );

  const placeOrder = async () => {
    if (!bookingId || !booking) return;
    if (dateBounds.expired) {
      toast.error("Booking đã quá hạn lưu trú, không thể đặt món.");
      return;
    }
    if (date < dateBounds.minAllowed || date > dateBounds.maxAllowed) {
      toast.error("Ngày phục vụ không hợp lệ (đã qua hạn hoặc ngoài thời gian lưu trú).");
      return;
    }
    if (!selectedComboId) {
      toast.error("Vui lòng chọn món");
      return;
    }
    if (!selectedSlotId) {
      toast.error("Vui lòng chọn khung giờ");
      return;
    }
    if (selectedSlot && !selectedSlot.isAvailable) {
      toast.error(selectedSlot.disableReason || "Khung giờ này không khả dụng");
      return;
    }

    setSubmitting(true);
    try {
      const createdOrders: DiningOrder[] = [];
      for (let i = 0; i < quantity; i += 1) {
        const created = await diningService.customerCreateOrder({
          bookingId,
          comboId: selectedComboId,
          quantity: 1,
          timeSlotId: selectedSlotId,
          orderDate: date,
          serveLocation,
          note: note.trim() || undefined,
        });
        if (!created?.id) break;
        createdOrders.push(created);
      }

      if (createdOrders.length === quantity) {
        toast.success("Đặt món thành công. Tiền sẽ được cộng vào hóa đơn phòng.");
      } else if (createdOrders.length > 0) {
        toast.success(`Đặt thành công ${createdOrders.length}/${quantity} đơn. Slot còn lại có thể đã hết.`);
      } else {
        toast.error("Không thể đặt món ở khung giờ đã chọn.");
      }
      setNote("");
      setQuantity(1);
      await load();
      await loadSlots(booking.homestayId, date);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể đặt món");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/customer/bookings")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 mb-6"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại booking
        </button>

        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-cyan-600" />
            <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : !booking ? null : (
          <div className="space-y-6">
            {/* Left: booking + order form */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <UtensilsCrossed className="w-6 h-6 text-cyan-700" />
                      Đặt món ăn
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Không cần thanh toán ngay. Tiền sẽ được cộng vào hóa đơn phòng khi checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/customer/bookings/${bookingId}/dining/orders`)}
                    className="px-3 py-2 text-sm font-semibold border border-cyan-200 text-cyan-700 rounded-lg hover:bg-cyan-50"
                  >
                    Xem danh sách đơn
                  </button>
                  <div className="text-right text-sm text-gray-500">
                    <div>Booking</div>
                    <div className="font-medium text-gray-800">{booking.id.slice(0, 8)}</div>
                  </div>
                </div>

                {homestay && (
                  <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 flex gap-4">
                    <div className="w-28 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      <ImageWithFallback
                        src={homestay?.images?.[0] || ""}
                        alt={homestay?.name || "Homestay"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate">{homestay?.name || booking.homestayName}</div>
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{homestay?.address || "—"}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.checkIn).toLocaleDateString("vi-VN")} → {new Date(booking.checkOut).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Chọn ngày</div>
                    <input
                      value={date}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDate(clampDateISO(next, dateBounds.minAllowed, dateBounds.maxAllowed));
                      }}
                      type="date"
                      min={dateBounds.minAllowed}
                      max={dateBounds.maxAllowed}
                      disabled={dateBounds.expired}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white"
                    />
                    {dateBounds.expired && (
                      <div className="text-xs text-red-600 mt-2">
                        Booking đã quá hạn lưu trú, không thể đặt món.
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Vị trí phục vụ</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setServeLocation("ROOM")}
                        className={`px-4 py-2 rounded-xl font-semibold border ${serveLocation === "ROOM"
                          ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        Phòng
                      </button>
                      <button
                        type="button"
                        onClick={() => setServeLocation("BEACH")}
                        className={`px-4 py-2 rounded-xl font-semibold border ${serveLocation === "BEACH"
                          ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        Bãi biển
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Chọn món</div>
                  {combos.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
                      Homestay này chưa có menu.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {combos.map((c) => {
                        const active = c.id === selectedComboId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedComboId(c.id)}
                            className={`text-left rounded-2xl border p-4 transition-all ${active
                              ? "border-cyan-300 bg-cyan-50 shadow-sm"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                          >
                            <div className="flex gap-4">
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                <ImageWithFallback
                                  src={c.imageUrl || ""}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-gray-900 truncate">{c.name}</div>
                                <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                                <div className="text-sm mt-2 text-gray-700">
                                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                                    {Number(c.price || 0).toLocaleString("vi-VN")}đ
                                  </span>
                                  <span className="text-gray-400"> • </span>
                                  <span>Tối đa {c.maxPeople} người</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-700" />
                    Chọn khung giờ
                  </div>
                  {loadingSlots ? (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải khung giờ...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
                      Chưa có khung giờ hoặc ngày này không khả dụng.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {slots.map((s) => {
                        const active = s.id === selectedSlotId;
                        const disabled = !s.isAvailable;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlotId(s.id)}
                            title={disabled ? (s.disableReason || "Không khả dụng") : `Còn ${s.remainingCapacity} suất`}
                            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${disabled
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : active
                                ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                              }`}
                          >
                            <div>{timeLabel(s.startTime)}</div>
                            <div className={`text-xs mt-1 ${disabled ? "text-gray-400" : "text-gray-500"}`}>
                              {disabled ? (s.disableReason || "Không khả dụng") : `Còn ${s.remainingCapacity}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Sức chứa khung giờ được tính theo số đơn, không theo số lượng món trong một đơn.
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Số lượng</div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"
                    >
                      -
                    </button>
                    <div className="min-w-10 text-center font-semibold text-gray-900">{quantity}</div>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 font-bold text-gray-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Ghi chú (tuỳ chọn)</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ví dụ: ít cay, giao muộn 10 phút..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-2xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 flex items-center justify-between">
                  <div className="text-sm text-cyan-900">
                    {selectedCombo ? (
                      <>
                        <div className="font-semibold">Tạm tính</div>
                        <div className="text-xs text-cyan-700 mt-1">{selectedCombo.name} x{quantity} • {timeLabel(selectedSlot?.startTime || "")} • {serveLocation === "BEACH" ? "Bãi biển" : "Phòng"}</div>
                      </>
                    ) : (
                      <div className="font-semibold">Chọn món để xem tạm tính</div>
                    )}
                  </div>
                  <div className="text-cyan-900 font-black text-lg">
                    {selectedCombo ? `${Number((selectedCombo.price || 0) * quantity).toLocaleString("vi-VN")}đ` : "—"}
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={submitting || !selectedComboId || !selectedSlotId || dateBounds.expired}
                  type="button"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {submitting ? "Đang đặt..." : "Chốt đơn"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="text-sm text-gray-600">
                <div className="font-semibold text-gray-900 mb-2">Lưu ý</div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                    <span>Danh sách đơn món được quản lý ở trang riêng để dễ theo dõi trạng thái.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

