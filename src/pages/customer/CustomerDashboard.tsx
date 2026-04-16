import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, X, ChevronRight } from "lucide-react";
import { bookingService, type Booking } from "../../services/bookingService";
import MainLayout from "../../layouts/MainLayout";
import { publicHomestayService } from "../../services/publicHomestayService";
import { authService } from "../../services/authService";
import { provinceService } from "../../services/provinceService";
import { districtService } from "../../services/districtService";
import HomestayCard from "../../components/homestay/HomestayCard";
import type { Province, District } from "../../types/homestay.types";

const PRICE_MIN = 0;
const PRICE_MAX = 5000000;
const PRICE_STEP = 50000;

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatVnd(value: number): string {
  return vndFormatter.format(Number(value) || 0);
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const handleOpenCompare = () => {
    navigate('/customer/favorites');
  };
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // State cho bookings từ API
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  // State for all homestays
  const [allHomestays, setAllHomestays] = useState<any[]>([]);
  const [filteredHomestays, setFilteredHomestays] = useState<any[]>([]);

  const handlePriceChange = (value: number) => {
    const normalized = Math.min(Math.max(value, PRICE_MIN), PRICE_MAX);
    setMaxPrice(normalized);
  };

  // Load provinces & districts once
  useEffect(() => {
    provinceService.getAllProvinces().then(setProvinces);
    districtService.getAllDistricts().then(setAllDistricts);
  }, []);

  // Load bookings khi component mount
  useEffect(() => {
    loadBookings();
  }, []);

  // Load all homestays for search and display
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await publicHomestayService.list({ page: 1, pageSize: 100 });
        if (!mounted) return;
        const items = res.Items || [];
        // Sort theo averageRating cao → thấp
        const sorted = [...items].sort((a: any, b: any) => {
          const avgA = a.averageRating ?? a.rating ?? 0;
          const avgB = b.averageRating ?? b.rating ?? 0;
          const cntA = a.totalReviews ?? a.reviewCount ?? 0;
          const cntB = b.totalReviews ?? b.reviewCount ?? 0;
          if (avgB !== avgA) return avgB - avgA;
          return cntB - cntA; // tie-break: nhiều đánh giá hơn lên trước
        });
        if (!mounted) return;
        setAllHomestays(sorted);
        setFilteredHomestays(sorted);
      } catch (err) {
        console.error('Load all homestays failed', err);
      }
    };
    load();
    return () => { mounted = false };
  }, []);

  const loadBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const bookings = await bookingService.getMyBookings();
      setMyBookings(bookings);
    } catch (error) {
      console.error('Load bookings error:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Filter districts when province changes
  useEffect(() => {
    setSelectedDistrict("");
    if (!selectedProvince) {
      setFilteredDistricts([]);
    } else {
      setFilteredDistricts(
        allDistricts.filter(d => d.provinceName === selectedProvince)
      );
    }
  }, [selectedProvince, allDistricts]);

  // Tập homestayId đã bị block trong khoảng checkIn–checkOut đang chọn
  const bookedHomestayIds = useMemo(() => {
    if (!checkInDate || !checkOutDate) return new Set<string>();
    const selIn = new Date(checkInDate);
    const selOut = new Date(checkOutDate);
    const blocked = new Set<string>();
    myBookings.forEach(b => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return;
      const bIn = new Date(b.checkIn);
      const bOut = new Date(b.checkOut);
      if (selIn < bOut && selOut > bIn) {
        blocked.add(b.homestayId);
      }
    });
    return blocked;
  }, [checkInDate, checkOutDate, myBookings]);

  const upcomingConfirmedBookings = useMemo(() => {
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(now.getDate() + 7);

    return myBookings
      .filter((booking) => {
        if (booking.status !== 'CONFIRMED') return false;
        const checkIn = new Date(booking.checkIn);
        return checkIn >= now && checkIn <= oneWeekLater;
      })
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }, [myBookings]);

  // Filter homestays when province/district/date changes
  useEffect(() => {
    const district = allDistricts.find(d => d.id === selectedDistrict);

    let result = allHomestays.filter(h => {
      const matchProvince = !selectedProvince || (h.provinceName || '').toLowerCase() === selectedProvince.toLowerCase();
      const matchDistrict = !district || (h.districtName || '').toLowerCase() === district.name.toLowerCase();
      const price = Number(h.pricePerNight ?? 0);
      const matchMaxPrice = price <= maxPrice;
      return matchProvince && matchDistrict && matchMaxPrice;
    });

    if (checkInDate && checkOutDate) {
      const selIn = new Date(checkInDate);
      const selOut = new Date(checkOutDate);
      const hasLocationFilter = !!(selectedProvince || selectedDistrict);

      if (!hasLocationFilter) {
        // Chỉ chọn ngày, không filter địa điểm → ẩn luôn homestay đã bị block
        result = result.filter(h => {
          const isBlocked = myBookings.some(b => {
            if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
            if (b.homestayId !== h.id) return false;
            return selIn < new Date(b.checkOut) && selOut > new Date(b.checkIn);
          });
          return !isBlocked;
        });
      }
      // Có filter địa điểm → giữ tất cả, card sẽ tự mark "Đã đặt" qua bookedHomestayIds
    }

    setFilteredHomestays(result);
  }, [selectedProvince, selectedDistrict, checkInDate, checkOutDate, maxPrice, allHomestays, allDistricts, myBookings]);

  const hasPriceFilter = maxPrice < PRICE_MAX;

  const hasSearchFilter = !!(
    selectedProvince ||
    selectedDistrict ||
    (checkInDate && checkOutDate) ||
    hasPriceFilter
  );

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Chào mừng trở lại, {currentUser?.name}! 👋
          </h2>
          <p className="text-gray-600">Tìm kiếm homestay ven biển hoàn hảo cho bạn</p>
        </div>



        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Tìm Kiếm Homestay</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Tỉnh/Thành */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tỉnh/Thành</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Tất cả tỉnh/thành</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quận/Huyện */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quận/Huyện</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedProvince}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">Tất cả quận/huyện</option>
                  {filteredDistricts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ngày Nhận Phòng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Nhận Phòng
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={checkInDate}
                  min={today}
                  onChange={(e) => {
                    const newCheckIn = e.target.value;
                    setCheckInDate(newCheckIn);
                    if (checkOutDate && new Date(checkOutDate) <= new Date(newCheckIn)) {
                      setCheckOutDate(addDays(newCheckIn, 1));
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Ngày Trả Phòng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Trả Phòng
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate ? addDays(checkInDate, 1) : addDays(today, 1)}
                  onChange={(e) => {
                    const newCheckOut = e.target.value;
                    if (checkInDate && new Date(newCheckOut) <= new Date(checkInDate)) {
                      setCheckOutDate(addDays(checkInDate, 1));
                    } else {
                      setCheckOutDate(newCheckOut);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lọc Giá (VNĐ/đêm)</label>
              <button
                type="button"
                onClick={() => setShowPriceFilter((prev) => !prev)}
                className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
              >
                {hasPriceFilter ? `0 - ${formatVnd(maxPrice)}` : 'Chọn mức giá'}
              </button>

              {showPriceFilter && (
                <div className="absolute z-20 mt-2 w-full min-w-[260px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-gray-700">
                    <span>0 VNĐ</span>
                    <span>{formatVnd(maxPrice)}</span>
                  </div>
                  <input
                    type="range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={maxPrice}
                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                    className="mt-3 w-full accent-cyan-500"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>0</span>
                    <span>5.000.000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaxPrice(PRICE_MAX)}
                    className="mt-3 text-xs text-cyan-700 hover:text-cyan-800 font-medium"
                  >
                    Đặt lại giá
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        {isLoadingBookings ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Đang tải booking...</p>
          </div>
        ) : (
          <div className={`rounded-3xl border px-6 py-6 shadow-sm sm:px-8 ${upcomingConfirmedBookings.length > 0 ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white' : 'border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-white'}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${upcomingConfirmedBookings.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {upcomingConfirmedBookings.length > 0 ? 'Thông báo chuyến đi' : 'Lời chào từ CHMS'}
                </div>
                <p className="mt-3 text-xl font-bold leading-8 text-gray-900 sm:text-2xl">
                  {upcomingConfirmedBookings.length > 0
                    ? 'Bạn đang có 1 chuyến đi sắp tới, hãy chú ý nhé.'
                    : 'Chúng tôi rất vinh hạnh khi được đón tiếp bạn ở 1 homestay ven biển tuyệt đẹp.'}
                </p>
                {upcomingConfirmedBookings.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Có {upcomingConfirmedBookings.length} booking đã được xác nhận trong 7 ngày tới.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpcomingModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Xem chuyến sắp tới
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {showUpcomingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Chuyến đi sắp tới</h3>
                  <p className="text-sm text-gray-500">Danh sách booking đã được xác nhận trong 7 ngày tới</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpcomingModal(false)}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                {upcomingConfirmedBookings.length === 0 ? (
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-6 text-center text-gray-700">
                    Hiện tại bạn chưa có booking nào trong 7 ngày tới.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingConfirmedBookings.map((booking) => {
                      const hs = allHomestays.find((item) => item.id === booking.homestayId);
                      const homestayName = hs?.name || booking.homestayName || 'Homestay';
                      const location = hs?.address || `${hs?.districtName || ''}${hs?.districtName && hs?.provinceName ? ', ' : ''}${hs?.provinceName || ''}`.trim() || 'Đang cập nhật';

                      return (
                        <div key={booking.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{homestayName}</h4>
                              <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {location}
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Đã xác nhận
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                            <div className="rounded-xl bg-white px-4 py-3">
                              <div className="text-xs uppercase tracking-wide text-gray-400">Check-in</div>
                              <div className="mt-1 font-semibold">{new Date(booking.checkIn).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <div className="text-xs uppercase tracking-wide text-gray-400">Check-out</div>
                              <div className="mt-1 font-semibold">{new Date(booking.checkOut).toLocaleDateString('vi-VN')}</div>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <div className="text-xs uppercase tracking-wide text-gray-400">Khách</div>
                              <div className="mt-1 font-semibold">{booking.guestsCount} khách</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {hasSearchFilter && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Kết Quả Tìm Kiếm ({filteredHomestays.length})
                {checkInDate && checkOutDate && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    · {new Date(checkInDate).toLocaleDateString('vi-VN')} – {new Date(checkOutDate).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </h3>
            </div>
            {filteredHomestays.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Không tìm thấy homestay phù hợp
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredHomestays.map((homestay) => (
                  <HomestayCard
                    key={homestay.id}
                    homestay={homestay}
                    isBooked={bookedHomestayIds.has(homestay.id)}
                    onBook={() => navigate(`/homestays/${homestay.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Homestays */}
        {!hasSearchFilter && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Homestay Nổi Bật</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredHomestays.map((homestay) => (
                <HomestayCard
                  key={homestay.id}
                  homestay={homestay}
                  isBooked={bookedHomestayIds.has(homestay.id)}
                  onBook={() => navigate(`/homestays/${homestay.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Promotional Banner */}
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-2xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              🏖️ Trải Nghiệm Kỳ Nghỉ Tuyệt Vời
            </h3>
            <p className="text-lg text-blue-50 mb-6">
              Khám phá những homestay ven biển đẹp nhất Việt Nam. Đặt phòng dễ dàng, giá cả hợp lý, dịch vụ tận tâm.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>Đặt phòng nhanh chóng</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>Giá tốt nhất</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>Hỗ trợ 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleOpenCompare}
        className="fixed right-4 bottom-24 sm:right-6 sm:bottom-24 z-40 max-w-[340px] rounded-2xl border border-cyan-100 bg-white/95 backdrop-blur px-4 py-3 text-left shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
      >
        <p className="text-sm leading-5 text-gray-700">
          Bạn có đang phân vân giữa các homestay của chúng tôi?
          <span className="font-semibold text-cyan-700"> Hãy so sánh để quyết định dễ dàng hơn nhé.</span>
        </p>
      </button>
    </MainLayout>
  );
}
