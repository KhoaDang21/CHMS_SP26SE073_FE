import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { apiService } from '../../services/apiService';
import { apiConfig } from '../../config/apiConfig';
import type { Homestay } from '../../types/homestay.types';

interface PublicReview {
  id: string;
  customerName: string;
  avatarUrl?: string;
  rating: number;
  comment: string;
  replyFromOwner?: string;
  createdAt: string;
}

interface ReviewSummary {
  avg: number;
  count: number;
  latest?: PublicReview;
}

// Module-level cache: homestayId → summary
const reviewCache = new Map<string, ReviewSummary>();

export async function fetchReviewSummary(homestayId: string): Promise<ReviewSummary> {
  if (reviewCache.has(homestayId)) return reviewCache.get(homestayId)!;
  try {
    const res = await apiService.get<any>(
      apiConfig.endpoints.publicHomestays.reviews(homestayId)
    );
    const list: PublicReview[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];
    if (list.length === 0) {
      const empty = { avg: 0, count: 0 };
      reviewCache.set(homestayId, empty);
      return empty;
    }
    const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
    const summary: ReviewSummary = {
      avg: Math.round(avg * 10) / 10,
      count: list.length,
      latest: list[0],
    };
    reviewCache.set(homestayId, summary);
    return summary;
  } catch {
    return { avg: 0, count: 0 };
  }
}

interface Props {
  homestay: Homestay;
  onBook?: () => void;
}

export default function HomestayCard({ homestay, onBook }: Props) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReviewSummary(homestay.id).then(s => {
      if (!cancelled) setSummary(s);
    });
    return () => { cancelled = true; };
  }, [homestay.id]);

  const locationText = homestay.address
    ? `${homestay.address}${homestay.districtName ? `, ${homestay.districtName}` : ''}${homestay.provinceName ? `, ${homestay.provinceName}` : ''}`
    : `${homestay.districtName || homestay.city || ''} ${homestay.provinceName || homestay.country || ''}`.trim();

  const avgDisplay = summary && summary.count > 0
    ? summary.avg.toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      <Link to={`/homestays/${homestay.id}`} className="block flex-1 flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={homestay.images?.[0] || ''}
            alt={homestay.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {/* Rating badge on image */}
          {avgDisplay && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-gray-800">{avgDisplay}</span>
              <span className="text-xs text-gray-500">({summary!.count})</span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2 h-[180px]">
          {/* Name + rating */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-gray-900 line-clamp-1 flex-1">{homestay.name}</h4>
            {avgDisplay ? (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-800">{avgDisplay}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 flex-shrink-0">Chưa có đánh giá</span>
            )}
          </div>

          {/* Location — tối đa 2 dòng */}
          <p className="text-sm text-gray-500 flex items-start gap-1 line-clamp-2 min-h-[2.5rem]">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{locationText || 'Đang cập nhật'}</span>
          </p>

          {/* Guests + bedrooms */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {homestay.maxGuests ?? '-'} khách
            </span>
            <span>{homestay.bedrooms ?? '-'} phòng ngủ</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
            <div>
              <span className="font-bold text-gray-900">
                {homestay.pricePerNight
                  ? homestay.pricePerNight.toLocaleString('vi-VN') + 'đ'
                  : '-'}
              </span>
              <span className="text-sm text-gray-500">/đêm</span>
            </div>
            {summary && summary.count > 0 && (
              <span className="text-xs text-gray-400">{summary.count} đánh giá</span>
            )}
          </div>
        </div>
      </Link>

      {/* Book button — luôn ở đáy */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={onBook ?? (() => navigate(`/homestays/${homestay.id}`))}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium"
        >
          Đặt Ngay
        </button>
      </div>
    </div>
  );
}
