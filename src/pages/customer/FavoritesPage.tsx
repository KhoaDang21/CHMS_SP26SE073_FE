import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import HomestayCard from '../../components/homestay/HomestayCard';
import CompareHomestaysModal from '../../components/customer/CompareHomestaysModal';
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
  const navigate = useNavigate();
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        const sorted = sortByReview(list);
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
            <p className="mt-2 text-sm text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              Chọn ít nhất 2 homestay rồi bấm So sánh để xem chúng khác nhau như thế nào.
            </p>
          </div>
          <button
            onClick={() => setIsCompareOpen(true)}
            disabled={items.length < 2}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-50"
          >
            So sánh
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-cyan-700 border border-cyan-100">
              {items.length >= 2 ? `${items.length} homestay` : 'Cần 2+'}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Bạn chưa có homestay yêu thích nào.</p>
            <p className="mt-2 text-sm text-gray-500">
              Khi lưu ít nhất 2 homestay, bạn có thể bấm So sánh để đối chiếu chúng.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(h => (
              <HomestayCard key={h.id} homestay={h} />
            ))}
          </div>
        )}
      </div>

      {/* Compare Modal */}
      <CompareHomestaysModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        availableHomestays={items}
        onBooking={(homestayId) => {
          setIsCompareOpen(false);
          navigate(`/homestays/${homestayId}`);
        }}
      />
    </MainLayout>
  );
}
