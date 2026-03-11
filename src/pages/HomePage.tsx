import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from 'react-router-dom';
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { publicHomestayService } from "../services/publicHomestayService";
import type { Homestay } from "../types/homestay.types";
import MainLayout from "../layouts/MainLayout";
// Real homestays will be fetched from BE (system mode)

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState(1);

  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await publicHomestayService.list({ page: 1, pageSize: 8 });
        if (!mounted) return;
        setHomestays(res.Items || []);
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

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      // fetch more items to search locally (backend search doesn't support name)
      const res = await publicHomestayService.list({ page: 1, pageSize: 100 });
      const all = res.Items || [];
      if (!selectedLocation || selectedLocation.trim() === '') {
        setHomestays(all.slice(0, 8));
      } else {
        const query = selectedLocation.trim().toLowerCase();
        const filtered = all.filter(h => (h.name || '').toLowerCase().includes(query) || (h.address || '').toLowerCase().includes(query));
        setHomestays(filtered);
      }
    } catch (err) {
      console.error('Search error', err);
      setError('Tìm kiếm thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

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
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày Nhận Phòng</label>
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

          <button onClick={handleSearch} className="w-full mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-medium">
            <Search className="w-5 h-5" />
            Tìm Kiếm Homestay
          </button>
        </div>

        {/* Featured Homestays (fetched from API) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Homestay Nổi Bật</h3>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              Xem Tất Cả
              <ChevronRight className="w-4 h-4" />
            </button>
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
                          {homestay.pricePerNight ? homestay.pricePerNight.toLocaleString('vi-VN') + 'đ' : '-'}
                        </span>
                        <span className="text-sm text-gray-600">/đêm</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-4 pt-0">
                  <div className="flex justify-end">
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
          <h3 className="text-2xl font-bold mb-4">Hệ thống quản lý (System)</h3>
          <p className="text-blue-100 mb-6">
            Đây là chế độ System — chỉ dành cho khách thuê (customers). Mọi quản lý homestay do Admin thực hiện.
          </p>
          <p className="text-blue-100 text-sm">Nếu cần thêm homestay, vui lòng liên hệ quản trị viên hệ thống.</p>
        </div>
      </div>
    </MainLayout>
  );
}