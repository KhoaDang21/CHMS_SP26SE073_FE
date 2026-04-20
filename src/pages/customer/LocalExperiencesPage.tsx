import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Users,
  Info,
  Calendar,
  DollarSign,
  ChevronRight,
  Building2,
} from 'lucide-react';
import MainLayout from '../../layouts/MainLayout';
import { provinceService } from '../../services/provinceService';
import { publicHomestayService } from '../../services/publicHomestayService';
import { experienceService } from '../../services/experienceService';
import type { Province, Homestay } from '../../types/homestay.types';
import type { LocalExperience } from '../../types/experience.types';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';

type ExperienceCard = {
  experience: LocalExperience;
  homestay?: Homestay;
  provinceName: string;
  provinceKey: string;
  districtName: string;
  coverImage: string;
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
];

const normalize = (value?: string | null) => String(value ?? '').trim().toLowerCase();

const canonicalProvince = (value?: string | null): string => {
  const text = normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\./g, ' ')
    .replace(/\b(tinh|thanh pho|thanhpho|tp)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};

export default function LocalExperiencesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [experiences, setExperiences] = useState<LocalExperience[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExperienceCard, setSelectedExperienceCard] = useState<ExperienceCard | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [provinceList, homestayResult, experienceList] = await Promise.all([
          provinceService.getAllProvinces(),
          publicHomestayService.list({ page: 1, pageSize: 200 }),
          experienceService.list(),
        ]);

        if (!mounted) return;

        setProvinces(provinceList);
        setHomestays(homestayResult.Items || []);
        setExperiences((experienceList || []).filter((item) => item.isActive));
      } catch (loadError) {
        console.error('Load local experiences page error:', loadError);
        if (mounted) {
          setError('Không thể tải dữ liệu dịch vụ địa phương.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const homestayMap = useMemo(() => {
    const map: Record<string, Homestay> = {};
    homestays.forEach((homestay) => {
      if (homestay.id) {
        map[homestay.id] = homestay;
      }
    });
    return map;
  }, [homestays]);

  const provinceNameByCanonical = useMemo(() => {
    const map = new Map<string, string>();
    provinces.forEach((province) => {
      const key = canonicalProvince(province.name);
      if (key) map.set(key, province.name);
    });
    return map;
  }, [provinces]);

  const allCards = useMemo<ExperienceCard[]>(() => {
    return experiences
      .map((experience, index) => {
        const homestay = experience.homestayId ? homestayMap[experience.homestayId] : undefined;
        const rawProvinceName = homestay?.provinceName?.trim() || '';
        const provinceKey = canonicalProvince(rawProvinceName);
        const provinceName = provinceNameByCanonical.get(provinceKey) || rawProvinceName || 'Chưa xác định';
        const districtName = homestay?.districtName?.trim() || homestay?.city?.trim() || '';
        const coverImage = experience.imageUrl || homestay?.images?.[0] || fallbackImages[index % fallbackImages.length];

        return {
          experience,
          homestay,
          provinceName,
          provinceKey,
          districtName,
          coverImage,
        };
      })
      .filter((item) => item.experience.id);
  }, [experiences, homestayMap, provinceNameByCanonical]);

  const searchedCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCards;

    return allCards.filter((item) => (
      item.experience.name.toLowerCase().includes(q)
      || (item.experience.description || '').toLowerCase().includes(q)
      || (item.homestay?.name || '').toLowerCase().includes(q)
      || item.provinceName.toLowerCase().includes(q)
      || item.districtName.toLowerCase().includes(q)
    ));
  }, [allCards, searchQuery]);

  const selectedProvinceKey = useMemo(
    () => (selectedProvince === 'all' ? 'all' : canonicalProvince(selectedProvince)),
    [selectedProvince],
  );

  const cards = useMemo(() => {
    if (selectedProvinceKey === 'all') return searchedCards;
    return searchedCards.filter((item) => item.provinceKey === selectedProvinceKey);
  }, [searchedCards, selectedProvinceKey]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white via-cyan-50 to-blue-50 px-6 py-12 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-12 sm:py-16">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-200/40 blur-[100px]" />
          <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-blue-200/30 blur-[100px]" />

          <div className="relative flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Dịch vụ địa phương theo tỉnh
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                Khám phá dịch vụ
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700">
                  theo từng tỉnh thành
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                Tổng hợp các trải nghiệm địa phương nổi bật quanh homestay, giúp bạn lọc theo tỉnh và
                tìm nhanh hoạt động phù hợp trước khi lên lịch chuyến đi.
              </p>
            </div>

            {/* Unified Search Bar */}
            <div className="w-full max-w-4xl">
              <div className="group relative flex flex-col gap-4 rounded-[2rem] bg-white p-3 shadow-2xl ring-1 ring-gray-200 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Search className="h-5 w-5 text-cyan-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tên dịch vụ, homestay, địa phương..."
                      className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="hidden h-10 w-px bg-gray-200 sm:block" />

                <div className="relative min-w-[200px]">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Filter className="h-5 w-5 text-cyan-500" />
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full appearance-none border-0 bg-transparent p-0 text-sm font-bold text-gray-900 outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả tỉnh thành</option>
                      {provinces.map((province) => (
                        <option key={province.id} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-full bg-gray-900 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-600 hover:shadow-lg active:scale-95 sm:w-auto"
                >
                  Tìm kiếm ngay
                </button>
              </div>
            </div>

            {/* Consolidated Stats */}
            <div className="flex flex-wrap justify-center gap-6 pt-4 sm:gap-12">
              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl font-black text-gray-900">{provinces.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Tỉnh/Thành</div>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl font-black text-gray-900">{homestays.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Homestay</div>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl font-black text-gray-900">{experiences.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">Dịch vụ</div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
            Đang tải dữ liệu dịch vụ địa phương...
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-red-100 bg-white p-10 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-10 text-center text-gray-500 shadow-sm">
            Không tìm thấy dịch vụ phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProvince === 'all' ? 'Tất cả dịch vụ' : `Dịch vụ tại ${selectedProvince}`}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {cards.length} trải nghiệm địa phương đang được hiển thị.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card, index) => (
                <article
                  key={card.experience.id}
                  onClick={() => setSelectedExperienceCard(card)}
                  className="group cursor-pointer overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <ImageWithFallback
                      src={card.coverImage}
                      alt={card.experience.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur">
                      {card.provinceName}
                    </div>
                    <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-5">
                    <div className="min-h-[80px]">
                      <h3 className="line-clamp-2 text-xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">
                        {card.experience.name}
                      </h3>
                      <div className="mt-2 flex items-start gap-2 text-sm text-gray-500">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
                        <span className="line-clamp-1">
                          {card.homestay?.name || 'Homestay'}
                          {card.districtName ? ` • ${card.districtName}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="min-h-[72px]">
                      <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                        {card.experience.description || 'Trải nghiệm địa phương đang chờ bạn khám phá.'}
                      </p>
                    </div>

                    <div className="flex min-h-[32px] flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                        {card.experience.categoryName || 'Dịch vụ địa phương'}
                      </span>
                      {typeof card.experience.price === 'number' && (
                        <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700">
                          Từ {card.experience.price.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                        <Users className="mr-1 inline-block h-3.5 w-3.5" />
                        {card.homestay?.maxGuests || 0} khách
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Khu vực</div>
                        <div className="text-sm font-bold text-gray-900">{card.provinceName}</div>
                      </div>

                      <Link
                        to={card.homestay ? `/homestays/${card.homestay.id}` : '/'}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 shadow-md"
                      >
                        Xem homestay
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[1.75rem] border border-gray-100 bg-gradient-to-r from-gray-900 via-slate-900 to-cyan-900 px-6 py-8 text-white shadow-xl sm:px-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Muốn xem theo tỉnh khác?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Chỉ cần đổi tỉnh ở phía trên là danh sách cập nhật ngay. Nếu cần, mình có thể làm thêm
                bộ lọc theo loại dịch vụ hoặc gợi ý theo ngân sách.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedProvince('all')}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Xem toàn bộ
              </button>
              <Link
                to="/customer/bookings"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Về booking
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedExperienceCard} onOpenChange={(open) => !open && setSelectedExperienceCard(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-3xl sm:max-w-4xl">
          {selectedExperienceCard && (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative h-[300px] lg:h-full min-h-[400px]">
                <ImageWithFallback
                  src={selectedExperienceCard.coverImage}
                  alt={selectedExperienceCard.experience.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <Badge className="mb-3 bg-cyan-500/90 text-white hover:bg-cyan-500 border-none">
                    {selectedExperienceCard.experience.categoryName || 'Dịch vụ địa phương'}
                  </Badge>
                  <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                    {selectedExperienceCard.experience.name}
                  </h2>
                </div>
              </div>

              <div className="flex flex-col max-h-[85vh] overflow-y-auto bg-white p-6 sm:p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="sr-only">{selectedExperienceCard.experience.name}</DialogTitle>
                  <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm uppercase tracking-widest">
                    <Sparkles className="h-4 w-4" />
                    Chi tiết trải nghiệm
                  </div>
                </DialogHeader>

                <div className="space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        GIÁ THAM KHẢO
                      </div>
                      <div className="text-lg font-black text-cyan-700">
                        {typeof selectedExperienceCard.experience.price === 'number'
                          ? `${selectedExperienceCard.experience.price.toLocaleString('vi-VN')}đ`
                          : 'Liên hệ'}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
                        <MapPin className="h-3.5 w-3.5" />
                        KHU VỰC
                      </div>
                      <div className="text-sm font-bold text-gray-900 line-clamp-1">
                        {selectedExperienceCard.provinceName}
                      </div>
                    </div>
                  </div>

                  {/* Location Details */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      <Info className="h-5 w-5 text-cyan-500" />
                      Thông tin địa điểm
                    </h4>
                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-full bg-cyan-50 p-1.5">
                          <Building2 className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Homestay liên kết</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedExperienceCard.homestay?.name || 'Thông tin homestay đang cập nhật'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-full bg-blue-50 p-1.5">
                          <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ chi tiết</p>
                          <p className="text-sm font-medium text-gray-600">
                            {selectedExperienceCard.districtName ? `${selectedExperienceCard.districtName}, ` : ''}
                            {selectedExperienceCard.provinceName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 rounded-full bg-amber-50 p-1.5">
                          <Users className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sức chứa tối đa</p>
                          <p className="text-sm font-medium text-gray-600">
                            {selectedExperienceCard.homestay?.maxGuests || 0} khách tại homestay
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-gray-900">Mô tả dịch vụ</h4>
                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                      {selectedExperienceCard.experience.description || 'Hiện chưa có mô tả chi tiết cho dịch vụ này.'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                    <Link
                      to={selectedExperienceCard.homestay ? `/homestays/${selectedExperienceCard.homestay.id}` : '/'}
                      className="flex items-center justify-between w-full rounded-2xl bg-gray-900 px-6 py-4 text-sm font-bold text-white transition hover:bg-cyan-600 shadow-lg group"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Xem Homestay & Đặt chỗ
                      </span>
                      <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <p className="text-center text-[10px] text-gray-400 font-medium">
                      * Vui lòng liên hệ homestay để biết thêm chi tiết về lịch trình và đặt dịch vụ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}