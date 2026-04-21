import { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { MapPin } from "lucide-react";
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

const PRICE_MIN = 0;
const PRICE_MAX = 5000000;
const PRICE_STEP = 50000;

const HERO_IMAGES = [
  'https://static.vinwonders.com/production/vui-choi-tai-bien-doc-let.jpg',
  'https://static.vinwonders.com/2022/04/doc-let-nha-trang.jpg',
  'https://static.vinwonders.com/2022/04/doc-let-nha-trang-9.jpg',
  'https://static.vinwonders.com/production/ruong-muoi-hon-khoi.jpg',
  'https://cdn-media.sforum.vn/storage/app/media/ctvseo_MH/%E1%BA%A3nh%20%C4%91%E1%BA%B9p%20ninh%20thu%E1%BA%ADn/anh-dep-ninh-thuan-3.jpg',
  'https://cdn-media.sforum.vn/storage/app/media/ctvseo_MH/%E1%BA%A3nh%20%C4%91%E1%BA%B9p%20ninh%20thu%E1%BA%ADn/anh-dep-ninh-thuan-2.jpg',
];

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatVnd(value: number): string {
  return vndFormatter.format(Number(value) || 0);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [checkInDate] = useState("");
  const [checkOutDate] = useState("");
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [activeHeroImage, setActiveHeroImage] = useState(0);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);

  const selectedProvinceName = useMemo(
    () => provinces.find((p) => p.id === selectedProvince)?.name ?? '',
    [provinces, selectedProvince],
  );

  const handlePriceChange = (value: number) => {
    const normalized = Math.min(Math.max(value, PRICE_MIN), PRICE_MAX);
    setMaxPrice(normalized);
  };

  const scrollToSearchSection = () => {
    const section = document.getElementById('home-search-section');
    if (!section) return;

    const offset = 90;
    const targetTop = window.scrollY + section.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  };

  // Load provinces & districts once
  useEffect(() => {
    provinceService.getAllProvinces().then(setProvinces);
    districtService.getAllDistricts().then(setAllDistricts);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  // Load bookings nếu đã login (để tính booked dates)
  useEffect(() => {
    if (authService.isAuthenticated() && authService.isTokenValid()) {
      bookingService.getMyBookings().then(setMyBookings).catch(() => { });
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
    if (!selectedProvinceName) {
      setFilteredDistricts([]);
    } else {
      setFilteredDistricts(
        allDistricts.filter((d) => (d.provinceName || '').toLowerCase() === selectedProvinceName.toLowerCase())
      );
    }
  }, [selectedProvinceName, allDistricts]);

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
      const matchProvince = !selectedProvinceName || (h.provinceName || '').toLowerCase() === selectedProvinceName.toLowerCase();
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
  }, [selectedProvinceName, selectedDistrict, checkInDate, checkOutDate, maxPrice, allHomestays, allDistricts, myBookings]);

  const hasPriceFilter = maxPrice < PRICE_MAX;

  const hasSearchFilter = !!(
    selectedProvince ||
    selectedDistrict ||
    (checkInDate && checkOutDate) ||
    hasPriceFilter
  );

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-[2rem] min-h-[420px] sm:min-h-[500px] lg:min-h-[560px]">
          {HERO_IMAGES.map((image, index) => (
            <img
              key={image}
              src={image}
              alt="Banner homestay ven biển"
              className={`absolute inset-0 h-full w-full object-cover chms-hero-slide ${activeHeroImage === index ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 900ms ease-in-out' }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/45 to-cyan-950/20" />
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -bottom-24 left-10 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl" />

          <div className="relative z-10 h-full flex items-center">
            <div className="px-6 sm:px-10 lg:px-14 max-w-4xl py-14 sm:py-20">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold tracking-wide text-white/90 backdrop-blur">
                Coastal Homestay
              </p>
              <h1 className="mt-5 text-white text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                Chào mừng đến với
                <span className="block text-cyan-300">Coastal Homestay</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/85 leading-relaxed">
                Hệ thống Homestay ven biển thân thiện, tiện nghi, giá cả hợp lý, dịch vụ tận tâm đang chờ bạn khám phá.
              </p>
              <button
                type="button"
                onClick={scrollToSearchSection}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-amber-300"
              >
                Khám phá
              </button>
            </div>
          </div>
        </section>

        {/* Search Section */}
        <div id="home-search-section" className="relative z-20 -mt-14 sm:-mt-16 lg:-mt-20 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Tìm Kiếm Homestay</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tỉnh/Thành */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Điểm đến</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Chọn điểm đến, khách sạn theo sở thích ...</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quận/Huyện */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedProvince}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">Chọn khu vực lưu trú</option>
                  {filteredDistricts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mức giá */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mức giá (VNĐ/đêm)</label>
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

        {/* Featured Homestays (fetched from API) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {hasSearchFilter
                ? `Kết Quả Tìm Kiếm (${homestays.length})`
                : 'Homestay Nổi Bật'}
              {checkInDate && checkOutDate && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  · {new Date(checkInDate).toLocaleDateString('vi-VN')} – {new Date(checkOutDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading && (
              <div className="col-span-full text-center py-8">Đang tải homestay...</div>
            )}

            {error && (
              <div className="col-span-full text-center text-red-600">{error}</div>
            )}

            {!loading && !error && homestays.length === 0 && (
              <div className="col-span-full text-center py-8">Không có homestay nào.</div>
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