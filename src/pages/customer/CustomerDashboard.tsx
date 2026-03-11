import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  Heart,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { authService } from "../../services/authService";
import { bookingService, type Booking } from "../../services/bookingService";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import MainLayout from "../../layouts/MainLayout";
import toast from "react-hot-toast";
import { publicHomestayService } from "../../services/publicHomestayService";
import { Link } from 'react-router-dom';

// Featured homestays loaded from API
const [featuredHomestays, setFeaturedHomestays] = useState<any[]>([]);

useEffect(() => {
  let mounted = true;
  const load = async () => {
    try {
      const res = await publicHomestayService.list({ page: 1, pageSize: 4 });
      if (!mounted) return;
      setFeaturedHomestays(res.Items || []);
    } catch (err) {
      console.error('Load featured homestays failed', err);
    }
  };
  load();
  return () => { mounted = false };
}, []);

export default function CustomerDashboard() {
  const currentUser = authService.getUser();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState(1);

  // State cho bookings từ API
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  // Load bookings khi component mount
  useEffect(() => {
    loadBookings();
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

  // Lọc booking sắp tới (confirmed và chưa qua ngày checkIn)
  const upcomingBookings = myBookings.filter(
    b => b.status === 'confirmed' && new Date(b.checkIn) >= new Date()
  );

  const stats = [
    {
      label: "Chuyến Đi Sắp Tới",
      value: upcomingBookings.length.toString(),
      icon: Calendar,
      color: "bg-blue-500",
    },
    {
      label: "Yêu Thích",
      value: "2",
      icon: Heart,
      color: "bg-pink-500"
    },
    {
      label: "Điểm Thưởng",
      value: "1,250",
      icon: Star,
      color: "bg-yellow-500",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Chào mừng trở lại, {currentUser?.name}! 👋
          </h2>
          <p className="text-gray-600">Tìm kiếm homestay ven biển hoàn hảo cho bạn</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Tìm Kiếm Homestay</h3>
            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Bộ Lọc Nâng Cao</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa Điểm
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Bạn muốn đi đâu?"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Nhận Phòng
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Trả Phòng
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số Khách
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} Khách
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => toast('Tính năng tìm kiếm đang phát triển', { icon: 'ℹ️' })}
            className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-medium"
          >
            <Search className="w-5 h-5" />
            Tìm Kiếm Homestay
          </button>
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
              <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                Xem Tất Cả
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-40 h-40 sm:h-auto relative">
                      <ImageWithFallback
                        src={booking.image}
                        alt={booking.homestayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {booking.homestayName || 'Homestay'}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {booking.location || 'Đang cập nhật'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {booking.status === 'confirmed' ? 'Đã Xác Nhận' :
                            booking.status === 'pending' ? 'Chờ Xác Nhận' :
                              booking.status === 'cancelled' ? 'Đã Hủy' : 'Hoàn Thành'}
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

        {/* Featured Homestays */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Homestay Nổi Bật</h3>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              Xem Tất Cả
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredHomestays.map((homestay) => (
              <div
                key={homestay.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                <div className="relative h-48 overflow-hidden">
                  <ImageWithFallback
                    src={homestay.image}
                    alt={homestay.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <button
                    onClick={() => toast('Tính năng yêu thích đang phát triển', { icon: 'ℹ️' })}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-5 h-5 ${homestay.isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-gray-600"
                        }`}
                    />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 line-clamp-1">
                      {homestay.name}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {homestay.rating}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                    <MapPin className="w-4 h-4" />
                    {homestay.location}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {homestay.guests}
                    </span>
                    <span>{homestay.bedrooms} Phòng Ngủ</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="font-bold text-gray-900">
                        {homestay.price.toLocaleString("vi-VN")}đ
                      </span>
                      <span className="text-sm text-gray-600">/đêm</span>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium">
                      Đặt Ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Homestays (from API or cache) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Tất cả Homestay</h3>
          </div>
          <HomestaysList />
        </div>
      </div>
    </MainLayout>
  );
}

function HomestaysList() {
  const [homestays, setHomestays] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        // try cache first
        // @ts-ignore access internal cache
        const cached = publicHomestayService._cache?.lastList ?? []
        if (cached && cached.length > 0) {
          if (!mounted) return
          setHomestays(cached)
        } else {
          const res = await publicHomestayService.list({ page: 1, pageSize: 24 })
          if (!mounted) return
          setHomestays(res.Items || [])
        }
      } catch (err) {
        console.error('Load homestays for customer dashboard', err)
        if (!mounted) return
        setError('Không thể tải homestay')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="py-8 text-center">Đang tải homestay...</div>
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>
  if (!homestays || homestays.length === 0) return <div className="py-8 text-center">Không có homestay nào.</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {homestays.map((h: any) => (
        <Link key={h.id} to={`/homestays/${h.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="relative h-44 overflow-hidden">
            <ImageWithFallback src={h.images?.[0] ?? ''} alt={h.name} className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <h4 className="font-semibold text-gray-900 line-clamp-1">{h.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{h.address}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm font-bold">{h.pricePerNight ? h.pricePerNight.toLocaleString('vi-VN') + 'đ' : '-'}</div>
              <div className="text-sm text-gray-600">{h.rating ?? '-'}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}