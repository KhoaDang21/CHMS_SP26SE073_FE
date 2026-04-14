import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../layouts/MainLayout';
import HomestayCard from '../../components/homestay/HomestayCard';
import { wishlistService } from '../../services/wishlistService';
import type { Homestay } from '../../types/homestay.types';
import toast from 'react-hot-toast';

function sortByReview(list: Homestay[]): Homestay[] {
  return [...list].sort((a, b) => {
    const avgA = a.averageRating ?? a.rating ?? 0;
    const avgB = b.averageRating ?? b.rating ?? 0;
    if (avgB !== avgA) return avgB - avgA;
    const cntA = a.totalReviews ?? a.reviewCount ?? 0;
    const cntB = b.totalReviews ?? b.reviewCount ?? 0;
    return cntB - cntA;
  });
}

export default function FavoritesPage() {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const tr = (vi: string, en: string) => (isEn ? en : vi);
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        const sorted = sortByReview(list);
        if (mounted) setItems(sorted);
      } catch (e) {
        toast.error(tr('Lấy danh sách yêu thích thất bại', 'Failed to load wishlist'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const onChange = async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        const sorted = await sortByReview(list);
        if (mounted) setItems(sorted);
      } catch { }
    };
    window.addEventListener('wishlist-changed', onChange);
    return () => { mounted = false; window.removeEventListener('wishlist-changed', onChange); };
  }, []);

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tr('Homestay Yêu Thích', 'Favorite Homestays')}</h1>
            <p className="text-gray-600">{tr('Danh sách homestay bạn đã lưu · sắp xếp theo đánh giá', 'Saved homestays · sorted by rating')}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">{tr('Đang tải...', 'Loading...')}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{tr('Bạn chưa có homestay yêu thích nào.', 'You do not have any favorite homestays yet.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(h => (
              <HomestayCard key={h.id} homestay={h} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
