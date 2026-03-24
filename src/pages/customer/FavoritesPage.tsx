import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import HomestayCard from '../../components/homestay/HomestayCard';
import { wishlistService } from '../../services/wishlistService';
import type { Homestay } from '../../types/homestay.types';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const [items, setItems] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        // sort by rating desc, fallback to reviewCount
        list.sort((a, b) => {
          const ra = a.rating ?? 0;
          const rb = b.rating ?? 0;
          if (rb !== ra) return rb - ra;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
        if (mounted) setItems(list);
      } catch (e) {
        toast.error('Lấy danh sách yêu thích thất bại');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const onChange = async () => {
      try {
        const list = await wishlistService.getMyWishlist();
        list.sort((a, b) => {
          const ra = a.rating ?? 0;
          const rb = b.rating ?? 0;
          if (rb !== ra) return rb - ra;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
        if (mounted) setItems(list);
      } catch {}
    };
    window.addEventListener('wishlist-changed', onChange);
    return () => { mounted = false; window.removeEventListener('wishlist-changed', onChange); };
  }, []);

  const handleRemove = async (id: string) => {
    const prev = items;
    setItems(prev.filter(h => h.id !== id));
    try {
      await wishlistService.remove(id);
      toast.success('Đã bỏ thích');
    } catch (e) {
      setItems(prev);
      toast.error('Không thể bỏ thích, thử lại');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Homestay Yêu Thích</h1>
            <p className="text-gray-600">Danh sách homestay bạn đã lưu</p>
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
              <div key={h.id} className="relative">
                <HomestayCard homestay={h} />
                {/* Removed addedAt label as requested */}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
