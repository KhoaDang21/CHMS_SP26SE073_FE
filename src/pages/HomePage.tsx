import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar } from "lucide-react";
import { publicHomestayService } from "../services/publicHomestayService";
import { bookingService, type Booking } from "../services/bookingService";
import { authService } from "../services/authService";
import { provinceService } from "../services/provinceService";
import { districtService } from "../services/districtService";
import HomestayCard from "../components/homestay/HomestayCard";
import toast from 'react-hot-toast';
import type { Homestay } from "../types/homestay.types";
import type { Province, District } from "../types/homestay.types";
import MainLayout from "../layouts/MainLayout";
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const tr = (vi: string, en: string) => (isEn ? en : vi);
  const navigate = useNavigate();
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

  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  // Load provinces & districts once
  useEffect(() => {
    provinceService.getAllProvinces().then(setProvinces);
    districtService.getAllDistricts().then(setAllDistricts);
  }, []);

  // Load bookings nếu đã login (để tính booked dates)
  useEffect(() => {
    if (authService.isAuthenticated() && authService.isTokenValid()) {
      bookingService.getMyBookings().then(setMyBookings).catch(() => {});
    }
  }, []);

  // Load all homestays initially
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await publicHomestayService.list({ page: 1, pageSize: 100 });
        if (!mounted) return;
        const items: Homestay[] = res.Items || [];
        const sorted = [...items].sort((a, b) => {
          const avgA = a.averageRating ?? a.rating ?? 0;
          const avgB = b.averageRating ?? b.rating ?? 0;
          const cntA = a.totalReviews ?? a.reviewCount ?? 0;
          const cntB = b.totalReviews ?? b.reviewCount ?? 0;
          if (avgB !== avgA) return avgB - avgA;
          return cntB - cntA;
        });
        if (!mounted) return;
        setAllHomestays(sorted);
        setHomestays(sorted);
      } catch (err) {
        console.error('Load homestays error', err);
        if (!mounted) return;
        setError('Không thể tải danh sách homestay.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

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

  // Tập homestayId đã bị block trong khoảng ngày đang chọn
  const bookedHomestayIds = useMemo(() => {
    if (!checkInDate || !checkOutDate) return new Set<string>();
    const selIn = new Date(checkInDate);
    const selOut = new Date(checkOutDate);
    const blocked = new Set<string>();
    myBookings.forEach(b => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return;
      if (selIn < new Date(b.checkOut) && selOut > new Date(b.checkIn)) {
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
        // Chỉ chọn ngày → ẩn luôn homestay đã bị block
        result = result.filter(h => !myBookings.some(b => {
          if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
          if (b.homestayId !== h.id) return false;
          return selIn < new Date(b.checkOut) && selOut > new Date(b.checkIn);
        }));
      }
      // Có filter địa điểm → giữ tất cả, card mark "Đã đặt" qua bookedHomestayIds
    }

    setHomestays(result);
  }, [selectedProvince, selectedDistrict, checkInDate, checkOutDate, allHomestays, allDistricts, myBookings]);

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {tr('Khám Phá Homestay', 'Discover Coastal Homestays')}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
              {tr('Ven Biển Tuyệt Đẹp', 'By The Beautiful Sea')}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {tr(
              'Tìm kiếm và đặt những homestay ven biển tuyệt vời nhất Việt Nam. Trải nghiệm kỳ nghỉ hoàn hảo với view biển tuyệt đẹp.',
              'Search and book the best coastal homestays in Vietnam. Enjoy a perfect vacation with breathtaking sea views.'
            )}
          </p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{tr('Ngày Nhận Phòng', 'Check-in Date')}</label>
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

        {/* Featured Homestays (fetched from API) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {(selectedProvince || selectedDistrict || (checkInDate && checkOutDate))
                ? `${tr('Kết Quả Tìm Kiếm', 'Search Results')} (${homestays.length})`
                : tr('Homestay Nổi Bật', 'Featured Homestays')}
              {checkInDate && checkOutDate && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  · {new Date(checkInDate).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')} – {new Date(checkOutDate).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                </span>
              )}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading && (
              <div className="col-span-full text-center py-8">{tr('Đang tải homestay...', 'Loading homestays...')}</div>
            )}

            {error && (
              <div className="col-span-full text-center text-red-600">{error}</div>
            )}

            {!loading && !error && homestays.length === 0 && (
              <div className="col-span-full text-center py-8">{tr('Không có homestay nào.', 'No homestays found.')}</div>
            )}

            {!loading && homestays.map((homestay) => (
              <HomestayCard
                key={homestay.id}
                homestay={homestay}
                isBooked={bookedHomestayIds.has(homestay.id)}
                onBook={async () => {
                  if (!authService.isAuthenticated() || !authService.isTokenValid()) {
                    if (authService.isAuthenticated() && !authService.isTokenValid()) {
                      toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
                    }
                    navigate('/auth/login');
                    return;
                  }
                  if (!checkInDate || !checkOutDate) {
                    toast.error('Vui lòng chọn ngày nhận và trả phòng trước khi đặt.');
                    return;
                  }
                  if (new Date(checkInDate) < new Date(today)) {
                    toast.error('Ngày nhận phòng không được nhỏ hơn ngày hiện tại.');
                    return;
                  }
                  if (new Date(checkOutDate) <= new Date(checkInDate)) {
                    toast.error('Ngày trả phòng phải sau ngày nhận phòng.');
                    return;
                  }
                  try {
                    const payload = { homestayId: homestay.id, checkIn: checkInDate, checkOut: checkOutDate, guestsCount: 1 };
                    const res = await bookingService.createBooking(payload as any);
                    if (res && (res as any).success) {
                      toast.success('Đặt phòng thành công!');
                      navigate('/customer/bookings');
                    } else {
                      toast.error((res as any).message || 'Đặt phòng thất bại');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Đã xảy ra lỗi khi đặt phòng. Vui lòng thử lại.');
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-2xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              {tr('🏖️ Trải Nghiệm Kỳ Nghỉ Tuyệt Vời', '🏖️ Enjoy A Wonderful Vacation')}
            </h3>
            <p className="text-lg text-blue-50 mb-6">
              {tr(
                'Khám phá những homestay ven biển đẹp nhất Việt Nam. Đặt phòng dễ dàng, giá cả hợp lý, dịch vụ tận tâm.',
                'Discover Vietnam\'s most beautiful coastal homestays. Easy booking, fair pricing, and dedicated service.'
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span>✓</span>
                <span>{tr('Đặt phòng nhanh chóng', 'Quick booking')}</span>
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