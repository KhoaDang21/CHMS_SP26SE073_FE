import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Star,
  Ticket,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { reviewService } from '../../services/reviewService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { toast } from 'sonner';

type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';
type FilterStatus = 'all' | ReviewModerationStatus;

interface StaffReviewItem {
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
  moderationStatus: ReviewModerationStatus;
}

const normalizeModerationStatus = (raw: any): ReviewModerationStatus => {
  const status = String(raw?.status || raw?.reviewStatus || '').toUpperCase();
  if (status === 'APPROVED' || status === 'VERIFIED') return 'approved';
  if (status === 'REJECTED') return 'rejected';

  if (raw?.isVerified === true || raw?.isApproved === true) return 'approved';
  if (raw?.isRejected === true) return 'rejected';

  return 'pending';
};

const toReviewItem = (raw: any): StaffReviewItem => ({
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
  moderationStatus: normalizeModerationStatus(raw),
});

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

export default function StaffReviews() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<StaffReviewItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard', active: false },
    { name: 'Bookings', icon: Calendar, path: '/staff/bookings', active: false },
    { name: 'Reviews', icon: MessageSquare, path: '/staff/reviews', active: true },
    { name: 'Cẩm nang du lịch', icon: BookOpen, path: '/travel-guides', active: false },
    { name: 'Tickets', icon: Ticket, path: '/staff/tickets', active: false },
  ];

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewService.staffList();
      const list = extractList(response).map(toReviewItem).filter((item) => item.id);
      setReviews(list);
    } catch (error) {
      console.error('Load staff reviews error:', error);
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

    if (filterStatus !== 'all') {
      list = list.filter((item) => item.moderationStatus === filterStatus);
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

  const updateReviewStatus = (id: string, moderationStatus: ReviewModerationStatus) => {
    setReviews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, moderationStatus } : item)),
    );
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await reviewService.staffApprove(id);
      updateReviewStatus(id, 'approved');
      toast.success('Đã duyệt review thành công');
    } catch (error) {
      console.error('Approve review error:', error);
      toast.error('Không thể duyệt review');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await reviewService.staffReject(id);
      updateReviewStatus(id, 'rejected');
      toast.success('Đã từ chối review');
    } catch (error) {
      console.error('Reject review error:', error);
      toast.error('Không thể từ chối review');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const getStatusBadge = (status: ReviewModerationStatus) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3.5 h-3.5" /> Đã từ chối
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
        <MessageSquare className="w-3.5 h-3.5" /> Chờ duyệt
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className="text-xs text-cyan-200">Staff Portal</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name ?? 'Staff'}</p>
                <RoleBadge role={currentUser?.role || 'staff'} size="sm" />
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active ? 'bg-white/20 text-white font-medium' : 'text-cyan-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-cyan-500/30">
            <button
              onClick={handleLogout}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Duyệt Review</h2>
                <p className="text-sm text-gray-500">Staff xem và xử lý review khách hàng</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative" type="button">
              <Bell className="w-6 h-6 text-gray-600" />
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'pending', label: 'Chờ duyệt' },
                  { value: 'approved', label: 'Đã duyệt' },
                  { value: 'rejected', label: 'Đã từ chối' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterStatus(option.value as FilterStatus)}
                    type="button"
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      filterStatus === option.value ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Không có review phù hợp</p>
              <p className="text-gray-500 text-sm">Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{review.homestayName}</h3>
                      <p className="text-sm text-gray-500 mt-1">Mã review: #{review.id.slice(0, 8)}</p>
                    </div>
                    {getStatusBadge(review.moderationStatus)}
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

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleApprove(review.id)}
                      type="button"
                      disabled={processingId === review.id || review.moderationStatus !== 'pending'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {processingId === review.id ? 'Đang xử lý...' : 'Chấp nhận'}
                    </button>
                    <button
                      onClick={() => handleReject(review.id)}
                      type="button"
                      disabled={processingId === review.id || review.moderationStatus !== 'pending'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      {processingId === review.id ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
