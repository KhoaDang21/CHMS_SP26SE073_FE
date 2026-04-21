import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, BookOpen, Building2, Calendar, ImagePlus, LayoutDashboard, Loader2, LogOut, Menu, MessageSquare, PlusCircle, Sparkles, Ticket, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '../layouts/MainLayout';
import { authService } from '../services/authService';
import { culturalGuidesService, type CulturalGuide } from '../services/culturalGuidesService';
import { publicHomestayService } from '../services/publicHomestayService';
import type { Homestay } from '../types/homestay.types';
import { RoleBadge } from '../components/common/RoleBadge';
import { adminNavItems } from '../config/adminNavItems';
import { managerNavItems } from '../config/managerNavItems';

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

function splitContentBlocks(value: string) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGuideImages(guide: CulturalGuide): string[] {
  const images = Array.isArray(guide.imageUrls) ? guide.imageUrls : [];
  if (images.length > 0) return images;
  if (guide.image) return [guide.image];
  return [];
}

export default function TravelGuidesPage() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();
  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isBackofficeRole = role === 'admin' || role === 'manager' || role === 'staff';

  const canCreate = isAuthenticated && (role === 'customer' || role === 'admin' || role === 'staff' || role === 'manager');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guides, setGuides] = useState<CulturalGuide[]>([]);
  const [allHomestays, setAllHomestays] = useState<Homestay[]>([]);
  const [selectedGuideDetail, setSelectedGuideDetail] = useState<CulturalGuide | null>(null);

  const [selectedHomestayId, setSelectedHomestayId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<GuideTypeOption>('Experience');
  const [homestayId, setHomestayId] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const homestayPaged = await publicHomestayService.list({ page: 1, pageSize: 300 });
      setAllHomestays(homestayPaged.Items || []);

      const typeFilter = selectedType === 'all' ? undefined : selectedType;
      const guidesByHomestay = selectedHomestayId !== 'all'
        ? await culturalGuidesService.getGuidesByHomestay(selectedHomestayId)
        : await culturalGuidesService.getPublicGuides(undefined, typeFilter);

      const visibleGuides = typeFilter
        ? guidesByHomestay.filter((guide) => String(guide.type || '').toLowerCase() === String(typeFilter).toLowerCase())
        : guidesByHomestay;

      setGuides(visibleGuides);

      if (selectedHomestayId === 'all' && homestayPaged.Items?.length && homestayId === '') {
        setHomestayId(homestayPaged.Items[0].id);
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
  }, [selectedHomestayId, selectedType, role]);

  const allowedHomestays = useMemo(() => allHomestays, [allHomestays]);

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

  const openGuideDetail = (guide: CulturalGuide) => {
    setSelectedGuideDetail(guide);
  };

  const closeGuideDetail = () => {
    setSelectedGuideDetail(null);
  };

  const handleDeleteGuide = async (guide: CulturalGuide) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(`Bạn có chắc muốn xoá bài "${guide.title}" không?`);
    if (!confirmed) return;

    const result = await culturalGuidesService.adminDeleteGuide(guide.id);
    if (!result.success) {
      toast.error(result.message || 'Không thể xoá bài viết');
      return;
    }

    toast.success(result.message || 'Xoá bài viết thành công');
    if (selectedGuideDetail?.id === guide.id) {
      setSelectedGuideDetail(null);
    }
    await loadData();
  };

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

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const staffNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/staff/bookings' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/staff/reviews' },
    { id: 'bicycles', label: 'Mini-game xe đạp', icon: Bike, path: '/staff/bicycles' },
    { id: 'travel-guides', label: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides' },
    { id: 'tickets', label: 'Tickets', icon: Ticket, path: '/staff/tickets' },
  ];

  const backofficeNavItems = role === 'admin'
    ? adminNavItems
    : role === 'manager'
      ? managerNavItems
      : staffNavItems;

  const pageContent = (
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

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-600" />
              Bài viết cộng đồng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề, nội dung, tác giả..."
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
              <select
                value={selectedHomestayId}
                onChange={(e) => setSelectedHomestayId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                <option value="all">Tất cả homestay</option>
                {allowedHomestays.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
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
            <div className="space-y-5">
              {filteredGuides.map((guide) => (
                <article key={guide.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-start">
                    <div className="w-full sm:w-[280px] shrink-0 bg-gray-100 sm:self-stretch sm:min-h-[240px]">
                      {getGuideImages(guide).length > 0 ? (
                        <img
                          src={getGuideImages(guide)[0]}
                          alt={guide.title}
                          className="h-56 w-full object-cover sm:h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-56 sm:h-full items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-500">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-5 sm:p-6 space-y-4 sm:min-h-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                          {guide.type || 'Guide'}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusClass(guide.status)}`}>
                          {normalizeStatus(guide.status)}
                        </span>
                        {guide.homestayId && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            Homestay: {allowedHomestays.find((item) => item.id === guide.homestayId)?.name || guide.homestayId}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{guide.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>Tác giả: {guide.author || 'Ẩn danh'}</span>
                          <span>•</span>
                          <span>{guide.createdAt ? vndDate.format(new Date(guide.createdAt)) : 'Không rõ thời gian'}</span>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm leading-7 text-gray-700 max-h-32 overflow-hidden">
                        {splitContentBlocks(guide.content || guide.description).slice(0, 3).map((block, index) => (
                          <p key={`${guide.id}-block-${index}`} className="whitespace-pre-line">
                            {block}
                          </p>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openGuideDetail(guide)}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition-colors"
                        >
                          Xem chi tiết
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGuide(guide)}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Xoá
                          </button>
                        )}
                      </div>
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
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Đăng bài
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedGuideDetail && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/55" onClick={closeGuideDetail} />
            <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                      {selectedGuideDetail.type || 'Guide'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusClass(selectedGuideDetail.status)}`}>
                      {normalizeStatus(selectedGuideDetail.status)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl sm:text-2xl font-black text-gray-900 leading-tight">{selectedGuideDetail.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Tác giả: {selectedGuideDetail.author || 'Ẩn danh'}
                    {' • '}
                    {selectedGuideDetail.createdAt ? vndDate.format(new Date(selectedGuideDetail.createdAt)) : 'Không rõ thời gian'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeGuideDetail}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[78vh] overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                {getGuideImages(selectedGuideDetail).length > 0 && (
                  <div className="mb-4 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <img
                        src={getGuideImages(selectedGuideDetail)[0]}
                        alt={selectedGuideDetail.title}
                        className="h-64 sm:h-80 w-full object-cover"
                      />
                    </div>
                    {getGuideImages(selectedGuideDetail).length > 1 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {getGuideImages(selectedGuideDetail).slice(1).map((url, index) => (
                          <div key={`${selectedGuideDetail.id}-img-${index}`} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <img
                              src={url}
                              alt={`${selectedGuideDetail.title} ${index + 2}`}
                              className="h-24 w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4 text-sm sm:text-base leading-7 text-gray-700">
                  {splitContentBlocks(selectedGuideDetail.content || selectedGuideDetail.description).map((block, index) => (
                    <p key={`${selectedGuideDetail.id}-detail-${index}`} className="whitespace-pre-line">
                      {block}
                    </p>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => handleDeleteGuide(selectedGuideDetail)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Xoá bài viết
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );

  if (isBackofficeRole) {
    if (role === 'staff') {
      return (
        <div className="min-h-screen bg-gray-50 flex">
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg">CHMS</h1>
                    <p className="text-xs text-cyan-200">Staff Portal</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {backofficeNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.path === '/travel-guides';
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      type="button"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive ? 'bg-white/20 text-white font-medium' : 'text-cyan-100 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-cyan-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{currentUser?.name ?? 'Staff'}</p>
                    <RoleBadge role={currentUser?.role || 'staff'} size="sm" />
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 lg:ml-64">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
              <div className="flex items-center gap-4 px-6 py-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" type="button">
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Cẩm nang du lịch</h2>
                  <p className="text-sm text-gray-500">Quản lý và chia sẻ thông tin du lịch</p>
                </div>
              </div>
            </header>
            {pageContent}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <aside
          className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white shadow-lg w-64`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-gray-900">CHMS {role === 'manager' ? 'Manager' : 'Admin'}</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
            {backofficeNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/travel-guides';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  type="button"
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? (role === 'manager' ? 'M' : 'A')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{currentUser?.name ?? (role === 'manager' ? 'Manager' : 'Admin')}</p>
                <div className="mt-1">
                  <RoleBadge role={currentUser?.role || (role === 'manager' ? 'manager' : 'admin')} size="sm" />
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              type="button"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          <header className="bg-white shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-4 px-6 py-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cẩm nang du lịch</h2>
                <p className="text-sm text-gray-500">Quản lý và chia sẻ thông tin du lịch</p>
              </div>
            </div>
          </header>

          {pageContent}
        </div>
      </div>
    );
  }

  return <MainLayout>{pageContent}</MainLayout>;
}
