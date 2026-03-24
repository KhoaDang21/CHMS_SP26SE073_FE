import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Phone, Users, XCircle, Pencil, MessageSquareText, ChevronRight, RefreshCcw, Home, Clock, CreditCard, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { bookingService, type Booking } from '../../services/bookingService';
import { reviewService, type Review } from '../../services/reviewService';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { publicHomestayService } from '../../services/publicHomestayService';
import PaymentModal from './PaymentModal';
import ReviewModal from './ReviewModal';
import type { Homestay } from '../../types/homestay.types';

const cleanLoadingText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/loading/i.test(value) || /đang cập nhật/i.test(value)) return undefined;
  return value;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const [selected, setSelected] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<any | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editGuests, setEditGuests] = useState(1);
  const [editPhone, setEditPhone] = useState('');
  const [editSpecialRequests, setEditSpecialRequests] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailHomestay, setDetailHomestay] = useState<Homestay | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [homestayMap, setHomestayMap] = useState<Record<string, Homestay>>({});
  const [payingBooking, setPayingBooking] = useState<{
    id: string; homestayName: string; checkIn: string; checkOut: string;
    totalNights: number; guestsCount: number; pricePerNight: number; totalPrice: number;
  } | null>(null);

  const [reviewingBooking, setReviewingBooking] = useState<{ id: string; homestayName: string } | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [myReviewsMap, setMyReviewsMap] = useState<Record<string, Review | undefined>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      // Sắp xếp mới nhất lên đầu theo createdAt
      const sorted = [...res].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setBookings(sorted);

      // Load user's reviews to know which bookings already have reviews
      try {
        const myReviews: Review[] = await reviewService.getMyReviews();
        const map: Record<string, Review | undefined> = {};
        (myReviews || []).forEach(r => { if (r.bookingId) map[r.bookingId] = r; });
        setMyReviewsMap(map);
      } catch (e) {
        console.error('Load my reviews failed', e);
        setMyReviewsMap({});
      }
      // Load homestay info để hiển thị đúng name/address/image
      try {
        const homestaysRes = await publicHomestayService.list({ page: 1, pageSize: 200 });
        const map: Record<string, Homestay> = {};
        (homestaysRes.Items || []).forEach((h) => {
          map[h.id] = h;
        });
        setHomestayMap(map);
      } catch (e) {
        console.error(e);
        setHomestayMap({});
      }
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return bookings;
    if (activeTab === 'pending') return bookings.filter(b => b.status === 'PENDING');
    if (activeTab === 'confirmed') return bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN');
    if (activeTab === 'completed') return bookings.filter(b => b.status === 'COMPLETED');
    if (activeTab === 'cancelled') return bookings.filter(b => b.status === 'CANCELLED' || b.status === 'REJECTED');
    return bookings;
  }, [bookings, activeTab]);

  const openDetail = async (b: Booking) => {
    setSelected(b);
    setEditMode(false);
    setCancellationPolicy(null);
    setDetailLoading(true);
    try {
      const detail = await bookingService.getBookingDetail(b.id);
      if (detail) setSelected(detail);
      // fetch homestay info to know maxGuests / price
      try {
        const hs = await publicHomestayService.getById(detail?.homestayId ?? b.homestayId);
        setDetailHomestay(hs);
      } catch (e) {
        setDetailHomestay(null);
      }
      const policy = await bookingService.getCancellationPolicy(b.id);
      if (!policy) {
        toast.error('Không lấy được chính sách hủy');
      }
      setCancellationPolicy(policy);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải chi tiết booking');
    } finally {
      setDetailLoading(false);
    }
  };

  const startEdit = () => {
    if (!selected) return;
    setEditMode(true);
    setEditCheckIn(selected.checkIn?.slice(0, 10) || '');
    setEditCheckOut(selected.checkOut?.slice(0, 10) || '');
    // cap to homestay maxGuests if available
    const maxG = detailHomestay?.maxGuests ?? 100;
    setEditGuests(Math.min(selected.guestsCount || 1, maxG));
    setEditPhone(selected.contactPhone || '');
    setEditSpecialRequests(selected.specialRequests || '');
  };

  const editNights = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const computedEditTotal = useMemo(() => {
    const nightsCount = editNights(editCheckIn, editCheckOut);
    const price = (detailHomestay as any)?.pricePerNight ?? (detailHomestay as any)?.price ?? 0;
    if (nightsCount > 0 && typeof price === 'number') return price * nightsCount;
    return undefined;
  }, [editCheckIn, editCheckOut, detailHomestay]);

  const nights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':   return 'bg-green-100 text-green-700 border-green-200';
      case 'CHECKED_IN':  return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING':     return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED':   return 'bg-red-100 text-red-700 border-red-200';
      case 'COMPLETED':   return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'REJECTED':    return 'bg-red-100 text-red-700 border-red-200';
      default:            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':   return 'Đã xác nhận';
      case 'CHECKED_IN':  return 'Đang lưu trú';
      case 'PENDING':     return 'Chờ thanh toán';
      case 'CANCELLED':   return 'Đã hủy';
      case 'COMPLETED':   return 'Hoàn thành';
      case 'REJECTED':    return 'Bị từ chối';
      default:            return 'Trạng thái';
    }
  };

  return (
    <>
      <MainLayout>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Đặt Phòng Của Tôi</h1>
              <p className="text-gray-600 mt-1">Quản lý các booking của bạn.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                <RefreshCcw className="w-4 h-4" />
                Tải lại
              </button>
              <Link
                to="/customer/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
              >
                Tìm homestay
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
            <div className="grid grid-cols-5 gap-2">
              {([
                { key: 'all', label: 'Tất cả' },
                { key: 'pending', label: 'Chờ thanh toán' },
                { key: 'confirmed', label: 'Đã xác nhận' },
                { key: 'completed', label: 'Hoàn thành' },
                { key: 'cancelled', label: 'Đã hủy' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-2 rounded-xl font-semibold transition-all text-sm ${activeTab === t.key
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-3 text-gray-600">Đang tải booking...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-700 font-semibold">Chưa có booking nào.</p>
              <p className="text-gray-600 mt-1">Hãy chọn một homestay và đặt phòng để bắt đầu.</p>
              <Link
                to="/customer/dashboard"
                className="inline-flex mt-6 items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
              >
                Đi tìm homestay
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filtered.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex flex-col">
                    {/* Image section - full width on mobile, fixed height */}
                    <div className="relative h-48 sm:h-56 bg-gray-100 overflow-hidden">
                      {(() => {
                        const hs = homestayMap[b.homestayId];
                        const img = hs?.images?.[0] || '';
                        const alt = hs?.name || cleanLoadingText(b.homestayName) || 'Homestay';
                        return (
                          <ImageWithFallback
                            src={img}
                            alt={alt}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        );
                      })()}
                      {/* Status badge on image */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1.5 text-xs rounded-full font-semibold border ${getStatusColor(b.status)} shadow-sm`}>
                          {getStatusText(b.status)}
                        </span>
                      </div>
                      {/* Homestay icon */}
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                        <Home className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Homestay</span>
                      </div>
                    </div>

                    {/* Content section */}
                    <div className="p-5">
                      {/* Title and location */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                          {(() => {
                            const hs = homestayMap[b.homestayId];
                            const name = hs?.name || cleanLoadingText(b.homestayName);
                            return name || 'Homestay';
                          })()}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {(() => {
                              const hs = homestayMap[b.homestayId];
                              if (hs?.address) return hs.address;
                              const cityCountry = `${hs?.city || ''} ${hs?.country || ''}`.trim();
                              if (cityCountry) return cityCountry;
                              return 'Đang cập nhật';
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Booking details grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs">Check-in</span>
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {new Date(b.checkIn).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs">Check-out</span>
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {new Date(b.checkOut).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>

                      {/* Guests and nights */}
                      <div className="flex items-center justify-between mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{b.guestsCount} khách</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{nights(b.checkIn, b.checkOut)} đêm</span>
                        </div>
                      </div>

                      {/* Price and actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        {typeof b.totalPrice === 'number' ? (
                          <div>
                            <div className="text-xs text-gray-500">Tổng tiền</div>
                            <div className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                              {b.totalPrice.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        ) : (
                          <div></div>
                        )}

                        <div className="flex items-center gap-2">
                          {(() => {
                            const existing = myReviewsMap[b.id];
                            if (existing) {
                              return (
                                <button
                                  onClick={() => setEditingReview(existing)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
                                >
                                  <Star className="w-4 h-4 text-yellow-400" />
                                  Đã đánh giá
                                </button>
                              );
                            }
                            if (b.status === 'COMPLETED') {
                              return (
                                <button
                                  onClick={() => setReviewingBooking({
                                    id: b.id,
                                    homestayName: homestayMap[b.homestayId]?.name || cleanLoadingText(b.homestayName) || 'Homestay',
                                  })}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-semibold text-sm transition-colors"
                                >
                                  <Star className="w-4 h-4" />
                                  Đánh giá
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button
                            onClick={() => openDetail(b)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold text-sm transition-colors"
                          >
                            Chi tiết
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail drawer/modal - giữ nguyên phần này từ code trước */}
          {selected && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto"
              onClick={() => { if (!saving) setSelected(null); }}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="text-lg font-bold text-gray-900">
                    {(selected.homestayName && !/loading/i.test(String(selected.homestayName)) && !/đang cập nhật/i.test(String(selected.homestayName)))
                      ? selected.homestayName
                      : 'Booking'}
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-50" onClick={() => { if (!saving) setSelected(null); }}>
                    <XCircle className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-5 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {detailLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-gray-600">Đang tải chi tiết...</p>
                    </div>
                  ) : (
                    <>
                      {/* Homestay preview: images + basic info (clean, responsive) */}
                      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="md:flex-1">
                            <div
                              onClick={() => setLightboxSrc((detailHomestay?.images && detailHomestay.images[0]) || homestayMap[selected.homestayId]?.images?.[0] || '')}
                              className="rounded-xl overflow-hidden bg-gray-100 h-56 md:h-48 cursor-pointer shadow-sm"
                            >
                              <ImageWithFallback
                                src={(detailHomestay?.images && detailHomestay.images[0]) || homestayMap[selected.homestayId]?.images?.[0] || ''}
                                alt={detailHomestay?.name || selected.homestayName || 'Homestay'}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="hidden md:flex gap-2 mt-3">
                              {(detailHomestay?.images || homestayMap[selected.homestayId]?.images || []).slice(1, 5).map((img, i) => (
                                <div key={i} className="flex-1 h-20 rounded overflow-hidden cursor-pointer" onClick={() => setLightboxSrc(img ?? '')}>
                                  <ImageWithFallback src={img ?? ''} alt={`${detailHomestay?.name || selected.homestayName}-${i}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="md:w-80">
                            <h2 className="text-lg font-bold truncate">{detailHomestay?.name || selected.homestayName}</h2>
                            <div className="text-sm text-gray-600 mt-1 mb-3 truncate">{detailHomestay?.address || detailHomestay?.city || homestayMap[selected.homestayId]?.address || 'Đang cập nhật'}</div>
                            <div className="text-sm text-gray-700 mb-3 line-clamp-4">{detailHomestay?.description || homestayMap[selected.homestayId]?.description || '—'}</div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Giá/đêm: <span className="font-medium text-gray-900">{detailHomestay?.pricePerNight ? `${detailHomestay.pricePerNight.toLocaleString('vi-VN')}đ` : (homestayMap[selected.homestayId]?.pricePerNight ? `${homestayMap[selected.homestayId].pricePerNight.toLocaleString('vi-VN')}đ` : '—')}</span></div>
                              <div>Số khách: <span className="font-medium text-gray-900">{detailHomestay?.maxGuests ?? homestayMap[selected.homestayId]?.maxGuests ?? '—'}</span></div>
                              <div className="pt-2">
                                <div className="text-sm font-semibold mb-2">Tiện nghi</div>
                                <div className="flex flex-wrap gap-2">
                                  {(detailHomestay?.amenities || homestayMap[selected.homestayId]?.amenities || []).slice(0, 8).map((a, i) => (
                                    <div key={i} className="text-sm bg-gray-100 px-3 py-1 rounded">{a}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Lightbox overlay */}
                      {lightboxSrc && (
                        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
                          <img src={lightboxSrc} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()} />
                          <button className="absolute top-6 right-6 text-white text-2xl" onClick={() => setLightboxSrc(null)}>×</button>
                        </div>
                      )}
                      {/* Thông tin cơ bản */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Check-in</div>
                            <div className="font-semibold text-gray-900">{new Date(selected.checkIn).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Check-out</div>
                            <div className="font-semibold text-gray-900">{new Date(selected.checkOut).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Số khách</div>
                            <div className="font-semibold text-gray-900">{selected.guestsCount} người</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Số đêm</div>
                            <div className="font-semibold text-gray-900">{nights(selected.checkIn, selected.checkOut)} đêm</div>
                          </div>
                        </div>

                        {selected.contactPhone && (
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> Số điện thoại liên hệ
                            </div>
                            <div className="font-semibold text-gray-900">{selected.contactPhone}</div>
                          </div>
                        )}

                        {typeof selected.totalPrice === 'number' && (
                          <div className="mt-4 pt-4 border-t border-blue-200 flex items-center justify-between">
                            <div className="font-semibold text-gray-900">Tổng tiền</div>
                            <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                              {selected.totalPrice.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Yêu cầu đặc biệt */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                          <MessageSquareText className="w-4 h-4 text-blue-500" />
                          Yêu cầu đặc biệt
                        </div>
                        {selected.specialRequests ? (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl border border-gray-100 p-4">
                            {selected.specialRequests}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 text-center">
                            <MessageSquareText className="w-6 h-6 text-gray-300" />
                            <p className="text-sm text-gray-400 italic">Không có yêu cầu đặc biệt</p>
                          </div>
                        )}
                      </div>

                      {/* Chính sách hủy */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-3">Chính sách hủy</div>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 p-4">
                          {cancellationPolicy ? (
                            typeof cancellationPolicy === 'string' ? (
                              <div className="whitespace-pre-wrap">{cancellationPolicy}</div>
                            ) : cancellationPolicy.policy ? (
                              <div className="whitespace-pre-wrap">{cancellationPolicy.policy}</div>
                            ) : (
                              <pre className="whitespace-pre-wrap text-xs text-gray-600">{JSON.stringify(cancellationPolicy, null, 2)}</pre>
                            )
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                      </div>

                      {/* Thao tác - Edit Mode */}
                      {editMode ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                          <h3 className="font-semibold text-gray-900">Chỉnh sửa booking</h3>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">Check-in</label>
                            <input
                              value={editCheckIn}
                              onChange={(e) => setEditCheckIn(e.target.value)}
                              type="date"
                              min={new Date().toISOString().slice(0, 10)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">Check-out</label>
                            <input
                              value={editCheckOut}
                              onChange={(e) => setEditCheckOut(e.target.value)}
                              type="date"
                              min={editCheckIn || new Date().toISOString().slice(0, 10)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">Số khách</label>
                            <input
                              value={editGuests}
                              onChange={(e) => setEditGuests(Number(e.target.value))}
                              type="number"
                              min={1}
                              max={detailHomestay?.maxGuests ?? 100}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">SĐT liên hệ</label>
                            <input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">Yêu cầu đặc biệt</label>
                            <textarea
                              value={editSpecialRequests}
                              onChange={(e) => setEditSpecialRequests(e.target.value)}
                              rows={3}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                            />
                          </div>

                          {/* Live calc preview when editing dates */}
                          <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm text-gray-700">
                            <div className="flex items-center justify-between">
                              <div>Số đêm</div>
                              <div className="font-medium">{editNights(editCheckIn, editCheckOut) || '—'}</div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div>Giá/đêm</div>
                              <div className="font-medium">{detailHomestay?.pricePerNight ? `${detailHomestay.pricePerNight.toLocaleString('vi-VN')}đ` : '—'}</div>
                            </div>
                            <div className="flex items-center justify-between mt-2 border-t pt-2">
                              <div className="font-semibold">Tổng (ước tính)</div>
                              <div className="font-semibold">{computedEditTotal !== undefined ? `${computedEditTotal.toLocaleString('vi-VN')}đ` : '—'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={async () => {
                                if (!selected) return;
                                // validate dates
                                const today = new Date(); today.setHours(0, 0, 0, 0);
                                const inDate = new Date(editCheckIn); inDate.setHours(0, 0, 0, 0);
                                const outDate = new Date(editCheckOut); outDate.setHours(0, 0, 0, 0);
                                if (!editCheckIn || !editCheckOut || isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
                                  toast.error('Ngày không hợp lệ');
                                  return;
                                }
                                if (inDate < today) {
                                  toast.error('Ngày nhận không được chọn trong quá khứ');
                                  return;
                                }
                                const maxG = detailHomestay?.maxGuests ?? 100;
                                if (editGuests < 1 || editGuests > maxG) {
                                  toast.error(`Số khách phải từ 1 đến ${maxG}`);
                                  return;
                                }
                                setSaving(true);
                                try {
                                  const res = await bookingService.modifyBooking(selected.id, {
                                    homestayId: selected.homestayId,
                                    checkIn: editCheckIn,
                                    checkOut: editCheckOut,
                                    guestsCount: editGuests,
                                    ...(editPhone ? { contactPhone: editPhone } : {}),
                                  });
                                  if (res?.success) {
                                    toast.success(res.message || 'Đã cập nhật booking');
                                    // update special requests via dedicated endpoint
                                    if (editSpecialRequests !== (selected.specialRequests || '')) {
                                      const sr = await bookingService.updateSpecialRequests(selected.id, editSpecialRequests || '');
                                      if (!sr?.success) {
                                        toast.error(sr?.message || 'Cập nhật yêu cầu đặc biệt thất bại');
                                      }
                                    }
                                    await load();
                                    const refreshed = await bookingService.getBookingDetail(selected.id);
                                    if (refreshed) setSelected(refreshed);
                                    setEditMode(false);
                                  } else {
                                    toast.error(res?.message || 'Cập nhật booking thất bại');
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast.error('Đã xảy ra lỗi khi cập nhật booking');
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving}
                              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
                            >
                              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                            <button
                              onClick={() => setEditMode(false)}
                              disabled={saving}
                              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-700"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Thao tác - Buttons */
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          {/* Nút Thanh toán - chỉ hiện khi PENDING */}
                          {selected.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                const hs = detailHomestay ?? homestayMap[selected.homestayId];
                                setPayingBooking({
                                  id: selected.id,
                                  homestayName: selected.homestayName || hs?.name || 'Homestay',
                                  checkIn: selected.checkIn,
                                  checkOut: selected.checkOut,
                                  totalNights: selected.totalNights ?? 0,
                                  guestsCount: selected.guestsCount,
                                  pricePerNight: selected.pricePerNight ?? hs?.pricePerNight ?? 0,
                                  totalPrice: selected.totalPrice ?? 0,
                                });
                              }}
                              disabled={saving}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                            >
                              <CreditCard className="w-4 h-4" />
                              Thanh toán ngay
                            </button>
                          )}
                          <button
                            onClick={startEdit}
                            disabled={saving || selected.status === 'CANCELLED' || selected.status === 'CONFIRMED' || selected.status === 'COMPLETED' || selected.status === 'CHECKED_IN' || selected.status === 'REJECTED'}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold ${selected.status !== 'PENDING'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black text-white'
                              }`}
                          >
                            <Pencil className="w-4 h-4" />
                            Sửa booking
                          </button>
                          <button
                            onClick={async () => {
                              if (!selected) return;
                              setSaving(true);
                              try {
                                const res = await bookingService.cancelBooking(selected.id);
                                if (res?.success) {
                                  toast.success(res.message || 'Đã hủy booking');
                                  await load();
                                  setSelected(null);
                                } else {
                                  toast.error(res?.message || 'Hủy booking thất bại');
                                }
                              } catch (e) {
                                console.error(e);
                                toast.error('Đã xảy ra lỗi khi hủy booking');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving || selected.status === 'CANCELLED' || selected.status === 'CONFIRMED' || selected.status === 'COMPLETED' || selected.status === 'CHECKED_IN' || selected.status === 'REJECTED'}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold ${selected.status !== 'PENDING'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                          >
                            <XCircle className="w-4 h-4" />
                            Hủy booking
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
      {payingBooking && (
        <PaymentModal
          booking={payingBooking}
          onClose={() => { setPayingBooking(null); load(); }}
          onBack={() => setPayingBooking(null)}
        />
      )}
      {reviewingBooking && (
        <ReviewModal
          bookingId={reviewingBooking.id}
          homestayName={reviewingBooking.homestayName}
          onClose={() => setReviewingBooking(null)}
          onSuccess={() => { setReviewingBooking(null); toast.success('Đánh giá đã được gửi, chờ kiểm duyệt!'); load(); }}
        />
      )}
      {editingReview && (
        <ReviewModal
          existing={editingReview}
          onClose={() => setEditingReview(null)}
          onSuccess={() => { setEditingReview(null); toast.success('Đánh giá đã được cập nhật, chờ kiểm duyệt!'); load(); }}
        />
      )}
    </>
  );
}