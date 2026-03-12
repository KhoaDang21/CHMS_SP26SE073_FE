import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Star, ChevronRight, Heart } from "lucide-react";
import { authService } from "../../services/authService";
import { bookingService, type Booking } from "../../services/bookingService";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import MainLayout from "../../layouts/MainLayout";
import { publicHomestayService } from "../../services/publicHomestayService";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");

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
        setAllHomestays(res.Items || []);
        setFilteredHomestays(res.Items || []);
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
      label: "Tổng Booking",
      value: myBookings.length.toString(),
      icon: Heart,
      color: "bg-pink-500"
    },
    {
      label: "Đã Hoàn Thành",
      value: myBookings.filter(b => b.status === 'completed').length.toString(),
      icon: Star,
      color: "bg-yellow-500",
    },
  ];

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tên Homestay - chiếm 2 cột */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Homestay
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nhập tên homestay..."
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    // Auto search
                    const query = e.target.value.trim().toLowerCase();
                    if (!query) {
                      setFilteredHomestays(allHomestays);
                    } else {
                      const filtered = allHomestays.filter(h =>
                        (h.name || '').toLowerCase().includes(query)
                      );
                      setFilteredHomestays(filtered);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
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

        {/* Search Results */}
        {selectedLocation && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Kết Quả Tìm Kiếm ({filteredHomestays.length})
              </h3>
            </div>
            {filteredHomestays.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                Không tìm thấy homestay phù hợp với "{selectedLocation}"
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredHomestays.map((homestay) => (
                  <div
                    key={homestay.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                  >
                    <Link to={`/homestays/${homestay.id}`} className="block">
                      <div className="relative h-48 overflow-hidden">
                        <ImageWithFallback
                          src={homestay.images?.[0] || ''}
                          alt={homestay.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 line-clamp-1">
                            {homestay.name}
                          </h4>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {homestay.rating ?? '-'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                          <MapPin className="w-4 h-4" />
                          {homestay.address || `${homestay.city || ''} ${homestay.country || ''}`}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {homestay.maxGuests ?? '-'}
                          </span>
                          <span>{homestay.bedrooms ?? '-'} Phòng Ngủ</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div>
                            <span className="font-bold text-gray-900">
                              {homestay.pricePerNight ? homestay.pricePerNight.toLocaleString("vi-VN") + 'đ' : '-'}
                            </span>
                            <span className="text-sm text-gray-600">/đêm</span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => {
                          if (!authService.isAuthenticated()) {
                            navigate('/auth/login');
                            return;
                          }
                          navigate(`/homestays/${homestay.id}`);
                        }}
                        className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium"
                      >
                        Đặt Ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Homestays */}
        {!selectedLocation && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Homestay Nổi Bật</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredHomestays.slice(0, 8).map((homestay) => (
                <div
                  key={homestay.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  <Link to={`/homestays/${homestay.id}`} className="block">
                    <div className="relative h-48 overflow-hidden">
                      <ImageWithFallback
                        src={homestay.images?.[0] || ''}
                        alt={homestay.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute left-3 top-3 bg-white/80 rounded-full p-1 shadow">
                        <Star className="w-4 h-4 text-yellow-400" />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">
                          {homestay.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">
                            {homestay.rating ?? '-'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                        <MapPin className="w-4 h-4" />
                        {homestay.address || `${homestay.city || ''} ${homestay.country || ''}`}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {homestay.maxGuests ?? '-'}
                        </span>
                        <span>{homestay.bedrooms ?? '-'} Phòng Ngủ</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                          <span className="font-bold text-gray-900">
                            {homestay.pricePerNight ? homestay.pricePerNight.toLocaleString("vi-VN") + 'đ' : '-'}
                          </span>
                          <span className="text-sm text-gray-600">/đêm</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        if (!authService.isAuthenticated()) {
                          navigate('/auth/login');
                          return;
                        }
                        navigate(`/homestays/${homestay.id}`);
                      }}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium"
                    >
                      Đặt Ngay
                    </button>
                  </div>
                </div>
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
