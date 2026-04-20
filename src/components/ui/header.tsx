import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Compass, Heart, User, LogOut, MessageCircle,
  BellRing, Waves, Menu, X, Trash2, CheckCheck, Star, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { signalRService } from '../../services/signalRService';
import { minDelay } from '../../utils/minDelay';

interface HeaderProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

const navigationItems = [
  { name: 'Home', nameVi: 'Trang Chủ', href: '/' },
  { name: 'Booking', nameVi: 'Đặt Phòng', href: '/customer/bookings' },
  { name: 'Experiences', nameVi: 'Dịch Vụ Địa Phương', href: '/experiences' },
  { name: 'Travel Guides', nameVi: 'Cẩm Nang Du Lịch', href: '/travel-guides' },
  { name: 'Favorites', nameVi: 'Yêu Thích', href: '/customer/favorites' },
  { name: 'Messages', nameVi: 'Hỗ Trợ', href: '/customer/messages' },
  { name: 'About', nameVi: 'Giới Thiệu', href: '/about' },
  { name: 'Contact', nameVi: 'Liên Hệ', href: '/contact' },
];

const authenticatedNavigationItems = [
  { name: 'Dashboard', nameVi: 'Trang Chủ', href: '/customer/dashboard', icon: Compass },
  { name: 'Booking', nameVi: 'Đặt Phòng', href: '/customer/bookings', icon: Compass },
  { name: 'Experiences', nameVi: 'Dịch Vụ Địa Phương', href: '/customer/experiences', icon: Star },
  { name: 'Travel Guides', nameVi: 'Cẩm Nang Du Lịch', href: '/travel-guides', icon: BookOpen },
  { name: 'Favorites', nameVi: 'Yêu Thích', href: '/customer/favorites', icon: Heart },
  { name: 'Messages', nameVi: 'Hỗ Trợ', href: '/customer/messages', icon: MessageCircle },
];

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  // BE trả về UTC không có 'Z' suffix → ép thành UTC để parse đúng
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

