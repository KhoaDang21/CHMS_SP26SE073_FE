import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import MainLayout from '../../layouts/MainLayout';
import { provinceService } from '../../services/provinceService';
import { publicHomestayService } from '../../services/publicHomestayService';
import { experienceService } from '../../services/experienceService';
import type { Province, Homestay } from '../../types/homestay.types';
import type { LocalExperience } from '../../types/experience.types';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

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

  const provinceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    searchedCards.forEach((item) => {
      const key = item.provinceKey;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return provinces
      .map((province) => ({
        ...province,
        count: counts.get(canonicalProvince(province.name)) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }, [searchedCards, provinces, selectedProvinceKey]);

  const selectedProvinceLabel = selectedProvince === 'all'
    ? 'Tất cả tỉnh thành'
    : provinces.find((province) => canonicalProvince(province.name) === selectedProvinceKey)?.name ?? selectedProvince;

  const featuredCards = cards.slice(0, 8);

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-white via-cyan-50 to-blue-50 px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-4 py-2 text-sm font-medium text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Dịch vụ địa phương theo tỉnh
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                  Khám phá dịch vụ địa phương
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700">
                    theo từng tỉnh thành
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
                  Tổng hợp các trải nghiệm địa phương nổi bật quanh homestay, giúp bạn lọc theo tỉnh và
                  tìm nhanh hoạt động phù hợp trước khi lên lịch chuyến đi.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm ring-1 ring-gray-200">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                  {provinces.length} tỉnh/thành
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm ring-1 ring-gray-200">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  {homestays.length} homestay
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm ring-1 ring-gray-200">
                  <Star className="h-4 w-4 text-cyan-600" />
                  {experiences.length} dịch vụ
                </span>
              </div>
            </div>

            <div className="relative rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-2 text-sm font-medium text-gray-500">Tìm nhanh</div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tên dịch vụ, homestay, địa phương..."
                      className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-2 text-sm font-medium text-gray-500">Tỉnh/Thành</div>
                  <div className="relative">
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="w-full appearance-none rounded-2xl border-0 bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 outline-none"
                    >
                      <option value="all">Tất cả tỉnh thành</option>
                      {provinces.map((province) => (
                        <option key={province.id} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    <Filter className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs font-medium text-gray-500">
                <div className="rounded-2xl bg-cyan-50 px-3 py-4">
                  <div className="text-lg font-black text-cyan-700">{cards.length}</div>
                  Kết quả phù hợp
                </div>
                <div className="rounded-2xl bg-blue-50 px-3 py-4">
                  <div className="text-lg font-black text-blue-700">{featuredCards.length}</div>
                  Hiển thị nổi bật
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-4">
                  <div className="text-lg font-black text-amber-700">{selectedProvince === 'all' ? provinces.length : 1}</div>
                  Tỉnh đang xem
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Chọn tỉnh để khám phá</h2>
              <p className="mt-1 text-sm text-gray-600">Đang xem: {selectedProvinceLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProvince('all')}
              className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:inline-flex"
            >
              Xem tất cả
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedProvince('all')}
              className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition ${selectedProvince === 'all'
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              Tất cả
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${selectedProvince === 'all' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {searchedCards.length}
              </span>
            </button>
            {provinceCounts.map((province) => (
              <button
                key={province.id}
                type="button"
                onClick={() => setSelectedProvince(province.name)}
                className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition ${selectedProvinceKey === canonicalProvince(province.name)
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {province.name}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${selectedProvinceKey === canonicalProvince(province.name) ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                  {province.count}
                </span>
              </button>
            ))}
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
                <h2 className="text-2xl font-bold text-gray-900">Dịch vụ nổi bật</h2>
                <p className="mt-1 text-sm text-gray-600">Những trải nghiệm nổi bật theo tỉnh thành đang được hiển thị.</p>
              </div>
              <div className="hidden items-center gap-2 text-sm font-medium text-gray-500 sm:flex">
                <ArrowRight className="h-4 w-4" />
                Kéo để xem thêm
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredCards.map((card, index) => (
                <article
                  key={card.experience.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
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

                  <div className="space-y-4 p-5">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{card.experience.name}</h3>
                      <div className="flex items-start gap-2 text-sm text-gray-500">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
                        <span className="line-clamp-1">
                          {card.homestay?.name || 'Homestay'}
                          {card.districtName ? ` • ${card.districtName}` : ''}
                        </span>
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                      {card.experience.description || 'Trải nghiệm địa phương đang chờ bạn khám phá.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                      <span className="rounded-full bg-gray-100 px-3 py-1.5">
                        {card.experience.categoryName || 'Dịch vụ địa phương'}
                      </span>
                      {typeof card.experience.price === 'number' && (
                        <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-700">
                          Từ {card.experience.price.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                        <Users className="mr-1 inline-block h-3.5 w-3.5" />
                        {card.homestay?.maxGuests || 0} khách
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Khu vực</div>
                        <div className="text-sm font-semibold text-gray-900">{card.provinceName}</div>
                      </div>

                      <Link
                        to={card.homestay ? `/homestays/${card.homestay.id}` : '/explore'}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
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
    </MainLayout>
  );
}