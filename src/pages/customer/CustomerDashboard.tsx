import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, X, ChevronRight } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { bookingService, type Booking } from "../../services/bookingService";
import MainLayout from "../../layouts/MainLayout";
import { publicHomestayService } from "../../services/publicHomestayService";
import { authService } from "../../services/authService";
import { provinceService } from "../../services/provinceService";
import { districtService } from "../../services/districtService";
import HomestayCard from "../../components/homestay/HomestayCard";
import type { Province, District } from "../../types/homestay.types";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const tr = (vi: string, en: string) => (isEn ? en : vi);
  const currentUser = authService.getUser();
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

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
      return matchProvince && matchDistrict;
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
  }, [selectedProvince, selectedDistrict, checkInDate, checkOutDate, allHomestays, allDistricts, myBookings]);

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {tr('Chào mừng trở lại', 'Welcome back')}, {currentUser?.name}! 👋
          </h2>
          <p className="text-gray-600">{tr('Tìm kiếm homestay ven biển hoàn hảo cho bạn', 'Find the perfect coastal homestay for you')}</p>
        </div>



        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{tr('Tìm Kiếm Homestay', 'Search Homestays')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tỉnh/Thành */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{tr('Tỉnh/Thành', 'Province/City')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">{tr('Tất cả tỉnh/thành', 'All provinces/cities')}</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quận/Huyện */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{tr('Quận/Huyện', 'District')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedProvince}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">{tr('Tất cả quận/huyện', 'All districts')}</option>
                  {filteredDistricts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ngày Nhận Phòng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {tr('Ngày Nhận Phòng', 'Check-in Date')}
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
                {tr('Ngày Trả Phòng', 'Check-out Date')}
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
          </div>
        </div>

        {/* Upcoming Bookings */}
        {isLoadingBookings ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">{tr('Đang tải booking...', 'Loading bookings...')}</p>
          </div>
        ) : (
          <div className={`rounded-3xl border px-6 py-6 shadow-sm sm:px-8 ${upcomingConfirmedBookings.length > 0 ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white' : 'border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-white'}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${upcomingConfirmedBookings.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {upcomingConfirmedBookings.length > 0 ? tr('Thông báo chuyến đi', 'Trip notification') : tr('Lời chào từ CHMS', 'Greetings from CHMS')}
                </div>
                <p className="mt-3 text-xl font-bold leading-8 text-gray-900 sm:text-2xl">
                  {upcomingConfirmedBookings.length > 0
                    ? tr('Bạn đang có 1 chuyến đi sắp tới, hãy chú ý nhé.', 'You have 1 upcoming trip, please take note.')
                    : tr('Chúng tôi rất vinh hạnh khi được đón tiếp bạn ở 1 homestay ven biển tuyệt đẹp.', 'We are honored to host you at a beautiful coastal homestay.')}
                </p>
                {upcomingConfirmedBookings.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {tr('Có', 'There are')} {upcomingConfirmedBookings.length} {tr('booking đã được xác nhận trong 7 ngày tới.', 'confirmed bookings in the next 7 days.')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpcomingModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  {tr('Xem chuyến sắp tới', 'View upcoming trips')}
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
                  <h3 className="text-xl font-bold text-gray-900">{tr('Chuyến đi sắp tới', 'Upcoming trips')}</h3>
                  <p className="text-sm text-gray-500">{tr('Danh sách booking đã được xác nhận trong 7 ngày tới', 'List of confirmed bookings in the next 7 days')}</p>
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
                    {tr('Hiện tại bạn chưa có booking nào trong 7 ngày tới.', 'You currently have no bookings in the next 7 days.')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingConfirmedBookings.map((booking) => {
                      const hs = allHomestays.find((item) => item.id === booking.homestayId);
                      const homestayName = hs?.name || booking.homestayName || 'Homestay';
                      const location = hs?.address || `${hs?.districtName || ''}${hs?.districtName && hs?.provinceName ? ', ' : ''}${hs?.provinceName || ''}`.trim() || tr('Đang cập nhật', 'Updating');

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
                              {tr('Đã xác nhận', 'Confirmed')}
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
                              <div className="text-xs uppercase tracking-wide text-gray-400">{tr('Khách', 'Guests')}</div>
                              <div className="mt-1 font-semibold">{booking.guestsCount} {tr('khách', 'guests')}</div>
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
        {(selectedProvince || selectedDistrict || (checkInDate && checkOutDate)) && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {tr('Kết Quả Tìm Kiếm', 'Search Results')} ({filteredHomestays.length})
                {checkInDate && checkOutDate && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    · {new Date(checkInDate).toLocaleDateString('vi-VN')} – {new Date(checkOutDate).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </h3>
            </div>
            {filteredHomestays.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {tr('Không tìm thấy homestay phù hợp', 'No matching homestays found')}
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
        {!selectedProvince && !selectedDistrict && !(checkInDate && checkOutDate) && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{tr('Homestay Nổi Bật', 'Featured Homestays')}</h3>
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
              {tr('🏖️ Trải Nghiệm Kỳ Nghỉ Tuyệt Vời', '🏖️ Enjoy an Amazing Vacation')}
            </h3>
            <p className="text-lg text-blue-50 mb-6">
              {tr('Khám phá những homestay ven biển đẹp nhất Việt Nam. Đặt phòng dễ dàng, giá cả hợp lý, dịch vụ tận tâm.', 'Discover Vietnam’s most beautiful coastal homestays. Easy booking, fair pricing, and dedicated service.')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>{tr('Đặt phòng nhanh chóng', 'Fast booking')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>{tr('Giá tốt nhất', 'Best price')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>{tr('Hỗ trợ 24/7', '24/7 support')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
