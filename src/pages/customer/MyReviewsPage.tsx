import { useEffect, useState } from 'react';
import { Star, Pencil, Trash2, MessageSquare, RefreshCcw, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import AccountLayout from '../../layouts/AccountLayout';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../services/reviewService';
import ReviewModal from './ReviewModal';

function StarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-gray-600 font-medium">{value}/5</span>
    </div>
  );
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reviewService.getMyReviews();
      setReviews(res);
    } catch {
      toast.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa đánh giá này?')) return;
    setDeletingId(id);
    try {
      const res = await reviewService.delete(id);
      if (res.success) {
        toast.success(res.message);
        setReviews(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error(res.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AccountLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Đánh Giá Của Tôi</h1>
            <p className="text-gray-600 mt-1">Quản lý các đánh giá bạn đã gửi.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
          >
            <RefreshCcw className="w-4 h-4" />
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="mt-3 text-gray-600">Đang tải...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Chưa có đánh giá nào.</p>
            <p className="text-gray-500 mt-1 text-sm">Hoàn thành chuyến đi để có thể gửi đánh giá.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reviews.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{r.homestayName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  {/* Trạng thái duyệt */}
                  {r.isVerified ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Đã duyệt
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Chờ duyệt
                    </span>
                  )}
                </div>

                {/* Overall rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-800">{r.rating}/5</span>
                </div>

                {/* Sub ratings */}
                <div className="grid grid-cols-2 gap-1.5 bg-gray-50 rounded-xl p-3">
                  <StarRow label="Vệ sinh" value={r.cleanlinessRating} />
                  <StarRow label="Vị trí" value={r.locationRating} />
                  <StarRow label="Giá trị" value={r.valueRating} />
                  <StarRow label="Giao tiếp" value={r.communicationRating} />
                </div>

                {/* Comment */}
                <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>

                {/* Reply from owner */}
                {r.replyFromOwner && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Phản hồi từ chủ nhà</p>
                    <p className="text-sm text-gray-700">{r.replyFromOwner}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setEditTarget(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === r.id ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <ReviewModal
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); load(); }}
        />
      )}
    </AccountLayout>
  );
}
