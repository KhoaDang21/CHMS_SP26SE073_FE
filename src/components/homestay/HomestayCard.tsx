import { Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Heart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useWishlist } from '../../contexts/WishlistContext';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import type { Homestay } from '../../types/homestay.types';
import { useTranslation } from 'react-i18next';

interface Props {
  homestay: Homestay;
  onBook?: () => void;
  isBooked?: boolean;
}

export default function HomestayCard({ homestay, onBook, isBooked }: Props) {
  const navigate = useNavigate();
  const { favorites, loading: favLoading, toggle } = useWishlist();
  const isLoggedIn = authService.isAuthenticated();
  const isFavorite = favLoading ? false : favorites.has(homestay.id);
  const { t } = useTranslation();

  const locationText = homestay.address
    ? `${homestay.address}${homestay.districtName ? `, ${homestay.districtName}` : ''}${homestay.provinceName ? `, ${homestay.provinceName}` : ''}`
    : `${homestay.districtName || homestay.city || ''} ${homestay.provinceName || homestay.country || ''}`.trim();

  // Sử dụng trực tiếp field từ API
  const avgRating = homestay.averageRating ?? homestay.rating ?? 0;
  const reviewCount = homestay.totalReviews ?? homestay.reviewCount ?? 0;
  const avgDisplay = avgRating > 0 ? avgRating.toFixed(1) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      <Link to={`/homestays/${homestay.id}`} className="block flex-1 flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={homestay.images?.[0] || ''}
            alt={homestay.name}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${isBooked ? 'brightness-50' : ''}`}
          />
          {/* Favorite button — chỉ hiện khi đã login */}
          {isLoggedIn && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await toggle(homestay.id);
                  toast.success(isFavorite ? 'Đã bỏ thích' : 'Đã lưu yêu thích');
                } catch (err) {
                  toast.error('Không thể thay đổi trạng thái yêu thích');
                }
              }}
              title={isFavorite ? 'Bỏ thích' : 'Lưu yêu thích'}
              className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-105 transition-transform"
              type="button"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
          )}
          {/* Booked overlay */}
          {isBooked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg tracking-wide">
                Đã đặt
              </span>
            </div>
          )}
          {/* Rating badge on image */}
          {avgDisplay && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-gray-800">{avgDisplay}</span>
              <span className="text-xs text-gray-500">({reviewCount})</span>
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
              <div className="mt-1 text-[11px] text-amber-700">
                Giá có thể tăng vào cuối tuần/lễ theo mùa.
              </div>
            </div>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-400">{reviewCount} đánh giá</span>
            )}
          </div>
        </div>
      </Link>

      {/* Book button — luôn ở đáy */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={isBooked ? undefined : (onBook ?? (() => navigate(`/homestays/${homestay.id}`)))}
          disabled={isBooked}
          className={`w-full px-4 py-2 rounded-lg transition-all text-sm font-medium ${isBooked
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
            }`}
        >
          {isBooked ? t('common.booked') : t('common.bookNow')}
        </button>
      </div>
    </div>
  );
}
