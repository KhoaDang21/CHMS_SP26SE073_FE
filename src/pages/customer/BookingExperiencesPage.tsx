import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Plus, Minus, Sparkles, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { bookingService, type Booking } from '../../services/bookingService';
import { experienceService } from '../../services/experienceService';
import type { LocalExperience } from '../../types/experience.types';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const fallbackExperienceImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?auto=format&fit=crop&w=1200&q=80',
];

const normalizeId = (value?: string) => String(value ?? '').trim().toLowerCase();
const normalizeText = (value?: string) => String(value ?? '').trim().toLowerCase();
const toDateOnly = (value?: string) => String(value ?? '').slice(0, 10);

type AvailableExperienceSchedule = {
  id: string;
  localExperienceId?: string;
  experienceId?: string;
  experienceName?: string;
  imageUrl?: string;
  availableDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  price?: number;
  remainingSlots?: number;
  availableQuantity?: number;
};

export default function BookingExperiencesPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [experiences, setExperiences] = useState<LocalExperience[]>([]);
  
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [allAvailableSchedules, setAllAvailableSchedules] = useState<AvailableExperienceSchedule[]>([]);
  const [expandedScheduleExperienceId, setExpandedScheduleExperienceId] = useState<string | null>(null);

  const getSchedulesForExperience = (experience: LocalExperience) => {
    return allAvailableSchedules.filter((s) => {
      const idOnSchedule = normalizeId(s.localExperienceId ?? s.experienceId);
      if (idOnSchedule) return idOnSchedule === normalizeId(experience.id);

      const nameOnSchedule = normalizeText(s.experienceName);
      const nameOnCard = normalizeText(experience.name);
      return Boolean(nameOnSchedule) && nameOnSchedule === nameOnCard;
    });
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!bookingId) {
        setError('Không tìm thấy mã booking.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [bookingDetail, allExperiences] = await Promise.all([
          bookingService.getBookingDetail(bookingId),
          experienceService.list(),
        ]);

        if (!mounted) return;

        let resolvedBooking = bookingDetail;
        if (!resolvedBooking) {
          const myBookings = await bookingService.getMyBookings();
          resolvedBooking = myBookings.find((item) => item.id === bookingId) ?? null;
        }

        if (!resolvedBooking) {
          const err = 'Không tìm thấy booking. Vui lòng kiểm tra lại.';
          setError(err);
          toast.error(err);
          return;
        }

        setBooking(resolvedBooking);
        const activeItems = allExperiences.filter((item) => item.isActive);
        const bookingHomestayId = normalizeId(resolvedBooking.homestayId);
        const filteredByHomestay = bookingHomestayId
          ? activeItems.filter((item) => normalizeId(item.homestayId) === bookingHomestayId)
          : activeItems;

        setExperiences(filteredByHomestay);

        if (bookingHomestayId && filteredByHomestay.length === 0 && activeItems.length > 0) {
          toast('Homestay này hiện chưa có dịch vụ thêm phù hợp.');
        }

        // Initialize qty map as empty — experiences are now managed via separate API
        setQtyMap({});
        setError(null);
        // preload available schedules for this booking (if any)
        try {
          setSchedulesLoading(true);
          const av = await bookingService.getAvailableExperienceSchedules(bookingId);
          const rawItems = av?.data ?? av ?? [];
          const items = Array.isArray(rawItems) ? rawItems : [];
          const checkInDate = toDateOnly(resolvedBooking.checkIn);
          const checkOutDate = toDateOnly(resolvedBooking.checkOut);

          const normalizedSchedules: AvailableExperienceSchedule[] = items
            .map((s: any) => ({
              id: String(s?.id ?? s?.scheduleId ?? ''),
              localExperienceId: s?.localExperienceId ?? s?.experienceId,
              experienceId: s?.experienceId,
              experienceName: s?.experienceName ?? s?.name,
              imageUrl: s?.imageUrl,
              availableDate: s?.availableDate ?? s?.date,
              date: s?.date,
              startTime: s?.startTime ?? s?.start_time,
              endTime: s?.endTime ?? s?.end_time,
              price: Number(s?.price ?? 0),
              remainingSlots: s?.remainingSlots,
              availableQuantity: s?.availableQuantity,
            }))
            .filter((s) => Boolean(s.id));

          // Extra client-side safety filter by booking date range.
          const filteredByBookingDate = normalizedSchedules.filter((s) => {
            const d = toDateOnly(s.availableDate ?? s.date);
            if (!d || !checkInDate || !checkOutDate) return true;
            return d >= checkInDate && d <= checkOutDate;
          });

          setAllAvailableSchedules(filteredByBookingDate);
        } catch (err) {
          console.debug('No available schedules or failed to load', err);
          setAllAvailableSchedules([]);
        } finally {
          setSchedulesLoading(false);
        }
      } catch (error) {
        console.error('Load booking experiences error', error);
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
      };

    load();

    return () => {
      mounted = false;
    };
  }, [bookingId, navigate, retryCount]);

  const selectedItems = useMemo(() => {
    return experiences
      .filter((item) => (qtyMap[item.id] ?? 0) > 0)
      .map((item) => ({ item, qty: qtyMap[item.id] ?? 0 }));
  }, [experiences, qtyMap]);

  const estimateTotal = useMemo(() => {
    return selectedItems.reduce((sum, x) => sum + (x.item.price ?? 0) * x.qty, 0);
  }, [selectedItems]);

  const handleSave = async () => {
    if (!bookingId) return;

    setSaving(true);
    try {
      // Build experiences payload (separate API, not in specialRequests)
      const experiencesPayload = selectedItems.map((x) => ({
        experienceId: x.item.id,
        quantity: x.qty,
      }));

      if (experiencesPayload.length === 0) {
        toast('Vui lòng chọn ít nhất một dịch vụ');
        setSaving(false);
        return;
      }

      const res = await bookingService.addExperiencesViaModify(bookingId, experiencesPayload);
      if (!res || !res.success) {
        toast.error(res?.message || 'Không thể lưu dịch vụ thêm');
        setSaving(false);
        return;
      }

      toast.success('Đã cập nhật dịch vụ thêm cho booking');
      navigate('/customer/bookings');
    } catch (error) {
      console.error('Save booking experiences error:', error);
      toast.error('Không thể lưu dịch vụ thêm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/customer/bookings')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại booking
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-600" />
                Chọn dịch vụ thêm cho booking
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Bạn có thể cập nhật dịch vụ thêm trước khi sử dụng dịch vụ tại homestay.
              </p>
            </div>
            {booking && (
              <div className="text-right text-sm text-gray-500">
                <div>Booking ID</div>
                <div className="font-medium text-gray-800">{booking.id.slice(0, 8)}</div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              Đang tải dữ liệu...
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="text-red-600 font-semibold mb-4">⚠️ {error}</div>
              <button
                onClick={() => setRetryCount((prev) => prev + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => navigate('/customer/bookings')}
                className="ml-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Quay lại
              </button>
            </div>
          ) : experiences.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-gray-500">Chưa có dịch vụ khả dụng cho homestay này.</div>
              <button
                onClick={() => navigate('/customer/bookings')}
                className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Quay lại
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {experiences.map((item, index) => {
                  const qty = qtyMap[item.id] ?? 0;
                  const checked = qty > 0;
                  const thumbnail = item.imageUrl || fallbackExperienceImages[index % fallbackExperienceImages.length];
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <label className="flex items-start gap-3 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setQtyMap((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked ? Math.max(1, prev[item.id] ?? 1) : 0,
                              }));
                            }}
                            className="mt-1"
                          />
                          <div className="w-28 h-24 sm:w-32 sm:h-28 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white shadow-sm">
                            <ImageWithFallback
                              src={thumbnail}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-lg">{item.name}</div>
                            <div className="text-sm sm:text-base text-gray-500 mt-1">
                              {item.categoryName || item.categoryId || 'Không phân loại'}
                              {' • '}
                              {typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}
                            </div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-2 leading-6">{item.description}</div>
                            )}
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedScheduleExperienceId((prev) => (prev === item.id ? null : item.id));
                                }}
                                className="text-sm px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                              >
                                {expandedScheduleExperienceId === item.id ? 'Ẩn lịch trình' : 'Xem lịch trình'}
                              </button>
                            </div>
                            {expandedScheduleExperienceId === item.id && (
                              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                <div className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                                  <span className="font-semibold">Lịch trình phù hợp với thời gian booking.</span>
                                  {booking?.checkIn && booking?.checkOut && (
                                    <span>
                                      {' '}
                                      ({new Date(booking.checkIn).toLocaleDateString('vi-VN')} - {new Date(booking.checkOut).toLocaleDateString('vi-VN')})
                                    </span>
                                  )}
                                </div>
                                {schedulesLoading ? (
                                  <div className="text-sm text-gray-500">Đang tải lịch trình...</div>
                                ) : getSchedulesForExperience(item).length === 0 ? (
                                  <div className="text-sm text-gray-500">Hiện chưa có lịch trình trong khoảng ngày của booking.</div>
                                ) : (
                                  getSchedulesForExperience(item).map((sch) => (
                                    <div key={sch.id} className="rounded-md border bg-white p-3 flex items-center justify-between gap-3">
                                      <div>
                                        <div className="font-medium text-sm">{(sch.availableDate ?? sch.date) ? new Date(sch.availableDate ?? sch.date ?? '').toLocaleDateString('vi-VN') : '-'}</div>
                                        <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                                          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {sch.startTime ?? '-'} - {sch.endTime ?? '-'}</span>
                                          {sch.price ? <span>• {Number(sch.price).toLocaleString('vi-VN')}đ</span> : null}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">Còn: {sch.remainingSlots ?? sch.availableQuantity ?? '-'}</div>
                                      </div>
                                      <button
                                        onClick={async () => {
                                          try {
                                            const qtyForExperience = Math.max(1, qtyMap[item.id] ?? 1);
                                            await bookingService.addExperienceToBooking(bookingId!, {
                                              localExperienceScheduleId: sch.id,
                                              quantity: qtyForExperience,
                                            });
                                            toast.success('Đã thêm lịch trình vào booking');
                                            setExpandedScheduleExperienceId(null);
                                            navigate('/customer/bookings');
                                          } catch (err) {
                                            console.error('Add schedule to booking error', err);
                                            toast.error('Không thể thêm lịch trình.');
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm"
                                      >
                                        Chọn
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setQtyMap((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                              }));
                            }}
                            className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-7 text-center font-semibold text-base">{qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQtyMap((prev) => ({
                                ...prev,
                                [item.id]: Math.min(9, (prev[item.id] ?? 0) + 1),
                              }));
                            }}
                            className="w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cyan-900 font-semibold">
                    Đã chọn {selectedItems.length} dịch vụ
                  </span>
                  <span className="text-cyan-900 font-bold">
                    Ước tính: {estimateTotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lưu dịch vụ thêm
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