// Map status keyword → badge color
const STATUS_BADGES: Record<string, string> = {
  completed: 'bg-cyan-100 text-cyan-700',
  'hoàn thành': 'bg-cyan-100 text-cyan-700',
  confirmed: 'bg-green-100 text-green-700',
  'đã xác nhận': 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  'chờ thanh toán': 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  'đã hủy': 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  'bị từ chối': 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  'đã thanh toán': 'bg-green-100 text-green-700',
  refunded: 'bg-purple-100 text-purple-700',
  'hoàn tiền': 'bg-purple-100 text-purple-700',
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


// Navigate đến trang phù hợp dựa vào nội dung notification
function getNotifRoute(notif: Notification): string {
  const text = `${notif.title ?? ''} ${notif.content}`.toLowerCase();
  if (text.includes('đặt phòng') || text.includes('booking') || text.includes('check-in') || text.includes('check-out') || text.includes('hủy')) return '/customer/bookings';
  if (text.includes('thanh toán') || text.includes('payment') || text.includes('tiền')) return '/customer/bookings';
  if (text.includes('đánh giá') || text.includes('review')) return '/customer/reviews';
  if (text.includes('hỗ trợ') || text.includes('ticket') || text.includes('support')) return '/customer/messages';
  return '/customer/notifications';
}

export default function Header({ showMenuButton = false, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();
  const [profileAvatar, setProfileAvatar] = useState('');

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);


  const currentNavigationItems = isAuthenticated ? authenticatedNavigationItems : navigationItems;

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileAvatar('');
      return;
    }

    let isMounted = true;
    const fetchAvatar = () => {
      profileService.getProfile().then((res) => {
        if (!isMounted) return;
        const avatar = res.profile?.avatar?.trim();
        setProfileAvatar(avatar || '');
      }).catch(() => {
        if (isMounted) setProfileAvatar('');
      });
    };

    const onAvatarUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const avatarFromEvent = customEvent.detail?.trim();
      if (avatarFromEvent) {
        setProfileAvatar(avatarFromEvent);
        return;
      }
      fetchAvatar();
    };

    fetchAvatar();
    window.addEventListener('profile-avatar-updated', onAvatarUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('profile-avatar-updated', onAvatarUpdated);
    };
  }, [isAuthenticated]);

  // Fetch unread count + kết nối SignalR khi đã đăng nhập
  useEffect(() => {
    if (!isAuthenticated) return;

    // Lấy unread count ban đầu
    notificationService.getUnreadCount().then(setUnreadCount);

    // Kết nối SignalR để nhận notification real-time
    const token = authService.getToken() ?? '';
    const userId = authService.getUser()?.id ?? '';

    if (!token) return;

    signalRService.connect(token).then((conn) => {
      // If connection failed, fall back to polling
      if (!conn) {
        console.warn('SignalR connection failed, will use polling instead');
        return;
      }

      // Join vào group của user để nhận notification riêng
      if (userId) conn.invoke('JoinUserGroup', userId).catch(() => { });

      // Lắng nghe event BE push xuống (tên event BE sẽ dùng)
      conn.on('ReceiveNotification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Fallback: BE có thể push event tên khác
      conn.on('NewNotification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }).catch(() => {
      // SignalR không kết nối được — vẫn hoạt động bình thường qua REST
      console.warn('SignalR connection error, app will work with REST API only');
    });

    return () => {
      signalRService.disconnect();
    };
  }, [isAuthenticated]);

  // Load notifications when dropdown opens
  const handleNotifOpen = async () => {
    if (isNotifOpen) {
      setIsNotifOpen(false);
      return;
    }
    setIsNotifOpen(true);
    setNotifLoading(true);
    try {
      const list = await notificationService.getAll();
      setNotifications(list);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Không thể đánh dấu tất cả đã đọc');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.delete(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsUserMenuOpen(false);
    try {
      await minDelay(authService.logout());
      toast.success('Đăng xuất thành công!');
      navigate('/');
    } catch {
      toast.error('Đăng xuất thất bại, vui lòng thử lại.');
    } finally {
      setIsLoggingOut(false);
    }
  };


  const isActivePath = (path: string) => location.pathname === path;
  const userAvatar = profileAvatar || ((currentUser as any)?.avatar ?? '') || ((currentUser as any)?.avatarUrl ?? '');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {showMenuButton && (
              <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            )}
            <button
              onClick={() => navigate(isAuthenticated ? '/customer/dashboard' : '/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">CHMS</h1>
                <p className="text-xs text-gray-500">Coastal Homestay</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {currentNavigationItems.map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${isActivePath(item.href)
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {item.nameVi}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {!showMenuButton && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
              </button>
            )}

            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleNotifOpen}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                  >
                    <Bell className="w-6 h-6 text-gray-700" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-800">Thông báo</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Đánh dấu tất cả đã đọc
                          </button>
                        )}
                      </div>

                      {/* Body */}
                      <div className="max-h-72 overflow-y-auto">
                        {notifLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <svg className="animate-spin w-6 h-6 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Bell className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-sm">Không có thông báo</p>
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              onClick={async () => {
                                if (!notif.isRead) await handleMarkAsRead(notif.id);
                                setIsNotifOpen(false);
                                navigate(getNotifRoute(notif));
                              }}
                              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors group ${!notif.isRead ? 'bg-blue-50/50' : ''
                                }`}
                            >
                              {/* Unread dot */}
                              <div className="mt-1.5 flex-shrink-0">
                                {!notif.isRead ? (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full block" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full block" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {notif.title && (
                                  <p className={`text-sm font-medium truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {notif.title}
                                  </p>
                                )}
                                <p className={`text-sm ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                                  {renderContentWithStatus(notif.content)}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatTime(notif.createdAt)}</p>
                              </div>

                              <button
                                onClick={(e) => handleDelete(notif.id, e)}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => { setIsNotifOpen(false); navigate('/customer/notifications'); }}
                          className="w-full py-2.5 text-sm text-center text-blue-500 hover:text-blue-700 hover:bg-gray-50 transition-colors font-medium"
                        >
                          Xem tất cả thông báo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center overflow-hidden">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={currentUser?.name || 'User avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <span className="hidden sm:block text-gray-700 font-medium">
                      {currentUser?.name || 'User'}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 pb-2 mb-1 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {userAvatar ? (
                              <img
                                src={userAvatar}
                                alt={currentUser?.name || 'User avatar'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{currentUser?.name || 'User'}</p>
                            <p className="text-xs text-gray-400 truncate">{currentUser?.email || ''}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { navigate('/customer/profile'); setIsUserMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                      >
                        <User className="w-4 h-4" />
                        Hồ Sơ
                      </button>
                      <button
                        onClick={() => { navigate('/customer/reviews'); setIsUserMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                      >
                        <Star className="w-4 h-4" />
                        Đánh Giá Của Tôi
                      </button>
                      <button
                        onClick={() => { navigate('/customer/profile?tab=preferences'); setIsUserMenuOpen(false); }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                      >
                        <BellRing className="w-4 h-4" />
                        Cài Đặt
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600 disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng Xuất'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/auth/login')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium transition-colors rounded-lg"
                >
                  Đăng Nhập
                </button>
                <button
                  onClick={() => navigate('/auth/register')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-400 hover:to-cyan-400 transition-all font-medium"
                >
                  Đăng Ký
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {!showMenuButton && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <nav className="space-y-2">
              {currentNavigationItems.map((item) => {
                const isActive = isActivePath(item.href);
                const Icon = (item as any).icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => { navigate(item.href); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {Icon ? <Icon className="w-4 h-4 mr-2" /> : null}
                    {item.nameVi}
                  </button>
                );
              })}

              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => { navigate('/auth/login'); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Đăng Nhập
                  </button>
                  <button
                    onClick={() => { navigate('/auth/register'); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium"
                  >
                    Đăng Ký
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close all menus */}
      {(isUserMenuOpen || isMobileMenuOpen || isNotifOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
            setIsNotifOpen(false);
          }}
        />
      )}


      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-10 h-10 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-700 font-medium">Đang đăng xuất...</p>
          </div>
        </div>
      )}
    </header>
  );
}
