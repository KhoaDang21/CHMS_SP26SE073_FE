import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Send, X, ChevronRight, Clock, CheckCircle2,
  AlertCircle, Loader2, MessageSquare, Tag, Inbox,
  Headphones, BookOpen, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import {
  supportTicketService,
  type Ticket,
  type TicketDetail,
  type CreateTicketRequest,
} from '../../services/supportTicketService';
import { authService } from '../../services/authService';
import { bookingService, type Booking } from '../../services/bookingService';
import { signalRService } from '../../services/signalRService';
import { subscribeTicketRealtimeEvents } from '../../services/ticketRealtimeService';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; icon: React.ReactNode }> = {
  OPEN:        { label: 'Mở',             color: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-500',   icon: <AlertCircle className="w-3 h-3" /> },
  IN_PROGRESS: { label: 'Đang xử lý',    color: 'bg-yellow-100 text-yellow-700', border: 'border-l-yellow-400', icon: <Clock className="w-3 h-3" /> },
  RESOLVED:    { label: 'Đã giải quyết', color: 'bg-green-100 text-green-700',  border: 'border-l-green-500',  icon: <CheckCircle2 className="w-3 h-3" /> },
  CLOSED:      { label: 'Đã đóng',       color: 'bg-gray-100 text-gray-500',    border: 'border-l-gray-400',   icon: <CheckCircle2 className="w-3 h-3" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Khẩn cấp',    color: 'bg-red-100 text-red-600' },
  NORMAL: { label: 'Bình thường', color: 'bg-blue-50 text-blue-600' },
  LOW:    { label: 'Không gấp',   color: 'bg-gray-100 text-gray-500' },
};

const QUICK_CATEGORIES = [
  { label: 'Vệ sinh phòng',      icon: '🧹' },
  { label: 'Tiện nghi hỏng',     icon: '🔧' },
  { label: 'Thái độ nhân viên',  icon: '👤' },
  { label: 'Yêu cầu hoàn tiền',  icon: '💰' },
  { label: 'Khác',               icon: '💬' },
];

const FILTER_TABS = [
  { key: 'ALL',         label: 'Tất cả' },
  { key: 'OPEN',        label: 'Mở' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'RESOLVED',    label: 'Đã giải quyết' },
  { key: 'CLOSED',      label: 'Đã đóng' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(dateStr: string) {
  if (!dateStr) return '';
  // BE trả về UTC nhưng không có 'Z' suffix → ép thành UTC để parse đúng
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const d = new Date(normalized);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${diff} phút trước`;
  if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
  return d.toLocaleDateString('vi-VN');
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'OPEN',        label: 'Đã gửi',        icon: <Send className="w-3.5 h-3.5" /> },
    { key: 'IN_PROGRESS', label: 'Đang xử lý',    icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'RESOLVED',    label: 'Đã giải quyết', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];
  const ORDER: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 2 };
  const currentIdx = ORDER[status] ?? 0;

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                ${active ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-200'
                  : done ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'}`}>
                {step.icon}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all
                ${i < currentIdx ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────
function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateTicketRequest>({ title: '', description: '', priority: 'NORMAL' });
  const [selectedImageName, setSelectedImageName] = useState('');
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    bookingService.getMyBookings().then(list => {
      setBookings(list.filter(b => b.status === 'COMPLETED' || b.status === 'CHECKED_IN'));
      setLoadingBookings(false);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const selectedBooking = bookings.find(b => b.id === form.bookingId);
  const canSubmit = !!form.bookingId && form.title.trim() && form.description.trim();

  const handleSelectBooking = (id: string) => {
    setForm(f => ({ ...f, bookingId: id }));
    setStep(2);
  };

  const handleSelectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setForm((f) => ({ ...f, imageFile: file }));
    setSelectedImageName(file?.name ?? '');
    setSelectedImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleRemoveImage = () => {
    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    setForm((f) => ({ ...f, imageFile: null }));
    setSelectedImageName('');
    setSelectedImagePreviewUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await supportTicketService.create(form);
    setSubmitting(false);
    if (res.success) {
      toast.success('Gửi khiếu nại thành công!');
      onCreated();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gửi khiếu nại</h2>
              <p className="text-xs text-gray-400 mt-0.5">Đội ngũ phản hồi trong vòng 24 giờ</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[11px]
                ${step === 1 ? 'bg-blue-500 text-white' : 'bg-green-100 text-green-600'}`}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span className={step === 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}>Chọn lượt ở</span>
              <div className="w-8 h-px bg-gray-200" />
              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[11px]
                ${step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>2</span>
              <span className={step === 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}>Chi tiết</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 px-10 py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">Chưa có lượt ở nào phù hợp</p>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-sm">
                Bạn chỉ có thể gửi khiếu nại cho các lượt ở đang diễn ra hoặc đã hoàn thành.
              </p>
            </div>
            <button onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Đóng
            </button>
          </div>
        ) : step === 1 ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-7 pt-5 pb-2 flex-shrink-0">
              <p className="text-sm font-medium text-gray-700">Chọn lượt ở bạn muốn khiếu nại</p>
              <p className="text-xs text-gray-400 mt-0.5">Hiển thị các lượt ở đang diễn ra và đã hoàn thành</p>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-4 space-y-3">
              {bookings.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBooking(b.id)}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-300
                    hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {b.homestayName ?? 'Đặt phòng'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm text-gray-500">
                            {new Date(b.checkIn).toLocaleDateString('vi-VN')} – {new Date(b.checkOut).toLocaleDateString('vi-VN')}
                          </span>
                          {b.totalNights && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                              {b.totalNights} đêm
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${b.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {b.status === 'CHECKED_IN' ? 'Đang ở' : 'Đã hoàn thành'}
                          </span>
                        </div>
                        {b.totalPrice && (
                          <p className="text-xs text-gray-400 mt-1">
                            Tổng tiền: {b.totalPrice.toLocaleString('vi-VN')}đ
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-2 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
            <div className="px-7 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

              {/* Selected booking summary */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200
                  hover:bg-blue-100 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800 truncate">{selectedBooking?.homestayName}</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    {selectedBooking && `${new Date(selectedBooking.checkIn).toLocaleDateString('vi-VN')} – ${new Date(selectedBooking.checkOut).toLocaleDateString('vi-VN')}`}
                  </p>
                </div>
                <span className="text-xs text-blue-400 group-hover:text-blue-600 flex-shrink-0">Đổi</span>
              </button>

              {/* Category chips */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2.5">Loại vấn đề</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_CATEGORIES.map(cat => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, title: cat.label }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition-all
                        ${form.title === cat.label
                          ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50/40'}`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Mô tả ngắn gọn vấn đề của bạn"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                    focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải trong lượt ở này..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                    focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
                  required
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mức độ ưu tiên</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'NORMAL', 'HIGH'] as const).map(p => {
                    const colors = {
                      LOW:    { active: 'border-gray-400 bg-gray-50 text-gray-700',  dot: 'bg-gray-400' },
                      NORMAL: { active: 'border-blue-400 bg-blue-50 text-blue-700',  dot: 'bg-blue-400' },
                      HIGH:   { active: 'border-red-400 bg-red-50 text-red-700',     dot: 'bg-red-400' },
                    };
                    const isActive = form.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, priority: p }))}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                          ${isActive ? colors[p].active : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isActive ? colors[p].dot : 'bg-gray-300'}`} />
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh minh chứng (tuỳ chọn)</label>
                <label className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm cursor-pointer hover:border-blue-300 transition-colors">
                  <span className="truncate text-gray-600">{selectedImageName || 'Chọn 1 ảnh để đính kèm khiếu nại'}</span>
                  <span className="text-blue-600 font-medium">Tải ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectImage}
                  />
                </label>
                {form.imageFile && (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start gap-3">
                      {selectedImagePreviewUrl ? (
                        <img
                          src={selectedImagePreviewUrl}
                          alt={selectedImageName || 'Ảnh minh chứng'}
                          className="h-24 w-24 rounded-lg object-cover border border-white shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
                          Preview
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">{selectedImageName}</p>
                        <p className="mt-1 text-xs text-gray-500">Ảnh sẽ được gửi kèm trong ticket khiếu nại.</p>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="mt-3 text-xs font-medium text-red-500 hover:text-red-600"
                        >
                          Xóa ảnh đã chọn
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-7 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 rotate-180" />
                Quay lại
              </button>
              <button type="submit" disabled={submitting || !canSubmit}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium
                  hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm shadow-blue-200">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gửi khiếu nại
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────
function TicketDetailPanel({
  ticketId, currentUserId, onBack, onClosed,
}: {
  ticketId: string;
  currentUserId: string;
  onBack: () => void;
  onClosed: () => void;
}) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreviewUrl, setReplyImagePreviewUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const detailRealtimeTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await supportTicketService.getDetail(ticketId);
    setDetail(d);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && messagesContainerRef.current && detail?.replies && detail.replies.length > 0) {
      // Scroll only inside the messages container, never the window
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [detail?.replies, loading]);

  useEffect(() => {
    return () => {
      if (replyImagePreviewUrl) {
        URL.revokeObjectURL(replyImagePreviewUrl);
      }
    };
  }, [replyImagePreviewUrl]);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    let isMounted = true;
    let unsubscribe = () => {};

    signalRService.connect(token).then((conn) => {
      if (!isMounted || !conn) return;

      if (currentUserId) {
        conn.invoke('JoinUserGroup', currentUserId).catch(() => {});
      }
      conn.invoke('JoinTicketGroup', ticketId).catch(() => {});
      conn.invoke('JoinSupportTicketGroup', ticketId).catch(() => {});

      unsubscribe = subscribeTicketRealtimeEvents(conn, (event) => {
        if (!event.isTicketEvent) return;
        if (event.ticketId && event.ticketId !== ticketId) return;

        if (detailRealtimeTimerRef.current !== null) {
          window.clearTimeout(detailRealtimeTimerRef.current);
        }
        detailRealtimeTimerRef.current = window.setTimeout(() => {
          if (isMounted) {
            void load();
          }
        }, 250);
      });
    }).catch(() => {});

    return () => {
      isMounted = false;
      unsubscribe();
      if (detailRealtimeTimerRef.current !== null) {
        window.clearTimeout(detailRealtimeTimerRef.current);
        detailRealtimeTimerRef.current = null;
      }
    };
  }, [currentUserId, load, ticketId]);

  const sendMessage = async () => {
    const msg = message.trim();
    if ((!msg && !replyImageFile) || sending) return;
    setSending(true);
    const res = await supportTicketService.sendMessage(ticketId, msg, replyImageFile);
    setSending(false);
    if (res.success) {
      setMessage('');
      if (replyImagePreviewUrl) {
        URL.revokeObjectURL(replyImagePreviewUrl);
      }
      setReplyImageFile(null);
      setReplyImagePreviewUrl('');
      load();
    } else {
      toast.error(res.message);
    }
  };

  const handlePickReplyImage = () => {
    replyFileInputRef.current?.click();
  };

  const handleReplyImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (replyImagePreviewUrl) {
      URL.revokeObjectURL(replyImagePreviewUrl);
    }
    setReplyImageFile(file);
    setReplyImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const handleRemoveReplyImage = () => {
    if (replyImagePreviewUrl) {
      URL.revokeObjectURL(replyImagePreviewUrl);
    }
    setReplyImageFile(null);
    setReplyImagePreviewUrl('');
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  const closeTicket = async () => {
    setClosing(true);
    const res = await supportTicketService.close(ticketId);
    setClosing(false);
    if (res.success) {
      toast.success('Đã đóng yêu cầu hỗ trợ.');
      onClosed();
    } else {
      toast.error(res.message);
    }
  };

  const isClosed = detail?.status === 'CLOSED' || detail?.status === 'RESOLVED';
  const statusCfg = detail ? (STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.OPEN) : null;
  const priorityCfg = detail ? (PRIORITY_CONFIG[detail.priority] ?? PRIORITY_CONFIG.NORMAL) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        {/* Back button — always visible on mobile, hidden on lg+ */}
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors lg:hidden flex-shrink-0"
          aria-label="Quay lại danh sách"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>

        {loading ? (
          <div className="flex-1 h-5 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{detail?.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {statusCfg && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                    {statusCfg.icon}{statusCfg.label}
                  </span>
                )}
                {priorityCfg && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityCfg.color}`}>
                    {priorityCfg.label}
                  </span>
                )}
              </div>
            </div>
            {!isClosed && (
              <button
                onClick={closeTicket}
                disabled={closing}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600
                  hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Đóng ticket
              </button>
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : !detail ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Không tải được dữ liệu.</div>
      ) : (
        <>
          {/* Status timeline */}
          <div className="px-5 pt-4 pb-3 bg-gray-50/60 border-b border-gray-100 flex-shrink-0">
            <StatusTimeline status={detail.status} />
          </div>

          {/* Description */}
          <div className="px-5 py-3 bg-blue-50/40 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Mô tả vấn đề</p>
            <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>
            {detail.attachmentUrl && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Ảnh đính kèm</p>
                <a href={detail.attachmentUrl} target="_blank" rel="noreferrer" className="inline-block">
                  <img
                    src={detail.attachmentUrl}
                    alt="Ảnh khiếu nại"
                    className="h-24 w-24 rounded-lg object-cover border border-white shadow-sm hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
            {detail.staffName && (
              <p className="text-xs text-gray-400 mt-1.5">
                Nhân viên phụ trách: <span className="font-medium text-gray-600">{detail.staffName}</span>
              </p>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {detail.replies.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <MessageSquare className="w-10 h-10 text-gray-200" />
                <p className="text-sm text-gray-400">Chưa có tin nhắn nào. Hãy mô tả thêm vấn đề của bạn.</p>
              </div>
            )}
            {detail.replies.map(reply => {
              const isMe = reply.senderId?.toLowerCase() === currentUserId?.toLowerCase();
              return (
                <div key={reply.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${isMe ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {reply.senderName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm
                    ${isMe
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {!isMe && <p className="text-xs font-medium mb-0.5 text-blue-600">{reply.senderName}</p>}
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{reply.message}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                    {reply.attachmentUrl && (
                      <a href={reply.attachmentUrl} target="_blank" rel="noreferrer" className="inline-block mt-2">
                        <img
                          src={reply.attachmentUrl}
                          alt="Ảnh đính kèm"
                          className="h-24 w-24 rounded-lg object-cover border border-white/70 shadow-sm"
                        />
                      </a>
                    )}
                      {formatTime(reply.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-px" />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
            {isClosed ? (
              <p className="text-center text-sm text-gray-400 py-1">Ticket này đã đóng.</p>
            ) : (
              <div className="space-y-2">
                <input
                  ref={replyFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReplyImageChange}
                />

                {replyImageFile && (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                    {replyImagePreviewUrl && (
                      <img
                        src={replyImagePreviewUrl}
                        alt={replyImageFile.name}
                        className="h-10 w-10 rounded-md object-cover border border-white"
                      />
                    )}
                    <p className="text-xs text-gray-600 truncate flex-1">{replyImageFile.name}</p>
                    <button
                      type="button"
                      onClick={handleRemoveReplyImage}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200
                  px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <button
                  type="button"
                  onClick={handlePickReplyImage}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center flex-shrink-0"
                  title="Đính kèm ảnh"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <textarea
                  rows={1}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
                  style={{ minHeight: 24 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!message.trim() && !replyImageFile) || sending}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white
                    flex items-center justify-center flex-shrink-0
                    disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8 py-16">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow-inner">
          <Headphones className="w-12 h-12 text-blue-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">24/7</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-gray-800">Chưa có khiếu nại nào</h3>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          Sau khi hoàn thành lượt ở, bạn có thể gửi khiếu nại nếu gặp vấn đề. Đội ngũ sẽ phản hồi trong 24 giờ.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={onCreateClick}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
            bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm
            hover:opacity-90 transition-opacity shadow-md shadow-blue-200"
        >
          <Headphones className="w-4 h-4" />
          Gửi khiếu nại
        </button>
        <div className="flex items-center gap-3 text-xs text-gray-400 justify-center pt-1">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Miễn phí</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> Phản hồi nhanh</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-cyan-400" /> Hỗ trợ 24/7</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ tickets, filterStatus, onFilter }: {
  tickets: Ticket[];
  filterStatus: string;
  onFilter: (s: string) => void;
}) {
  const counts: Record<string, number> = { ALL: tickets.length };
  tickets.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });

  return (
    <div className="flex gap-1 p-2.5 border-b border-gray-100 overflow-x-auto flex-shrink-0 scrollbar-hide">
      {FILTER_TABS.map(f => {
        const count = counts[f.key] ?? 0;
        const active = filterStatus === f.key;
        const sCfg = f.key !== 'ALL' ? STATUS_CONFIG[f.key] : null;
        return (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
              ${active ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {f.label}
            {count > 0 && (
              <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                ${active ? 'bg-white/25 text-white' : sCfg ? sCfg.color : 'bg-gray-200 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const listRealtimeTimerRef = useRef<number | null>(null);

  const currentUser = authService.getUser();

  const loadTickets = useCallback(async () => {
    setLoadingList(true);
    const list = await supportTicketService.getMyTickets();
    setTickets(list);
    setLoadingList(false);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    const token = authService.getToken();
    const currentUserId = authService.getUser()?.id;
    if (!token) return;

    let isMounted = true;
    let unsubscribe = () => {};

    signalRService.connect(token).then((conn) => {
      if (!isMounted || !conn) return;

      if (currentUserId) {
        conn.invoke('JoinUserGroup', currentUserId).catch(() => {});
      }

      unsubscribe = subscribeTicketRealtimeEvents(conn, (event) => {
        if (!event.isTicketEvent) return;

        if (listRealtimeTimerRef.current !== null) {
          window.clearTimeout(listRealtimeTimerRef.current);
        }
        listRealtimeTimerRef.current = window.setTimeout(() => {
          if (isMounted) {
            void loadTickets();
          }
        }, 250);
      });
    }).catch(() => {});

    return () => {
      isMounted = false;
      unsubscribe();
      if (listRealtimeTimerRef.current !== null) {
        window.clearTimeout(listRealtimeTimerRef.current);
        listRealtimeTimerRef.current = null;
      }
    };
  }, [loadTickets]);

  const filtered = filterStatus === 'ALL'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

  const handleCreated = () => {
    setShowCreate(false);
    loadTickets();
  };

  // After closing a ticket, reload list and keep the detail panel open to show updated status
  const handleClosed = useCallback(() => {
    loadTickets();
  }, [loadTickets]);

  // On mobile: show list when no ticket selected, show detail when selected
  // On desktop (lg+): always show both panels side by side
  const showList = !selectedId;   // mobile: hide list when detail is open
  const showDetail = !!selectedId; // mobile: hide detail when nothing selected

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Hỗ Trợ</h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">Quản lý các yêu cầu hỗ trợ của bạn</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500
              text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Gửi khiếu nại
          </button>
        </div>

        {/* Main layout: list + detail */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          style={{ height: 'calc(100vh - 180px)', minHeight: 560 }}
        >
          <div className="flex h-full">

            {/* ── Ticket list ── */}
            {/* Mobile: full width, hidden when a ticket is selected */}
            {/* Desktop (lg+): fixed sidebar, always visible */}
            <div className={`
              flex flex-col border-r border-gray-100 flex-shrink-0
              w-full lg:w-80 xl:w-96
              ${showList ? 'flex' : 'hidden'} lg:flex
            `}>
              <StatsBar tickets={tickets} filterStatus={filterStatus} onFilter={setFilterStatus} />

              <div className="flex-1 overflow-y-auto">
                {loadingList ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                ) : tickets.length === 0 ? (
                  <EmptyState onCreateClick={() => setShowCreate(true)} />
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
                    <Inbox className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-gray-400">Không có yêu cầu nào trong mục này.</p>
                    <button onClick={() => setFilterStatus('ALL')}
                      className="text-sm text-blue-500 hover:underline font-medium">
                      Xem tất cả
                    </button>
                  </div>
                ) : (
                  filtered.map(ticket => {
                    const sCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.OPEN;
                    const pCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.NORMAL;
                    const isSelected = selectedId === ticket.id;
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedId(ticket.id)}
                        className={`w-full text-left px-4 py-3.5 border-b border-gray-50 border-l-4 transition-all
                          ${sCfg.border}
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/80'}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className={`text-sm font-medium line-clamp-1 flex-1 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                            {ticket.title}
                          </p>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? 'text-blue-400' : 'text-gray-300'}`} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.color}`}>
                            {sCfg.icon}{sCfg.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pCfg.color}`}>
                            <Tag className="w-2.5 h-2.5 inline mr-0.5" />{pCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">{formatTime(ticket.createdAt)}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Detail panel ── */}
            {/* Mobile: full width, only shown when a ticket is selected */}
            {/* Desktop (lg+): flex-1, always visible */}
            <div className={`
              flex-1 flex flex-col
              ${showDetail ? 'flex' : 'hidden'} lg:flex
            `}>
              {selectedId ? (
                <TicketDetailPanel
                  key={selectedId}
                  ticketId={selectedId}
                  currentUserId={currentUser?.id ?? ''}
                  onBack={() => setSelectedId(null)}
                  onClosed={handleClosed}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Chọn một yêu cầu để xem chi tiết</p>
                    <p className="text-sm text-gray-400 mt-0.5">hoặc tạo yêu cầu hỗ trợ mới</p>
                  </div>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 text-blue-600
                      text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo yêu cầu mới
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showCreate && (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </MainLayout>
  );
}
