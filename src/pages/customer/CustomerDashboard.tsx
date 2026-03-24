import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, ChevronRight } from "lucide-react";
import { bookingService, type Booking } from "../../services/bookingService";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import MainLayout from "../../layouts/MainLayout";
import { publicHomestayService } from "../../services/publicHomestayService";
import { authService } from "../../services/authService";
import { provinceService } from "../../services/provinceService";
import { districtService } from "../../services/districtService";
import HomestayCard, { fetchReviewSummary } from "../../components/homestay/HomestayCard";
import type { Province, District } from "../../types/homestay.types";

export default function CustomerDashboard() {
  const navigate = useNavigate();
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
        // Fetch ratings song song rồi sort cao → thấp
        const summaries = await Promise.allSettled(items.map((h: any) => fetchReviewSummary(h.id)));
        const sorted = [...items].sort((a: any, b: any) => {
          const sa = summaries[items.indexOf(a)];
          const sb = summaries[items.indexOf(b)];
          const avgA = sa.status === 'fulfilled' ? sa.value.avg : 0;
          const avgB = sb.status === 'fulfilled' ? sb.value.avg : 0;
          const cntA = sa.status === 'fulfilled' ? sa.value.count : 0;
          const cntB = sb.status === 'fulfilled' ? sb.value.count : 0;
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

  const homestayMap = useMemo(() => {
    const map: Record<string, any> = {};
    allHomestays.forEach((h: any) => {
      if (h?.id) map[h.id] = h;
    });
    return map;
  }, [allHomestays]);

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

  // Lọc booking sắp tới (CONFIRMED/CHECKED_IN và chưa qua ngày checkOut)
  const upcomingBookings = myBookings.filter(
    b => (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && new Date(b.checkOut) >= new Date()
  );



  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </div>

        {/* Upcoming Bookings */}
        {isLoadingBookings ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Đang tải booking...</p>
          </div>
        ) : upcomingBookings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Chuyến Đi Sắp Tới</h3>
              <Link to="/customer/bookings" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                Xem Tất Cả
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-40 h-40 sm:h-auto relative bg-gray-100">
                      {(() => {
                        const hs = homestayMap[booking.homestayId];
                        const img = hs?.images?.[0] || '';
                        const alt = hs?.name || 'Homestay';
                        return (
                          <ImageWithFallback
                            src={img}
                            alt={alt}
                            className="w-full h-full object-cover"
                          />
                        );
                      })()}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {(() => {
                              const hs = homestayMap[booking.homestayId];
                              const cleaned = booking.homestayName && !/loading/i.test(String(booking.homestayName))
                                ? booking.homestayName
                                : undefined;
                              return hs?.name || cleaned || 'Homestay';
                            })()}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {(() => {
                              const hs = homestayMap[booking.homestayId];
                              if (hs?.address) return hs.address;
                              const cityCountry = `${hs?.city || ''} ${hs?.country || ''}`.trim();
                              return cityCountry || 'Đang cập nhật';
                            })()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                          booking.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : booking.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : booking.status === 'COMPLETED'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status === 'CONFIRMED'
                            ? 'Đã Xác Nhận'
                            : booking.status === 'PENDING'
                            ? 'Chờ Thanh Toán'
                            : booking.status === 'CANCELLED'
                            ? 'Đã Hủy'
                            : booking.status === 'COMPLETED'
                            ? 'Hoàn Thành'
                            : 'Trạng Thái'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.checkIn).toLocaleDateString("vi-VN")}
                        </span>
                        <span>→</span>
                        <span>
                          {new Date(booking.checkOut).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {booking.guestsCount} Khách
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {(selectedProvince || selectedDistrict || (checkInDate && checkOutDate)) && (
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
        {!selectedProvince && !selectedDistrict && !(checkInDate && checkOutDate) && (
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
    </MainLayout>
  );
}
