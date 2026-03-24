import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Star,
  User,
  UserCog,
  Users,
  X,
  TrendingUp,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { reviewService } from '../../services/reviewService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'responded' | 'pending';

interface ManagerReviewItem {
  id: string;
  bookingId: string;
  homestayName: string;
  customerName: string;
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
  comment: string;
  createdAt: string;
  replyFromOwner: string;
  replyAt: string;
  hasResponse: boolean;
}

const toReviewItem = (raw: any): ManagerReviewItem => {
  const replyFromOwner = String(raw?.replyFromOwner || raw?.ownerReply || raw?.response || '');
  const replyAt = String(raw?.replyAt || raw?.respondedAt || '');

  return {
    id: String(raw?.id || ''),
    bookingId: String(raw?.bookingId || ''),
    homestayName: String(raw?.homestayName || 'Homestay'),
    customerName: String(raw?.customerName || 'Khách hàng'),
    rating: Number(raw?.rating || 0),
    cleanlinessRating: Number(raw?.cleanlinessRating || 0),
    locationRating: Number(raw?.locationRating || 0),
    valueRating: Number(raw?.valueRating || 0),
    communicationRating: Number(raw?.communicationRating || 0),
    comment: String(raw?.comment || ''),
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    replyFromOwner,
    replyAt,
    hasResponse: replyFromOwner.trim().length > 0,
  };
};

const extractList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  const data = response?.data ?? response?.result ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

function StarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <Star
            key={score}
            className={`w-3.5 h-3.5 ${score <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-gray-600 font-medium">{value}/5</span>
    </div>
  );
}

export default function ManagerReviews() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ManagerReviewItem[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
    { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
    { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
    { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
    { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
    { id: 'reports', label: 'Báo cáo', icon: TrendingUp, path: '/manager/reports' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
  ];

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewService.managerList();
      const list = extractList(response).map(toReviewItem).filter((item) => item.id);
      setReviews(list);

      const draftMap: Record<string, string> = {};
      list.forEach((item) => {
        draftMap[item.id] = item.replyFromOwner || '';
      });
      setReplyDrafts(draftMap);
    } catch (error) {
      console.error('Load manager reviews error:', error);
      toast.error('Không thể tải danh sách review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (filterStatus === 'pending') {
      list = list.filter((item) => !item.hasResponse);
    }

    if (filterStatus === 'responded') {
      list = list.filter((item) => item.hasResponse);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (item) =>
          item.homestayName.toLowerCase().includes(term) ||
          item.customerName.toLowerCase().includes(term) ||
          item.comment.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term),
      );
    }

    return list;
  }, [reviews, searchTerm, filterStatus]);

  const handleSubmitResponse = async (review: ManagerReviewItem) => {
    const content = (replyDrafts[review.id] || '').trim();
    if (!content) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setProcessingId(review.id);
      if (review.hasResponse) {
        await reviewService.managerUpdateRespond(review.id, { replyFromOwner: content });
        toast.success('Đã cập nhật phản hồi review');
      } else {
        await reviewService.managerRespond(review.id, { replyFromOwner: content });
        toast.success('Đã phản hồi review thành công');
      }

      setReviews((prev) =>
        prev.map((item) =>
          item.id === review.id
            ? {
                ...item,
                replyFromOwner: content,
                hasResponse: true,
                replyAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Submit manager response error:', error);
      toast.error('Không thể gửi phản hồi review');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Manager</h1>
              <p className="text-xs text-gray-500">Quản lý vận hành</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'reviews';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{currentUser?.name ?? 'Manager'}</p>
              <div className="mt-1">{currentUser?.role && <RoleBadge role={currentUser.role} size="sm" />}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Manager Reviews</h2>
                <p className="text-gray-600 text-sm">Xem review và phản hồi khách hàng</p>
              </div>
            </div>
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg" type="button">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo homestay, khách hàng, nội dung review..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'pending', label: 'Chưa phản hồi' },
                  { value: 'responded', label: 'Đã phản hồi' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterStatus(option.value as FilterStatus)}
                    type="button"
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      filterStatus === option.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Không có review phù hợp</p>
              <p className="text-gray-500 text-sm">Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredReviews.map((review) => {
                const draft = replyDrafts[review.id] ?? '';
                return (
                  <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{review.homestayName}</h3>
                        <p className="text-sm text-gray-500 mt-1">Mã review: #{review.id.slice(0, 8)}</p>
                      </div>
                      {review.hasResponse ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã phản hồi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                          <MessageSquare className="w-3.5 h-3.5" /> Chưa phản hồi
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{review.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <Star
                            key={score}
                            className={`w-5 h-5 ${score <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-800">{review.rating}/5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 bg-gray-50 rounded-xl p-3">
                      <StarRow label="Vệ sinh" value={review.cleanlinessRating} />
                      <StarRow label="Vị trí" value={review.locationRating} />
                      <StarRow label="Giá trị" value={review.valueRating} />
                      <StarRow label="Giao tiếp" value={review.communicationRating} />
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment || '(Không có nội dung)'}</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor={`reply-${review.id}`} className="text-sm font-medium text-gray-700">
                        Phản hồi của Manager
                      </label>
                      <textarea
                        id={`reply-${review.id}`}
                        value={draft}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                        rows={3}
                        placeholder="Nhập phản hồi cho review này..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">
                          {review.replyAt ? `Cập nhật lần cuối: ${new Date(review.replyAt).toLocaleString('vi-VN')}` : 'Chưa có phản hồi'}
                        </p>
                        <button
                          onClick={() => void handleSubmitResponse(review)}
                          type="button"
                          disabled={processingId === review.id || !draft.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {processingId === review.id
                            ? 'Đang gửi...'
                            : review.hasResponse
                              ? 'Cập nhật phản hồi'
                              : 'Gửi phản hồi'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
