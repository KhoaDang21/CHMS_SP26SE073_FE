import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ImagePlus, Loader2, Megaphone, MessageSquare, PlusCircle, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '../layouts/MainLayout';
import { authService } from '../services/authService';
import { culturalGuidesService, type CulturalGuide } from '../services/culturalGuidesService';
import { bookingService } from '../services/bookingService';
import { publicHomestayService } from '../services/publicHomestayService';
import type { Homestay } from '../types/homestay.types';

const vndDate = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type GuideTypeOption = 'Experience' | 'Food' | 'Tips' | 'Announcement' | 'News';

const GUIDE_TYPE_OPTIONS: GuideTypeOption[] = ['Experience', 'Food', 'Tips', 'Announcement', 'News'];

function normalizeStatus(raw?: string): string {
  const value = String(raw || '').toUpperCase();
  if (value === 'APPROVED') return 'Đã duyệt';
  if (value === 'PENDING') return 'Chờ duyệt';
  if (value === 'REJECTED') return 'Bị từ chối';
  return value || 'Không xác định';
}

function getStatusClass(raw?: string): string {
  const value = String(raw || '').toUpperCase();
  if (value === 'APPROVED') return 'bg-green-100 text-green-700 border border-green-200';
  if (value === 'PENDING') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  if (value === 'REJECTED') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export default function TravelGuidesPage() {
  const currentUser = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();
  const role = currentUser?.role;

  const canCreate = isAuthenticated && (role === 'customer' || role === 'admin' || role === 'staff');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guides, setGuides] = useState<CulturalGuide[]>([]);
  const [myGuides, setMyGuides] = useState<CulturalGuide[]>([]);
  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [customerAllowedHomestayIds, setCustomerAllowedHomestayIds] = useState<Set<string>>(new Set());

  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<GuideTypeOption>('Experience');
  const [homestayId, setHomestayId] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [publicGuides, homestayPaged] = await Promise.all([
        culturalGuidesService.getPublicGuides(undefined, selectedType === 'all' ? undefined : selectedType),
        publicHomestayService.list({ page: 1, pageSize: 300 }),
      ]);

      setGuides(publicGuides);
      setAllHomestays(homestayPaged.Items || []);

      if (role === 'customer') {
        const [bookings, mine] = await Promise.all([
          bookingService.getMyBookings(),
          culturalGuidesService.getMyGuides(),
        ]);

        const allowed = new Set<string>();
        bookings.forEach((booking) => {
          const bookingStatus = String(booking.status || '').toUpperCase();
          if (booking.homestayId && (bookingStatus === 'COMPLETED' || bookingStatus === 'CHECKED_OUT' || bookingStatus === 'CHECKED_IN')) {
            allowed.add(booking.homestayId);
          }
        });

        setCustomerAllowedHomestayIds(allowed);
        setMyGuides(mine);

        if (!homestayId && allowed.size > 0) {
          const firstId = Array.from(allowed)[0];
          setHomestayId(firstId);
        }
      } else if (role === 'admin' || role === 'staff') {
        if (!homestayId && (homestayPaged.Items || []).length > 0) {
          setHomestayId((homestayPaged.Items || [])[0].id);
        }
      }
    } catch (error) {
      console.error('Load travel guides error:', error);
      toast.error('Không thể tải dữ liệu cẩm nang du lịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, role]);

  const allowedHomestays = useMemo(() => {
    if (role === 'customer') {
      return allHomestays.filter((item) => customerAllowedHomestayIds.has(item.id));
    }
    return allHomestays;
  }, [allHomestays, customerAllowedHomestayIds, role]);

  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guides;

    return guides.filter((guide) => (
      guide.title.toLowerCase().includes(q)
      || (guide.content || '').toLowerCase().includes(q)
      || (guide.author || '').toLowerCase().includes(q)
      || (guide.type || '').toLowerCase().includes(q)
    ));
  }, [guides, searchQuery]);

  const handleSelectImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImageFiles(files.slice(0, 5));
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('Experience');
    setImageFiles([]);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowCreateModal(false);
  };

  const handleCreateGuide = async () => {
    if (!canCreate) return;

    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }

    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết');
      return;
    }

    if (!homestayId) {
      toast.error('Vui lòng chọn homestay liên quan');
      return;
    }

    if (role === 'customer' && !customerAllowedHomestayIds.has(homestayId)) {
      toast.error('Bạn chỉ có thể đăng bài cho homestay đã từng lưu trú');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        homestayId,
        title: title.trim(),
        content: content.trim(),
        type,
        imageFiles,
      };

      const result = role === 'customer'
        ? await culturalGuidesService.createGuide(payload)
        : await culturalGuidesService.adminCreateGuide(payload);

      if (!result.success) {
        toast.error(result.message || 'Không thể đăng bài viết');
        return;
      }

      toast.success(result.message || 'Đăng bài viết thành công');
      resetForm();
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      console.error('Create guide error:', error);
      toast.error('Có lỗi xảy ra khi đăng bài viết');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-1.5 text-sm font-semibold text-cyan-700">
              <Sparkles className="h-4 w-4" />
              Cộng đồng Cẩm nang du lịch
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-gray-900">Kinh nghiệm thực tế từ cộng đồng CHMS</h1>
            <p className="mt-3 max-w-3xl text-gray-600 leading-relaxed">
              Nơi khách đã từng lưu trú chia sẻ cảm nhận và kinh nghiệm du lịch.
              {' '}
              Admin và Staff có thể đăng thông tin, thông báo để cập nhật cho cộng đồng.
            </p>
            {canCreate && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  disabled={role === 'customer' && allowedHomestays.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlusCircle className="h-4 w-4" />
                  Đăng bài mới
                </button>
                <p className="text-sm text-gray-600">
                  {role === 'customer'
                    ? 'Chia sẻ cảm nhận thật từ trải nghiệm lưu trú của bạn.'
                    : 'Đăng thông tin và thông báo chính thức cho cộng đồng.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {canCreate && role === 'customer' && allowedHomestays.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Bạn chưa có homestay đủ điều kiện để đăng bài chia sẻ. Sau khi có lịch sử lưu trú phù hợp, bạn có thể bấm “Đăng bài mới”.
          </section>
        )}

        {role === 'customer' && myGuides.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Bài viết của tôi</h2>
            <div className="space-y-2">
              {myGuides.slice(0, 5).map((guide) => (
                <div key={guide.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{guide.title}</p>
                    <p className="text-xs text-gray-500 truncate">{guide.content || guide.description}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${getStatusClass(guide.status)}`}>
                    {normalizeStatus(guide.status)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-600" />
              Bài viết cộng đồng
            </h2>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề, nội dung, tác giả..."
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="all">Tất cả loại</option>
                {GUIDE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-cyan-600" />
              Đang tải bài viết...
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              Chưa có bài viết nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGuides.map((guide) => (
                <article key={guide.id} className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow bg-white">
                  {guide.image && (
                    <img
                      src={guide.image}
                      alt={guide.title}
                      className="w-full h-44 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {guide.type || 'Guide'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(guide.status)}`}>
                        {normalizeStatus(guide.status)}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-2">{guide.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{guide.content || guide.description}</p>

                    <div className="pt-1 text-xs text-gray-500 space-y-1">
                      <p>Tác giả: {guide.author || 'Ẩn danh'}</p>
                      <p>{guide.createdAt ? vndDate.format(new Date(guide.createdAt)) : 'Không rõ thời gian'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {canCreate && showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/45" onClick={closeCreateModal} />
            <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Đăng bài cẩm nang mới</h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {role === 'customer'
                      ? 'Chia sẻ trải nghiệm thực tế để giúp khách khác lên kế hoạch tốt hơn.'
                      : 'Đăng thông tin hoặc thông báo chính thức cho cộng đồng.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={submitting}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tiêu đề bài viết"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                  />

                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as GuideTypeOption)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                  >
                    {GUIDE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>

                  <select
                    value={homestayId}
                    onChange={(e) => setHomestayId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 md:col-span-2"
                  >
                    <option value="">Chọn homestay liên quan</option>
                    {allowedHomestays.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.districtName || item.provinceName || 'Không rõ vị trí'}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={role === 'customer'
                    ? 'Chia sẻ trải nghiệm thực tế, lưu ý và mẹo du lịch cho khách khác...'
                    : 'Nhập nội dung thông tin / thông báo muốn gửi tới cộng đồng...'}
                  rows={6}
                  className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  <ImagePlus className="h-4 w-4" />
                  Chọn ảnh (tối đa 5)
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleSelectImages} />
                </label>

                {imageFiles.length > 0 && (
                  <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Đã chọn {imageFiles.length} ảnh: {imageFiles.map((file) => file.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateGuide}
                  disabled={submitting || (role === 'customer' && allowedHomestays.length === 0)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  Đăng bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
