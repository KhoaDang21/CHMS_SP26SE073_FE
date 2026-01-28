import { useState } from "react";
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
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import MainLayout from "../layouts/MainLayout";

// Mock data for homestays
const featuredHomestays = [
  {
    id: 1,
    name: "Sunset Beach Villa",
    location: "Nha Trang, Khánh Hòa",
    price: 2500000,
    rating: 4.9,
    reviews: 128,
    image:
      "https://images.unsplash.com/photo-1712311082180-4fd73ded1b1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwdmlsbGF8ZW58MXx8fHwxNzY3ODIzMjY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    guests: 6,
    bedrooms: 3,
    isFavorite: true,
  },
  {
    id: 2,
    name: "Ocean View Paradise",
    location: "Đà Nẵng, Việt Nam",
    price: 1800000,
    rating: 4.8,
    reviews: 95,
    image:
      "https://images.unsplash.com/photo-1761920555057-54bbc392135c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwaG9tZXN0YXl8ZW58MXx8fHwxNzY3ODUxOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    guests: 4,
    bedrooms: 2,
    isFavorite: false,
  },
  {
    id: 3,
    name: "Tropical Beachfront",
    location: "Phú Quốc, Kiên Giang",
    price: 3200000,
    rating: 5.0,
    reviews: 156,
    image:
      "https://images.unsplash.com/photo-1583401535382-a0814c295b0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHZpZXclMjByZXNvcnR8ZW58MXx8fHwxNzY3ODUxOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    guests: 8,
    bedrooms: 4,
    isFavorite: true,
  },
  {
    id: 4,
    name: "Coastal Dream House",
    location: "Vũng Tàu, Bà Rịa-Vũng Tàu",
    price: 1500000,
    rating: 4.7,
    reviews: 73,
    image:
      "https://images.unsplash.com/photo-1709775901932-86f1c3137861?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwaG91c2V8ZW58MXx8fHwxNzY3ODUxOTYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    guests: 5,
    bedrooms: 2,
    isFavorite: false,
  },
];

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState(1);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Khám Phá Homestay
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
              Ven Biển Tuyệt Đẹp
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tìm kiếm và đặt những homestay ven biển tuyệt vời nhất Việt Nam. 
            Trải nghiệm kỳ nghỉ hoàn hảo với view biển tuyệt đẹp.
          </p>
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

          <button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-medium">
            <Search className="w-5 h-5" />
            Tìm Kiếm Homestay
          </button>
        </div>

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
                  <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                    <Heart
                      className={`w-5 h-5 ${
                        homestay.isFavorite 
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

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Bạn có homestay muốn cho thuê?</h3>
          <p className="text-blue-100 mb-6">
            Tham gia cùng chúng tôi và bắt đầu kiếm thu nhập từ homestay của bạn ngay hôm nay!
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Đăng Ký Làm Chủ Nhà
          </button>
        </div>
      </div>
    </MainLayout>
  );
}