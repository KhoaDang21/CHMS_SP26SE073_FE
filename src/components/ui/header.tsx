import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Compass,
  Heart,
  User,
  LogOut,
  MessageCircle,
  Settings,
  Waves,
  Menu,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import { minDelay } from '../../utils/minDelay';

interface HeaderProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

const navigationItems = [
  {
    name: 'Home',
    nameVi: 'Trang Chủ',
    href: '/',
  },
  {
    name: 'About',
    nameVi: 'Giới Thiệu',
    href: '/about',
  },
  {
    name: 'Contact',
    nameVi: 'Liên Hệ',
    href: '/contact',
  },
];

const authenticatedNavigationItems = [
  {
    name: 'Dashboard',
    nameVi: 'Trang Chủ',
    href: '/customer/dashboard',
    icon: Compass,
  },
  {
    name: 'Booking',
    nameVi: 'Đặt Phòng',
    href: '/customer/bookings',
    icon: Compass,
  },
  {
    name: 'Favorites',
    nameVi: 'Yêu Thích',
    href: '/customer/favorites',
    icon: Heart,
  },
  {
    name: 'Messages',
    nameVi: 'Tin Nhắn',
    href: '/customer/messages',
    icon: MessageCircle,
  },
];

export default function Header({ showMenuButton = false, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Chọn navigation items dựa trên trạng thái đăng nhập
  const currentNavigationItems = isAuthenticated ? authenticatedNavigationItems : navigationItems;

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

  const handleProfileClick = () => {
    navigate('/customer/profile');
    setIsUserMenuOpen(false);
  };

  const handleBookingHistoryClick = () => {
    navigate('/customer/bookings');
    setIsUserMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {showMenuButton && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
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
            {currentNavigationItems.map((item) => {
              const isActive = isActivePath(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {item.nameVi}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            {!showMenuButton && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
            )}

            {isAuthenticated ? (
              // Authenticated user - show notifications and user menu
              <>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                  <Bell className="w-6 h-6 text-gray-700" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="hidden sm:block text-gray-700 font-medium">
                      {currentUser?.name || 'User'}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        onClick={handleBookingHistoryClick}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                      >
                        <BookOpen className="w-4 h-4" />
                        Lịch Sử Đặt Phòng
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={handleProfileClick}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                      >
                        <User className="w-4 h-4" />
                        Hồ Sơ
                      </button>
                      <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700">
                        <Settings className="w-4 h-4" />
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
              // Not authenticated - show login and register buttons
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
                    onClick={() => {
                      navigate(item.href);
                      setIsMobileMenuOpen(false);
                    }}
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

              {/* Mobile auth buttons for non-authenticated users */}
              {!isAuthenticated && (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => {
                      navigate('/auth/login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Đăng Nhập
                  </button>
                  <button
                    onClick={() => {
                      navigate('/auth/register');
                      setIsMobileMenuOpen(false);
                    }}
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

      {/* Click outside to close menus */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
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