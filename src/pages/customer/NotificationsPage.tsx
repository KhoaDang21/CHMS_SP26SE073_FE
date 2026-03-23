import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, RefreshCw, BellOff,
  CalendarCheck, CreditCard, Star, Info, Home, MessageCircle,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AccountLayout from '../../layouts/AccountLayout';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../services/notificationService';

type FilterType = 'all' | 'unread' | 'read';

// ─── Status badge renderer ────────────────────────────────────────────────────
const STATUS_BADGES: Record<string, string> = {
  completed:        'bg-cyan-100 text-cyan-700',
  'hoàn thành':     'bg-cyan-100 text-cyan-700',
  confirmed:        'bg-green-100 text-green-700',
  'đã xác nhận':    'bg-green-100 text-green-700',
  pending:          'bg-yellow-100 text-yellow-700',
  'chờ thanh toán': 'bg-yellow-100 text-yellow-700',
  cancelled:        'bg-red-100 text-red-700',
  'đã hủy':         'bg-red-100 text-red-700',
  rejected:         'bg-red-100 text-red-700',
  'bị từ chối':     'bg-red-100 text-red-700',
  paid:             'bg-green-100 text-green-700',
  'đã thanh toán':  'bg-green-100 text-green-700',
  refunded:         'bg-purple-100 text-purple-700',
  'hoàn tiền':      'bg-purple-100 text-purple-700',
};

