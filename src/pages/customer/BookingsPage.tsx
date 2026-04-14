import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Phone, Users, XCircle, Pencil, MessageSquareText, ChevronRight, RefreshCcw, Home, Clock, CreditCard, Star, AlertCircle, Check, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { bookingService, type Booking } from '../../services/bookingService';
import { reviewService, type Review } from '../../services/reviewService';
import { extraChargeService, type ExtraCharge } from '../../services/extraChargeService';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Pagination } from '../../components/common/Pagination';
import { publicHomestayService } from '../../services/publicHomestayService';
import PaymentModal from './PaymentModal';
import ReviewModal from './ReviewModal';
import type { Homestay } from '../../types/homestay.types';
import {
  buildDisplaySpecialRequests,
  buildSpecialRequestsWithExperiences,
  extractBookingExperienceData,
} from '../../utils/bookingExperience';

const cleanLoadingText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/loading/i.test(value) || /đang cập nhật/i.test(value)) return undefined;
  return value;
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const tr = (vi: string, en: string) => (isEn ? en : vi);
  const pageSize = 10;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'staying' | 'completed' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);

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
    totalNights: number; guestsCount: number; pricePerNight: number;
    bookingTotal: number; amountDue: number;
    depositAmount?: number; remainingAmount?: number; depositPercentage?: number; paymentLabel?: string;
  } | null>(null);

  const [reviewingBooking, setReviewingBooking] = useState<{ id: string; homestayName: string } | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [myReviewsMap, setMyReviewsMap] = useState<Record<string, Review | undefined>>({});

  const [showExtraDetailModal, setShowExtraDetailModal] = useState(false);
  const [extraDetailBooking, setExtraDetailBooking] = useState<Booking | null>(null);
  const [extraDetailCharges, setExtraDetailCharges] = useState<ExtraCharge[]>([]);
  const [extraChargeDetailLoading, setExtraChargeDetailLoading] = useState(false);
  const totalExtraDetailAmount = extraDetailCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

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
      toast.error(tr('Không thể tải danh sách booking', 'Cannot load booking list'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return bookings;
    if (activeTab === 'pending') return bookings.filter(b => b.status === 'PENDING');
    if (activeTab === 'confirmed') return bookings.filter(b => b.status === 'CONFIRMED');
    if (activeTab === 'staying') return bookings.filter(b => b.status === 'CHECKED_IN');
    if (activeTab === 'completed') return bookings.filter(b => b.status === 'COMPLETED');
    if (activeTab === 'cancelled') return bookings.filter(b => b.status === 'CANCELLED' || b.status === 'REJECTED');
    return bookings;
  }, [bookings, activeTab]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filtered.length, currentPage]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

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
        toast.error(tr('Không lấy được chính sách hủy', 'Cannot load cancellation policy'));
      }
      setCancellationPolicy(policy);
    } catch (e) {
      console.error(e);
      toast.error(tr('Không thể tải chi tiết booking', 'Cannot load booking details'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewExtraDetail = async (booking: Booking) => {
    setExtraDetailBooking(booking);
    setShowExtraDetailModal(true);

    try {
      setExtraChargeDetailLoading(true);
      const list = await extraChargeService.listByBooking(booking.id);
      setExtraDetailCharges(list);
    } catch (error) {
      console.error('Load extra charges error:', error);
      toast.error(tr('Không thể tải chi tiết phát sinh', 'Cannot load extra charges details'));
      setExtraDetailCharges([]);
    } finally {
      setExtraChargeDetailLoading(false);
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
    setEditSpecialRequests(extractBookingExperienceData(selected.specialRequests).note || '');
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

  const hasSelectedExperiences = (specialRequests?: string) => {
    return extractBookingExperienceData(specialRequests).items.length > 0;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CHECKED_IN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      case 'COMPLETED': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return tr('Đã xác nhận', 'Confirmed');
      case 'CHECKED_IN': return tr('Đang lưu trú', 'Staying');
      case 'PENDING': return tr('Chờ thanh toán cọc', 'Awaiting deposit');
      case 'CANCELLED': return tr('Đã hủy', 'Cancelled');
      case 'COMPLETED': return tr('Hoàn thành', 'Completed');
      case 'REJECTED': return tr('Bị từ chối', 'Rejected');
      default: return tr('Trạng thái', 'Status');
    }
  };

  return (
    <>
      <MainLayout>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tr('Đặt Phòng Của Tôi', 'My Bookings')}</h1>
              <p className="text-gray-600 mt-1">{tr('Quản lý các booking của bạn.', 'Manage your bookings.')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                <RefreshCcw className="w-4 h-4" />
                {tr('Tải lại', 'Reload')}
              </button>
              <Link
                to="/customer/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
              >
                {tr('Tìm homestay', 'Find homestay')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {([
                { key: 'all', label: tr('Tất cả', 'All') },
                { key: 'pending', label: tr('Chờ thanh toán cọc', 'Awaiting deposit') },
                { key: 'confirmed', label: tr('Đã xác nhận', 'Confirmed') },
                { key: 'staying', label: tr('Đang lưu trú', 'Staying') },
                { key: 'completed', label: tr('Hoàn thành', 'Completed') },
                { key: 'cancelled', label: tr('Đã hủy', 'Cancelled') },
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
              <p className="mt-3 text-gray-600">{tr('Đang tải booking...', 'Loading bookings...')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-700 font-semibold">{tr('Chưa có booking nào.', 'No bookings yet.')}</p>
              <p className="text-gray-600 mt-1">{tr('Hãy chọn một homestay và đặt phòng để bắt đầu.', 'Choose a homestay and book to get started.')}</p>
              <Link
                to="/customer/dashboard"
                className="inline-flex mt-6 items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
              >
                {tr('Đi tìm homestay', 'Find homestays')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginated.map(b => (
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
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <span className={`px-3 py-1.5 text-xs rounded-full font-semibold border ${getStatusColor(b.status)} shadow-sm`}>
                          {getStatusText(b.status)}
                        </span>
                        {/* Payment status badges */}
                        {b.status === 'PENDING' && b.paymentStatus === 'UNPAID' && typeof b.depositAmount === 'number' && b.depositAmount > 0 && (
                          <span title={`${tr('Cọc', 'Deposit')} ${b.depositPercentage || 20}% - ${b.depositAmount.toLocaleString('vi-VN')}đ`} className="px-2.5 py-1 text-xs rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm cursor-help">
                            {tr('Cọc', 'Deposit')}: {b.depositAmount.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                        {b.status === 'CONFIRMED' && b.paymentStatus === 'DEPOSIT_PAID' && (
                          <span title={`${tr('Còn lại', 'Remaining')}: ${(b.remainingAmount || 0).toLocaleString('vi-VN')}đ`} className="px-2.5 py-1 text-xs rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm cursor-help">
                            {tr('Còn lại', 'Remaining')}: {(b.remainingAmount || 0).toLocaleString('vi-VN')}đ
                          </span>
                        )}
                        {(b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') && b.paymentStatus === 'FULLY_PAID' && (
                          <span className="px-2.5 py-1 text-xs rounded-full font-semibold bg-green-100 text-green-700 border border-green-200 shadow-sm flex items-center gap-1">
                            <Check className="w-3 h-3" /> {tr('Thanh toán đủ', 'Fully paid')}
                          </span>
                        )}
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
                              return tr('Đang cập nhật', 'Updating');
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
                            {new Date(b.checkIn).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs">Check-out</span>
                          </div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {new Date(b.checkOut).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                          </div>
                        </div>
                      </div>

                      {/* Guests and nights */}
                      <div className="flex items-center justify-between mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{b.guestsCount} {tr('khách', 'guests')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{nights(b.checkIn, b.checkOut)} {tr('đêm', 'nights')}</span>
                        </div>
                      </div>

                      {/* Price and actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        {typeof b.totalPrice === 'number' ? (
                          <div>
                            <div className="text-xs text-gray-500">{tr('Tổng tiền', 'Total')}</div>
                            <div className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                              {b.totalPrice.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        ) : (
                          <div></div>
                        )}

                        <div className="flex items-center gap-2">
                          {(b.status === 'CHECKED_IN' || ((b.status === 'PENDING' || b.status === 'CONFIRMED') && !hasSelectedExperiences(b.specialRequests))) && (
                            <button
                              onClick={() => navigate(`/customer/bookings/${b.id}/services`)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold text-sm transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              {tr('Thêm dịch vụ', 'Add services')}
                            </button>
                          )}
                          {(() => {
                            const existing = myReviewsMap[b.id];
                            if (existing) {
                              return (
                                <button
                                  onClick={() => setEditingReview(existing)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
                                >
                                  <Star className="w-4 h-4 text-yellow-400" />
                                  {tr('Đã đánh giá', 'Reviewed')}
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
                                  {tr('Đánh giá', 'Review')}
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button
                            onClick={() => openDetail(b)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold text-sm transition-colors"
                          >
                              {tr('Chi tiết', 'Details')}
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

          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />

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
                      <p className="mt-2 text-gray-600">{tr('Đang tải chi tiết...', 'Loading details...')}</p>
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
                            <div className="text-sm text-gray-600 mt-1 mb-3 truncate">{detailHomestay?.address || detailHomestay?.city || homestayMap[selected.homestayId]?.address || tr('Đang cập nhật', 'Updating')}</div>
                            <div className="text-sm text-gray-700 mb-3 line-clamp-4">{detailHomestay?.description || homestayMap[selected.homestayId]?.description || '—'}</div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div>{tr('Giá/đêm', 'Price/night')}: <span className="font-medium text-gray-900">{detailHomestay?.pricePerNight ? `${detailHomestay.pricePerNight.toLocaleString('vi-VN')}đ` : (homestayMap[selected.homestayId]?.pricePerNight ? `${homestayMap[selected.homestayId].pricePerNight.toLocaleString('vi-VN')}đ` : '—')}</span></div>
                              <div>{tr('Số khách', 'Guests')}: <span className="font-medium text-gray-900">{detailHomestay?.maxGuests ?? homestayMap[selected.homestayId]?.maxGuests ?? '—'}</span></div>
                              <div className="pt-2">
                                <div className="text-sm font-semibold mb-2">{tr('Tiện nghi', 'Amenities')}</div>
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
                            <div className="font-semibold text-gray-900">{new Date(selected.checkIn).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Check-out</div>
                            <div className="font-semibold text-gray-900">{new Date(selected.checkOut).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{tr('Số khách', 'Guests')}</div>
                            <div className="font-semibold text-gray-900">{selected.guestsCount} {tr('người', 'people')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{tr('Số đêm', 'Nights')}</div>
                            <div className="font-semibold text-gray-900">{nights(selected.checkIn, selected.checkOut)} {tr('đêm', 'nights')}</div>
                          </div>
                        </div>

                        {selected.contactPhone && (
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {tr('Số điện thoại liên hệ', 'Contact phone')}
                            </div>
                            <div className="font-semibold text-gray-900">{selected.contactPhone}</div>
                          </div>
                        )}

                        {typeof selected.totalPrice === 'number' && (
                          <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-gray-900">{tr('Tổng tiền', 'Total')}</div>
                              <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                                {selected.totalPrice.toLocaleString('vi-VN')}đ
                              </div>
                            </div>
                            {/* Breakdown cọc / còn lại */}
                            {selected.totalPrice && (
                              <div className="text-xs text-gray-500 mt-2 space-y-1">
                                <div className="flex justify-between">
                                  <span>{tr('Cọc', 'Deposit')} ({selected.depositPercentage || 20}%)</span>
                                  <span className="font-medium">{(selected.depositAmount || 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{tr('Còn lại', 'Remaining')} ({100 - (selected.depositPercentage || 20)}%)</span>
                                  <span className="font-medium">{(selected.remainingAmount || 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                              </div>
                            )}
                            {selected.paymentStatus === 'UNPAID' && typeof selected.depositAmount === 'number' && (
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-orange-100">
                                <span className="text-orange-600 font-medium">{tr('Cần cọc ngay', 'Deposit required now')}</span>
                                <span className="font-bold text-orange-600">{selected.depositAmount.toLocaleString('vi-VN')}đ</span>
                              </div>
                            )}
                            {selected.paymentStatus === 'DEPOSIT_PAID' && typeof selected.remainingAmount === 'number' && (
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-100">
                                <span className="text-blue-600 font-medium">{tr('Còn lại cần thanh toán', 'Remaining amount due')}</span>
                                <span className="font-bold text-blue-600">{selected.remainingAmount.toLocaleString('vi-VN')}đ</span>
                              </div>
                            )}
                            {selected.paymentStatus === 'FULLY_PAID' && (
                              <div className="text-sm text-green-600 font-medium text-right pt-2 border-t border-green-100">✓ {tr('Đã thanh toán đầy đủ', 'Fully paid')}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Yêu cầu đặc biệt */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                          <MessageSquareText className="w-4 h-4 text-blue-500" />
                          {tr('Yêu cầu đặc biệt', 'Special requests')}
                        </div>
                        {buildDisplaySpecialRequests(selected.specialRequests) ? (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl border border-gray-100 p-4">
                            {buildDisplaySpecialRequests(selected.specialRequests)}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 text-center">
                            <MessageSquareText className="w-6 h-6 text-gray-300" />
                            <p className="text-sm text-gray-400 italic">{tr('Không có yêu cầu đặc biệt', 'No special requests')}</p>
                          </div>
                        )}
                      </div>

                      {/* Chính sách hủy */}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-3">{tr('Chính sách hủy', 'Cancellation policy')}</div>
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
                          <h3 className="font-semibold text-gray-900">{tr('Chỉnh sửa booking', 'Edit booking')}</h3>

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
                            <label className="text-xs font-semibold text-gray-600">{tr('Số khách', 'Guests')}</label>
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
                            <label className="text-xs font-semibold text-gray-600">{tr('SĐT liên hệ', 'Contact phone')}</label>
                            <input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600">{tr('Yêu cầu đặc biệt', 'Special requests')}</label>
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
                              <div>{tr('Số đêm', 'Nights')}</div>
                              <div className="font-medium">{editNights(editCheckIn, editCheckOut) || '—'}</div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div>{tr('Giá/đêm', 'Price/night')}</div>
                              <div className="font-medium">{detailHomestay?.pricePerNight ? `${detailHomestay.pricePerNight.toLocaleString('vi-VN')}đ` : '—'}</div>
                            </div>
                            <div className="flex items-center justify-between mt-2 border-t pt-2">
                              <div className="font-semibold">{tr('Tổng (ước tính)', 'Estimated total')}</div>
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
                                  toast.error(tr('Ngày không hợp lệ', 'Invalid dates'));
                                  return;
                                }
                                if (inDate < today) {
                                  toast.error(tr('Ngày nhận không được chọn trong quá khứ', 'Check-in date cannot be in the past'));
                                  return;
                                }
                                const maxG = detailHomestay?.maxGuests ?? 100;
                                if (editGuests < 1 || editGuests > maxG) {
                                  toast.error(isEn ? `Guests must be between 1 and ${maxG}` : `Số khách phải từ 1 đến ${maxG}`);
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
                                    toast.success(res.message || tr('Đã cập nhật booking', 'Booking updated'));
                                    // update special requests via dedicated endpoint
                                    const currentParsed = extractBookingExperienceData(selected.specialRequests);
                                    const mergedSpecialRequests = buildSpecialRequestsWithExperiences(
                                      editSpecialRequests || '',
                                      currentParsed.items,
                                    );
                                    if (mergedSpecialRequests !== (selected.specialRequests || '')) {
                                      const sr = await bookingService.updateSpecialRequests(selected.id, mergedSpecialRequests || '');
                                      if (!sr?.success) {
                                        toast.error(sr?.message || tr('Cập nhật yêu cầu đặc biệt thất bại', 'Failed to update special requests'));
                                      }
                                    }
                                    await load();
                                    const refreshed = await bookingService.getBookingDetail(selected.id);
                                    if (refreshed) setSelected(refreshed);
                                    setEditMode(false);
                                  } else {
                                    toast.error(res?.message || tr('Cập nhật booking thất bại', 'Failed to update booking'));
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast.error(tr('Đã xảy ra lỗi khi cập nhật booking', 'An error occurred while updating booking'));
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving}
                              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
                            >
                              {saving ? tr('Đang lưu...', 'Saving...') : tr('Lưu thay đổi', 'Save changes')}
                            </button>
                            <button
                              onClick={() => setEditMode(false)}
                              disabled={saving}
                              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-700"
                            >
                              {tr('Hủy', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Thao tác - Buttons */
                        <div className="flex flex-col gap-4 pt-2">
                          {(selected.status === 'CHECKED_IN' || ((selected.status === 'PENDING' || selected.status === 'CONFIRMED') && !hasSelectedExperiences(selected.specialRequests))) && (
                            <button
                              onClick={() => navigate(`/customer/bookings/${selected.id}/services`)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700"
                            >
                              <Plus className="w-4 h-4" />
                              {tr('Thêm dịch vụ cho booking này', 'Add services for this booking')}
                            </button>
                          )}
                          {/* Nút Thanh toán — PENDING (chưa cọc) hoặc CONFIRMED + DEPOSIT_PAID (còn lại) */}
                          {(selected.status === 'PENDING' || (selected.status === 'CONFIRMED' && selected.paymentStatus === 'DEPOSIT_PAID')) && (
                            <button
                              onClick={() => {
                                const hs = detailHomestay ?? homestayMap[selected.homestayId];
                                const isDeposit = selected.status === 'PENDING';
                                // amountDue: số tiền thực cần trả lần này — lấy từ BE, không tính lại
                                const amountDue = isDeposit
                                  ? (selected.depositAmount ?? 0)
                                  : (selected.remainingAmount ?? 0);
                                setPayingBooking({
                                  id: selected.id,
                                  homestayName: selected.homestayName || hs?.name || 'Homestay',
                                  checkIn: selected.checkIn,
                                  checkOut: selected.checkOut,
                                  totalNights: selected.totalNights ?? 0,
                                  guestsCount: selected.guestsCount,
                                  pricePerNight: selected.pricePerNight ?? hs?.pricePerNight ?? 0,
                                  bookingTotal: selected.totalPrice ?? 0,
                                  amountDue,
                                  depositAmount: selected.depositAmount,
                                  remainingAmount: selected.remainingAmount,
                                  depositPercentage: selected.depositPercentage,
                                  paymentLabel: isDeposit ? tr('Đặt cọc', 'Deposit') : tr('Thanh toán còn lại', 'Pay remaining'),
                                });
                              }}
                              disabled={saving}
                              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white disabled:from-gray-400 disabled:to-gray-500"
                            >
                              <CreditCard className="w-4 h-4" />
                              {selected.status === 'PENDING' ? `${tr('Đặt cọc ngay', 'Pay deposit now')} (${(selected.depositAmount ?? 0).toLocaleString('vi-VN')}đ)` : `${tr('Thanh toán còn lại', 'Pay remaining')} (${(selected.remainingAmount ?? 0).toLocaleString('vi-VN')}đ)`}
                            </button>
                          )}

                          {/* Booking Status Timeline Info */}
                          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                            <div className="text-sm font-semibold text-blue-900 mb-3">{tr('Trạng thái booking', 'Booking status')}</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selected.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                  {selected.status === 'PENDING' ? '1' : <Check className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{tr('Đặt phòng', 'Booking')}</div>
                                  <div className="text-gray-600 text-xs">{tr('Đã tạo lúc', 'Created at')} {new Date(selected.createdAt || '').toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(selected.status) ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(selected.status) ? <Check className="w-4 h-4" /> : '2'}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{tr('Thanh toán cọc', 'Deposit payment')}</div>
                                  {selected.paymentStatus !== 'UNPAID' && <div className="text-gray-600 text-xs">{tr('Đã thanh toán', 'Paid')} {(selected.depositAmount ?? 0).toLocaleString('vi-VN')}đ</div>}
                                  {selected.paymentStatus === 'UNPAID' && <div className="text-orange-600 text-xs font-medium">{tr('Chưa thanh toán', 'Unpaid')}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selected.paymentStatus === 'FULLY_PAID' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {selected.paymentStatus === 'FULLY_PAID' ? <Check className="w-4 h-4" /> : '3'}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{tr('Thanh toán còn lại', 'Remaining payment')}</div>
                                  {selected.paymentStatus === 'FULLY_PAID' && <div className="text-gray-600 text-xs">{tr('Đã thanh toán', 'Paid')} {(selected.remainingAmount ?? 0).toLocaleString('vi-VN')}đ</div>}
                                  {selected.paymentStatus !== 'FULLY_PAID' && <div className="text-orange-600 text-xs font-medium">{tr('Thanh toán trước check-in', 'Pay before check-in')}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selected.status === 'CHECKED_IN' ? 'bg-blue-200 text-blue-800' : selected.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                  {selected.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : '4'}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{tr('Check-in & Lưu trú', 'Check-in & Stay')}</div>
                                  {selected.status === 'CHECKED_IN' ? <div className="text-blue-600 text-xs font-medium">{tr('Đang lưu trú', 'Staying')}</div> : selected.status === 'COMPLETED' ? <div className="text-gray-600 text-xs">{tr('Đã hoàn thành', 'Completed')}</div> : <div className="text-gray-600 text-xs">{tr('Chờ đến ngày check-in', 'Waiting for check-in date')}</div>}
                                </div>
                              </div>
                              {selected.status === 'CHECKED_IN' && (
                                <div className="mt-3 pt-3 border-t border-blue-100 flex items-start gap-2 bg-white rounded p-2">
                                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-blue-700">
                                    <strong>{tr('Check-in được xử lý bởi nhân viên.', 'Check-in is handled by staff.')}</strong> {tr('Họ sẽ cập nhật trạng thái khi bạn đến phòng.', 'They will update the status when you arrive.')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Nút xem phí phát sinh nếu booking đã hoàn thành */}
                          {(selected.status === 'COMPLETED' || selected.status === 'CHECKED_IN') && (
                            <button
                              onClick={() => handleViewExtraDetail(selected)}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors"
                            >
                              {tr('Chi tiết phí phát sinh', 'Extra charges details')}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit và Cancel buttons */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={startEdit}
                              disabled={saving || selected.status === 'CANCELLED' || selected.status === 'CONFIRMED' || selected.status === 'COMPLETED' || selected.status === 'CHECKED_IN' || selected.status === 'REJECTED'}
                              title={selected.status !== 'PENDING' ? tr('Chỉ có thể sửa booking khi chưa thanh toán cọc', 'You can edit only before paying deposit') : ''}
                              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${selected.status !== 'PENDING'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black text-white'
                                }`}
                            >
                              <Pencil className="w-4 h-4" />
                              {tr('Sửa booking', 'Edit booking')}
                            </button>
                            <button
                              onClick={async () => {
                                if (!selected) return;
                                setSaving(true);
                                try {
                                  const res = await bookingService.cancelBooking(selected.id);
                                  if (res?.success) {
                                    toast.success(res.message || tr('Đã hủy booking', 'Booking cancelled'));
                                    await load();
                                    setSelected(null);
                                  } else {
                                    toast.error(res?.message || tr('Hủy booking thất bại', 'Failed to cancel booking'));
                                  }
                                } catch (e) {
                                  console.error(e);
                                  toast.error(tr('Đã xảy ra lỗi khi hủy booking', 'An error occurred while cancelling booking'));
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving || selected.status === 'CANCELLED' || selected.status === 'CONFIRMED' || selected.status === 'COMPLETED' || selected.status === 'CHECKED_IN' || selected.status === 'REJECTED'}
                              title={selected.status !== 'PENDING' ? tr('Chỉ có thể hủy booking khi chưa thanh toán cọc', 'You can cancel only before paying deposit') : ''}
                              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${selected.status !== 'PENDING'
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                              <XCircle className="w-4 h-4" />
                              {tr('Hủy booking', 'Cancel booking')}
                            </button>
                          </div>
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
          onSuccess={() => { setReviewingBooking(null); toast.success(tr('Đánh giá đã được gửi, chờ kiểm duyệt!', 'Review submitted and pending approval!')); load(); }}
        />
      )}
      {editingReview && (
        <ReviewModal
          existing={editingReview}
          onClose={() => setEditingReview(null)}
          onSuccess={() => { setEditingReview(null); toast.success(tr('Đánh giá đã được cập nhật, chờ kiểm duyệt!', 'Review updated and pending approval!')); load(); }}
        />
      )}
      {showExtraDetailModal && extraDetailBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{tr('Chi tiết phí phát sinh', 'Extra charges details')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {extraDetailBooking.homestayName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowExtraDetailModal(false);
                  setExtraDetailBooking(null);
                  setExtraDetailCharges([]);
                }}
                type="button"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              <div className="mb-4 p-4 rounded-lg bg-orange-50 border border-orange-100">
                <p className="text-sm text-orange-800">{tr('Tổng phí phát sinh', 'Total extra charges')}</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{totalExtraDetailAmount.toLocaleString('vi-VN')} VND</p>
              </div>

              {extraChargeDetailLoading ? (
                <div className="py-10 text-center text-gray-500">{tr('Đang tải chi tiết...', 'Loading details...')}</div>
              ) : extraDetailCharges.length === 0 ? (
                <div className="py-10 text-center text-gray-500">{tr('Booking này chưa có khoản phát sinh.', 'No extra charges for this booking yet.')}</div>
              ) : (
                <div className="space-y-3">
                  {extraDetailCharges.map((item, index) => (
                    <div key={item.id || `${extraDetailBooking.id}-${index}`} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">{tr('Khoản', 'Item')} #{index + 1}</p>
                        <p className="text-sm font-bold text-orange-600">+{(Number(item.amount) || 0).toLocaleString('vi-VN')} VND</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{item.note || tr('Không có mô tả', 'No description')}</p>
                      {item.createdAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          {tr('Tạo lúc', 'Created at')}: {new Date(item.createdAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowExtraDetailModal(false);
                  setExtraDetailBooking(null);
                  setExtraDetailCharges([]);
                }}
                type="button"
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {tr('Đóng', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}