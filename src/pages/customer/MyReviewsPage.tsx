import { useEffect, useState } from 'react';
import { Star, Pencil, Trash2, MessageSquare, RefreshCcw, CheckCircle, Clock, User, Home, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import AccountLayout from '../../layouts/AccountLayout';
import { reviewService } from '../../services/reviewService';
import type { Review } from '../../services/reviewService';
import ReviewModal from './ReviewModal';

function StarRow({ label, value, small }: { label: string; value: number; small?: boolean }) {
  const size = small ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-gray-600 w-24">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className={`${size} ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
            />
          ))}
        </div>
        <div className="text-gray-600 text-xs font-medium">{value}/5</div>
      </div>
    </div>
  );
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

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

  // Tính tổng số đánh giá đã duyệt và chờ duyệt
  const verifiedCount = reviews.filter(r => r.isVerified).length;
  const pendingCount = reviews.filter(r => !r.isVerified).length;

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Đánh Giá Của Tôi
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Quản lý và theo dõi các đánh giá bạn đã gửi
              </p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium transition-all duration-200 shadow-sm hover:shadow"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Tải lại</span>
            </button>
          </div>

          {/* Stats Cards */}
          {!loading && reviews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Đã duyệt</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">{verifiedCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-amber-800 mt-1">{pendingCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-blue-200 opacity-30"></div>
            </div>
            <p className="mt-4 text-gray-500 font-medium">Đang tải đánh giá...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có đánh giá nào</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Hoàn thành chuyến đi để có thể gửi đánh giá và chia sẻ trải nghiệm của bạn với cộng đồng.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reviews.map(r => (
              <div
                key={r.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-gray-400" />
                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{r.homestayName}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(r.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {r.isVerified ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium border border-green-100">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Đã duyệt
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-medium border border-amber-100">
                        <Clock className="w-3.5 h-3.5" />
                        Chờ duyệt
                      </span>
                    )}
                  </div>

                  {/* Overall rating */}
                  <div className="flex items-center justify-between py-2 border-t border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 text-lg">{r.rating}</span>
                        <span className="text-gray-400 text-sm">/5</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub ratings */}
                  <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-3">
                    <StarRow label="Vệ sinh" value={r.cleanlinessRating} small />
                    <StarRow label="Vị trí" value={r.locationRating} small />
                    <StarRow label="Giá trị" value={r.valueRating} small />
                    <StarRow label="Giao tiếp" value={r.communicationRating} small />
                  </div>

                  {/* Comment */}
                  {r.comment && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className={`text-sm text-gray-700 leading-relaxed ${expandedComments[r.id] ? '' : 'line-clamp-3'}`}>
                            {r.comment}
                          </p>
                          {r.comment.length > 200 && (
                            <button
                              onClick={() => setExpandedComments(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              {expandedComments[r.id] ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reply from owner */}
                  {r.replyFromOwner && (
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">Phản hồi từ chủ nhà</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{r.replyFromOwner}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditTarget(r)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-sm font-medium transition-all duration-200"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deletingId === r.id ? 'Đang xóa...' : 'Xóa'}</span>
                      </button>
                    </div>
                    {!r.isVerified && (
                      <div className="text-xs text-gray-400">
                        Đang chờ kiểm duyệt
                      </div>
                    )}
                  </div>
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