function renderContentWithStatus(text: string): React.ReactNode {
  const keys = Object.keys(STATUS_BADGES).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c));
  const pattern = new RegExp(`(${keys.join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const cls = STATUS_BADGES[part.toLowerCase()];
    if (cls) {
      return (
        <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold mx-0.5 ${cls}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}


// Navigate đến trang phù hợp
function getNotifRoute(notif: Notification): string {
  const text = `${notif.title ?? ''} ${notif.content}`.toLowerCase();
  if (text.includes('đặt phòng') || text.includes('booking') || text.includes('check-in') || text.includes('check-out') || text.includes('hủy')) return '/customer/bookings';
  if (text.includes('thanh toán') || text.includes('payment') || text.includes('tiền')) return '/customer/bookings';
  if (text.includes('đánh giá') || text.includes('review')) return '/customer/reviews';
  if (text.includes('hỗ trợ') || text.includes('ticket') || text.includes('support')) return '/customer/messages';
  return '/customer/notifications';
}

// ─── Detect loại notification từ title/content ───────────────────────────────
type NotifType = 'booking' | 'payment' | 'review' | 'system' | 'homestay' | 'support';

function detectType(notif: Notification): NotifType {
  const text = `${notif.title ?? ''} ${notif.content}`.toLowerCase();
  if (text.includes('đặt phòng') || text.includes('booking') || text.includes('check-in') || text.includes('check-out') || text.includes('hủy')) return 'booking';
  if (text.includes('thanh toán') || text.includes('payment') || text.includes('tiền') || text.includes('hoàn tiền')) return 'payment';
  if (text.includes('đánh giá') || text.includes('review') || text.includes('nhận xét')) return 'review';
  if (text.includes('homestay') || text.includes('phòng') || text.includes('chỗ ở')) return 'homestay';
  if (text.includes('hỗ trợ') || text.includes('ticket') || text.includes('support')) return 'support';
  return 'system';
}

const typeConfig: Record<NotifType, { icon: React.ElementType; bg: string; iconColor: string; badge: string; label: string }> = {
  booking:  { icon: CalendarCheck, bg: 'bg-blue-100',   iconColor: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',   label: 'Đặt phòng' },
  payment:  { icon: CreditCard,    bg: 'bg-green-100',  iconColor: 'text-green-600',  badge: 'bg-green-100 text-green-700', label: 'Thanh toán' },
  review:   { icon: Star,          bg: 'bg-yellow-100', iconColor: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700',label: 'Đánh giá' },
  homestay: { icon: Home,          bg: 'bg-cyan-100',   iconColor: 'text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700',   label: 'Homestay' },
  support:  { icon: MessageCircle, bg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700',label: 'Hỗ trợ' },
  system:   { icon: Info,          bg: 'bg-gray-100',   iconColor: 'text-gray-500',   badge: 'bg-gray-100 text-gray-600',   label: 'Hệ thống' },
};

// ─── Format time ─────────────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatGroupDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Hôm nay';
  if (d.getTime() === yesterday.getTime()) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

// ─── Group by date ────────────────────────────────────────────────────────────
function groupByDate(list: Notification[]): { label: string; items: Notification[] }[] {
  const map = new Map<string, Notification[]>();
  for (const n of list) {
    const key = formatGroupDate(n.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 6 }: { size?: number }) {
  return (
    <svg className={`animate-spin w-${size} h-${size} text-cyan-500`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<NotifType | 'all'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const list = await notificationService.getAll();
      setNotifications(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('Không thể đánh dấu đã đọc'); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch { toast.error('Thao tác thất bại'); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { toast.error('Không thể xóa thông báo'); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  // Stats per type
  const typeCounts = notifications.reduce((acc, n) => {
    const t = detectType(n);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = notifications.filter(n => {
    const readOk = filter === 'all' || (filter === 'unread' ? !n.isRead : n.isRead);
    const typeOk = typeFilter === 'all' || detectType(n) === typeFilter;
    return readOk && typeOk;
  });

  const groups = groupByDate(filtered);

  return (
    <AccountLayout>
      <div className="min-h-0">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-500" />
              Thông Báo
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600 transition-all"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-4 w-56 flex-shrink-0">
            {/* Stats card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tổng quan</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tất cả</span>
                  <span className="text-sm font-semibold text-gray-900">{notifications.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
                    Chưa đọc
                  </span>
                  <span className="text-sm font-semibold text-blue-600">{unreadCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block" />
                    Đã đọc
                  </span>
                  <span className="text-sm font-semibold text-gray-400">{readCount}</span>
                </div>
              </div>
            </div>

            {/* Filter by type */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Danh mục</p>
              <div className="space-y-1">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                    typeFilter === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    Tất cả
                  </span>
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${typeFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {notifications.length}
                  </span>
                </button>
                {(Object.keys(typeConfig) as NotifType[]).map(t => {
                  const cfg = typeConfig[t];
                  const Icon = cfg.icon;
                  const count = typeCounts[t] ?? 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                        typeFilter === t ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${typeFilter === t ? 'text-blue-600' : cfg.iconColor}`} />
                        {cfg.label}
                      </span>
                      <span className={`text-xs rounded-full px-1.5 py-0.5 ${typeFilter === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── Main Feed ── */}
          <div className="flex-1 min-w-0">
            {/* Read filter tabs */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-4">
              {(['all', 'unread', 'read'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? `Tất cả (${notifications.length})` : f === 'unread' ? `Chưa đọc (${unreadCount})` : `Đã đọc (${readCount})`}
                </button>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-center py-20">
                <Spinner size={8} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <BellOff className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-semibold text-gray-600 text-lg">Không có thông báo</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filter === 'unread' ? 'Bạn đã đọc hết rồi!' : 'Chưa có thông báo nào trong danh mục này.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map(({ label, items }) => (
                  <div key={label}>
                    {/* Date group label */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
                      {items.map(notif => {
                        const type = detectType(notif);
                        const cfg = typeConfig[type];
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={notif.id}
                            onClick={async () => {
                              if (!notif.isRead) await handleMarkAsRead(notif.id);
                              navigate(getNotifRoute(notif));
                            }}
                            className={`flex items-start gap-4 px-5 py-4 group transition-all cursor-pointer ${
                              !notif.isRead
                                ? 'bg-gradient-to-r from-blue-50/60 to-transparent hover:from-blue-50 hover:to-blue-50/20'
                                : 'hover:bg-gray-50/80'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {notif.title && (
                                      <p className={`text-sm font-semibold leading-snug ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {notif.title}
                                      </p>
                                    )}
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                                      {cfg.label}
                                    </span>
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className={`text-sm mt-0.5 leading-relaxed ${!notif.isRead ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {renderContentWithStatus(notif.content)}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                    <span>{formatTime(notif.createdAt)}</span>
                                    {!notif.isRead && (
                                      <span className="text-blue-400">· Chưa đọc</span>
                                    )}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.isRead && (
                                    <button
                                      onClick={e => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                      className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-300 hover:text-blue-600 transition-colors"
                                      title="Đánh dấu đã đọc"
                                    >
                                      <CheckCheck className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={e => handleDelete(notif.id, e)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition-colors" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
