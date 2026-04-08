import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Plus, Minus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { bookingService, type Booking } from '../../services/bookingService';
import { experienceService } from '../../services/experienceService';
import type { LocalExperience } from '../../types/experience.types';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import {
  buildSpecialRequestsWithExperiences,
  extractBookingExperienceData,
  type BookingExperienceItem,
} from '../../utils/bookingExperience';

const fallbackExperienceImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?auto=format&fit=crop&w=1200&q=80',
];

const normalizeId = (value?: string) => String(value ?? '').trim().toLowerCase();

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

        const existing = extractBookingExperienceData(resolvedBooking.specialRequests);
        const nextQty: Record<string, number> = {};
        existing.items.forEach((item) => {
          if (item.id) nextQty[item.id] = Math.max(1, item.qty);
        });
        setQtyMap(nextQty);
        setError(null);
      } catch (error) {
        console.error('Load booking experiences error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Không thể tải dữ liệu dịch vụ. Vui lòng thử lại.';
        setError(errorMsg);
        if (mounted) {
          toast.error(errorMsg);
        }
      } finally {
        if (mounted) setLoading(false);
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
    if (!bookingId || !booking) return;

    setSaving(true);
    try {
      const parsed = extractBookingExperienceData(booking.specialRequests);
      const payloadItems: BookingExperienceItem[] = selectedItems.map((x) => ({
        id: x.item.id,
        name: x.item.name,
        qty: x.qty,
        price: x.item.price,
      }));

      const merged = buildSpecialRequestsWithExperiences(parsed.note, payloadItems);
      const res = await bookingService.updateSpecialRequests(bookingId, merged);
      if (!res.success) {
        toast.error(res.message || 'Không thể lưu dịch vụ thêm');
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
