import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import HomestayCard, { fetchReviewSummary } from '../../components/homestay/HomestayCard';
import { wishlistService } from '../../services/wishlistService';
import type { Homestay } from '../../types/homestay.types';
import toast from 'react-hot-toast';

async function sortByReview(list: Homestay[]): Promise<Homestay[]> {
  const summaries = await Promise.all(list.map(h => fetchReviewSummary(h.id)));
  return [...list].sort((a, b) => {
    const ia = list.indexOf(a);
    const ib = list.indexOf(b);
    const sa = summaries[ia];
    const sb = summaries[ib];
    const avgA = sa && sa.count > 0 ? sa.avg : 0;
    const avgB = sb && sb.count > 0 ? sb.avg : 0;
    if (avgB !== avgA) return avgB - avgA;
    const cntA = sa?.count ?? 0;
    const cntB = sb?.count ?? 0;
    return cntB - cntA;
  });
}

export default function FavoritesPage() {
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        const sorted = await sortByReview(list);
        if (mounted) setItems(sorted);
      } catch (e) {
        toast.error('Lấy danh sách yêu thích thất bại');
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
            <h1 className="text-3xl font-bold text-gray-900">Homestay Yêu Thích</h1>
            <p className="text-gray-600">Danh sách homestay bạn đã lưu · sắp xếp theo đánh giá</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Bạn chưa có homestay yêu thích nào.</p>
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
