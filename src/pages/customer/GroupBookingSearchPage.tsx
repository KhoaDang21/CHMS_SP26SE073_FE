import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { groupBookingService, type GroupBookingCalculation, type HomestayOption } from '../../services/groupBookingService';
import { districtService } from '../../services/districtService';
import { publicHomestayService } from '../../services/publicHomestayService';
import PromotionPicker from '../../components/customer/PromotionPicker';
import { promotionService } from '../../services/promotionService';
import HomestayCard from '../../components/homestay/HomestayCard';
import type { Homestay } from '../../types/homestay.types';
import type { Promotion } from '../../types/promotion.types';

function formatDate(value: string | null): string {
  if (!value) return 'Chưa chọn';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('vi-VN');
}

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('vi-VN')}đ`;

async function enrichHomestaysWithImages(homestays: HomestayOption[]): Promise<HomestayOption[]> {
  const enriched = await Promise.all(
    homestays.map(async (homestay) => {
      if (Array.isArray(homestay.images) && homestay.images.length > 0) {
        return homestay;
      }

      try {
        const detail = await publicHomestayService.getById(homestay.homestayId);
        return {
          ...homestay,
          images: detail?.images ?? homestay.images ?? [],
        };
      } catch {
        return homestay;
      }
    }),
  );

  return enriched;
}

export default function GroupBookingSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const districtId = searchParams.get('districtId') ?? '';
  const districtNameParam = searchParams.get('districtName') ?? '';
  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';
  const guestsCount = Number(searchParams.get('guestsCount') ?? '0');

  const [districtName, setDistrictName] = useState(districtNameParam);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<HomestayOption[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guestsByHomestay, setGuestsByHomestay] = useState<Record<string, number>>({});
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [calcResult, setCalcResult] = useState<GroupBookingCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    let active = true;

    const loadDistrictName = async () => {
      if (districtNameParam || !districtId) {
        setDistrictName(districtNameParam);
        return;
      }

      try {
        const districts = await districtService.getAllDistricts();
        const found = districts.find((district) => district.id === districtId);
        if (active) {
          setDistrictName(found?.name ?? districtNameParam);
        }
      } catch {
        if (active) {
          setDistrictName(districtNameParam);
        }
      }
    };

    loadDistrictName();

    return () => {
      active = false;
    };
  }, [districtId, districtNameParam]);

  useEffect(() => {
    let active = true;

    const loadPromotions = async () => {
      setPromotionsLoading(true);
      try {
        const response = await promotionService.getActiveForCustomer();
        const list = Array.isArray(response) ? response : ((response as any)?.data ?? []);
        if (active) {
          setPromotions(list as Promotion[]);
        }
      } catch (err) {
        if (active) {
          setPromotions([]);
        }
      } finally {
        if (active) {
          setPromotionsLoading(false);
        }
      }
    };

    loadPromotions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const search = async () => {
      if (!districtId || !checkIn || !checkOut || !guestsCount) {
        if (active) {
          setResults([]);
          setError('Thiếu thông tin tìm kiếm. Vui lòng quay lại trang chủ và nhập lại dữ liệu.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      setMessage('');

      try {
        const response = await groupBookingService.searchCombination({
          districtId,
          checkIn,
          checkOut,
          guestsCount,
        });

        const source = response.homestays ?? response.alternativeHomestays ?? response.recommendations ?? [];
        const enriched = await enrichHomestaysWithImages(source);

        if (!active) return;

        setResults(enriched);
        setMessage(response.message || (enriched.length > 0 ? '' : 'Không tìm thấy homestay phù hợp.'));
      } catch (err) {
        if (!active) return;
        setResults([]);
        setError('Không thể tải kết quả ghép phòng. Vui lòng thử lại sau.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    search();

    return () => {
      active = false;
    };
  }, [districtId, checkIn, checkOut, guestsCount]);

  const selectedHomestays = useMemo(
    () => results.filter((homestay) => selectedIds.includes(homestay.homestayId)),
    [results, selectedIds],
  );

  const selectedHomestayPrices = useMemo(
    () => selectedHomestays.reduce((sum, homestay) => sum + Number(homestay.pricePerNight ?? 0), 0),
    [selectedHomestays],
  );

  const totalSelectedGuests = useMemo(
    () => selectedIds.reduce((sum, homestayId) => sum + (guestsByHomestay[homestayId] ?? 1), 0),
    [guestsByHomestay, selectedIds],
  );

  const summaryItems = [
    { label: 'Khu vực', value: districtName || districtNameParam || 'Chưa chọn' },
    { label: 'Nhận phòng', value: formatDate(checkIn) },
    { label: 'Trả phòng', value: formatDate(checkOut) },
    { label: 'Số khách', value: guestsCount > 0 ? `${guestsCount} khách` : 'Chưa chọn' },
  ];

  const toggleSelect = (homestay: HomestayOption) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(homestay.homestayId);
      if (exists) {
        return prev.filter((id) => id !== homestay.homestayId);
      }

      return [...prev, homestay.homestayId];
    });

    setGuestsByHomestay((prev) => {
      if (selectedIds.includes(homestay.homestayId)) {
        const next = { ...prev };
        delete next[homestay.homestayId];
        return next;
      }

      return {
        ...prev,
        [homestay.homestayId]: prev[homestay.homestayId] ?? Math.min(Math.max(homestay.capacity ?? 1, 1), guestsCount || homestay.capacity || 1),
      };
    });
  };

  useEffect(() => {
    let active = true;

    const runCalculation = async () => {
      if (!checkIn || !checkOut || selectedIds.length === 0) {
        if (active) {
          setCalcResult(null);
          setCalculating(false);
        }
        return;
      }

      setCalculating(true);

      try {
        const calculation = await groupBookingService.calculateGroupBooking({
          checkIn,
          checkOut,
          guestsCount: totalSelectedGuests || guestsCount || 0,
          selectedHomestayIds: selectedIds,
          promotionId: selectedPromotionId || undefined,
        });

        if (active) {
          setCalcResult(calculation);
        }
      } catch (err) {
        if (active) {
          setCalcResult(null);
          setError('Không thể tự động tính giá đơn ghép.');
        }
      } finally {
        if (active) {
          setCalculating(false);
        }
      }
    };

    const timer = window.setTimeout(() => {
      runCalculation();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkIn, checkOut, guestsCount, selectedIds, selectedPromotionId, totalSelectedGuests]);

  const subtotalPrice = calcResult?.subTotal ?? null;
  const discountPrice = calcResult?.discountAmount ?? null;
  const totalSelectedPrice = calcResult?.totalPrice ?? null;
  const depositPrice = calcResult?.depositAmount ?? null;
  const remainingPrice = calcResult?.remainingAmount ?? null;

  const handleCreate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một homestay.');
      return;
    }

    if (!contactPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Thiếu thông tin ngày nhận hoặc trả phòng.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await groupBookingService.createGroupBooking({
        checkIn,
        checkOut,
        guestsCount: totalSelectedGuests || guestsCount || 0,
        selectedHomestayIds: selectedIds,
        note,
        contactPhone: contactPhone.trim(),
        promotionId: selectedPromotionId || undefined,
      });

      if (response.success) {
        toast.success(response.message || 'Tạo đơn ghép thành công.');
        navigate('/customer/bookings');
        return;
      }

      toast.error(response.message || 'Không thể tạo đơn ghép.');
    } catch (err) {
      toast.error('Không thể tạo đơn ghép. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 md:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại trang chủ
              </button>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                  <Search className="h-3.5 w-3.5" />
                  Kết quả tìm group booking
                </p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Homestay phù hợp tại {districtName || districtNameParam || 'khu vực đã chọn'}
                </h1>
                <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">
                  Chọn homestay ở cột trái, điền thông tin đặt đơn ở cột phải, và hệ thống sẽ tự tính tiền ngay khi thay đổi.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:w-[380px]">
              {summaryItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-right font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {message && !error && (
            <div className="mt-8 rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-cyan-900">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <section className="space-y-6">
              {loading ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
                  Đang tìm homestay phù hợp...
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                  <p className="text-lg font-semibold text-slate-900">Không có kết quả phù hợp</p>
                  <p className="mt-2 text-slate-600">
                    Hãy quay lại trang chủ và thử giảm số khách, đổi ngày hoặc chọn khu vực khác.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
                    >
                      <Search className="h-4 w-4" />
                      Tìm lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((homestay) => {
                    const selected = selectedIds.includes(homestay.homestayId);

                    return (
                      <div key={homestay.homestayId} className="relative">
                        <button
                          type="button"
                          onClick={() => toggleSelect(homestay)}
                          className={`absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${
                            selected
                              ? 'border-cyan-500 bg-cyan-600 text-white'
                              : 'border-white bg-white/95 text-slate-700 hover:border-cyan-200 hover:text-cyan-700'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {selected ? 'Đã chọn' : 'Chọn'}
                        </button>

                        <HomestayCard
                          homestay={
                            {
                              id: homestay.homestayId,
                              name: homestay.homestayName,
                              address: homestay.address,
                              districtName: districtName || districtNameParam || '',
                              provinceName: '',
                              images: homestay.images || [],
                              pricePerNight: homestay.pricePerNight || 0,
                              maxGuests: homestay.capacity || 0,
                              bedrooms: 0,
                              bathrooms: 0,
                              averageRating: homestay.ratings || 0,
                              totalReviews: 0,
                              rating: homestay.ratings || 0,
                              reviewCount: 0,
                            } as Homestay
                          }
                          showBookButton={false}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Đặt đơn ghép</h2>
                  <p className="mt-1 text-sm text-slate-600">Chọn homestay ở bên trái rồi nhập thông tin ngay trong khung này.</p>
                </div>
                <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  {selectedIds.length} đã chọn
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Đã chọn</span>
                    <strong>{selectedHomestays.length} homestay</strong>
                  </div>
                  <div className="mt-2 max-h-40 space-y-2 overflow-auto pr-1">
                    {selectedHomestays.length === 0 ? (
                      <div className="text-sm text-slate-500">Chưa chọn homestay nào.</div>
                    ) : (
                      selectedHomestays.map((homestay) => {
                        const guestCount = guestsByHomestay[homestay.homestayId] ?? 1;

                        return (
                          <div key={homestay.homestayId} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-semibold text-slate-900">{homestay.homestayName}</div>
                              <div className="text-xs text-slate-500">
                                {guestCount} khách · {homestay.capacity ?? '—'} khách tối đa
                              </div>
                            </div>
                            <div className="whitespace-nowrap text-sm font-semibold text-slate-900">
                              {typeof homestay.pricePerNight === 'number' ? `${homestay.pricePerNight.toLocaleString('vi-VN')}đ/đêm` : '—'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="text-sm">
                  <label className="block text-xs text-slate-600">Số điện thoại liên hệ</label>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <PromotionPicker
                  promotions={promotions}
                  loading={promotionsLoading}
                  selectedPromotionId={selectedPromotionId}
                  bookingTotal={selectedHomestayPrices || undefined}
                  onSelectPromotion={setSelectedPromotionId}
                />

                <div>
                  <label className="block text-xs text-slate-600">Ghi chú</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Ghi chú thêm cho đơn đặt ghép"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={
                      isCreating ||
                      selectedIds.length === 0 ||
                      !contactPhone.trim() ||
                      !checkIn ||
                      !checkOut ||
                      !calcResult
                    }
                    className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? 'Đang tạo...' : 'Tạo đơn ghép'}
                  </button>
                  <div className="ml-auto text-sm text-slate-700">
                    Tổng khách: <strong>{totalSelectedGuests}</strong>
                  </div>
                </div>

                {calculating && !calcResult && (
                  <div className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-700">
                    Đang tính tổng tiền tự động...
                  </div>
                )}

                {calcResult && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Tạm tính</span>
                      <strong>{subtotalPrice !== null ? formatMoney(subtotalPrice) : '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Giảm giá</span>
                      <strong>{discountPrice !== null ? `-${formatMoney(discountPrice)}` : '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                      <span className="font-semibold text-slate-900">Tổng tiền</span>
                      <strong className="text-slate-900">{totalSelectedPrice !== null ? formatMoney(totalSelectedPrice) : '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Đặt cọc</span>
                      <strong>{depositPrice !== null ? formatMoney(depositPrice) : '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Còn lại</span>
                      <strong>{remainingPrice !== null ? formatMoney(remainingPrice) : '—'}</strong>
                    </div>
                    {Array.isArray(calcResult.breakdowns) && calcResult.breakdowns.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phân bổ theo homestay</div>
                        {calcResult.breakdowns.map((item) => (
                          <div key={item.homestayId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="line-clamp-1 text-sm font-semibold text-slate-900">{item.homestayName}</div>
                                <div className="text-xs text-slate-500">
                                  {item.roomCount ?? 0} homestay · {item.nightsCount ?? 0} đêm
                                </div>
                              </div>
                              <div className="whitespace-nowrap text-sm font-semibold text-slate-900">
                                {typeof item.subtotal === 'number' ? formatMoney(item.subtotal) : '—'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
