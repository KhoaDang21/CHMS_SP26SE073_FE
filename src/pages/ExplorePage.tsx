import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Search, MapPin, Users, Star, Heart, SlidersHorizontal } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import toast from 'react-hot-toast';

const mockHomestays = [
  {
    id: 1,
    name: "Sunset Beach Villa",
    location: "Nha Trang, Khánh Hòa",
    price: 2500000,
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1712311082180-4fd73ded1b1c?w=400",
    guests: 6,
    bedrooms: 3,
  },
  {
    id: 2,
    name: "Ocean View Paradise",
    location: "Đà Nẵng",
    price: 1800000,
    rating: 4.8,
    reviews: 95,
    image: "https://images.unsplash.com/photo-1761920555057-54bbc392135c?w=400",
    guests: 4,
    bedrooms: 2,
  },
  {
    id: 3,
    name: "Tropical Beachfront",
    location: "Phú Quốc, Kiên Giang",
    price: 3200000,
    rating: 5.0,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1583401535382-a0814c295b0b?w=400",
    guests: 8,
    bedrooms: 4,
  },
  {
    id: 4,
    name: "Coastal Dream House",
    location: "Vũng Tàu",
    price: 1500000,
    rating: 4.7,
    reviews: 73,
    image: "https://images.unsplash.com/photo-1709775901932-86f1c3137861?w=400",
    guests: 5,
    bedrooms: 2,
  },
  {
    id: 5,
    name: "Seaside Retreat",
    location: "Quy Nhơn, Bình Định",
    price: 2200000,
    rating: 4.8,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    guests: 6,
    bedrooms: 3,
  },
  {
    id: 6,
    name: "Beach Paradise Villa",
    location: "Mũi Né, Bình Thuận",
    price: 2800000,
    rating: 4.9,
    reviews: 112,
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400",
    guests: 7,
    bedrooms: 3,
  },
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const filteredHomestays = mockHomestays.filter(homestay => {
    const matchesSearch = homestay.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         homestay.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = selectedLocation === 'all' || homestay.location.includes(selectedLocation);
    return matchesSearch && matchesLocation;
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Khám Phá Homestay Ven Biển</h1>
          <p className="text-lg text-gray-600">Tìm kiếm và đặt homestay ven biển tuyệt đẹp tại Việt Nam</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc địa điểm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Địa điểm</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                >
                  <option value="all">Tất cả địa điểm</option>
                  <option value="Nha Trang">Nha Trang</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Phú Quốc">Phú Quốc</option>
                  <option value="Vũng Tàu">Vũng Tàu</option>
                  <option value="Quy Nhơn">Quy Nhơn</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            Tìm thấy <span className="font-semibold text-gray-900">{filteredHomestays.length}</span> homestay
          </p>
        </div>

        {/* Homestay Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomestays.map((homestay) => (
            <div
              key={homestay.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={homestay.image}
                  alt={homestay.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <button 
                  onClick={() => toast('Vui lòng đăng nhập để lưu yêu thích', { icon: '🔒' })}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <Heart className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{homestay.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{homestay.rating}</span>
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
                  <span>{homestay.bedrooms} Phòng ngủ</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900">
                      {homestay.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-sm text-gray-600">/đêm</span>
                  </div>
                  <button 
                    onClick={() => toast('Vui lòng đăng nhập để đặt phòng', { icon: '🔒' })}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredHomestays.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Không tìm thấy homestay phù hợp</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}