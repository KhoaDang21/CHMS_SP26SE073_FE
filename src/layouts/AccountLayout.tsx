import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  User, Bell,
  Star, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import Header from '../components/ui/header';
import { authService } from '../services/authService';
import { minDelay } from '../utils/minDelay';
import toast from 'react-hot-toast';

interface AccountLayoutProps {
  children: ReactNode;
}

const sidebarItems = [
  { label: 'Hồ Sơ',     href: '/customer/profile',       icon: User },
  { label: 'Đánh Giá',  href: '/customer/reviews',       icon: Star },
  { label: 'Thông Báo', href: '/customer/notifications', icon: Bell },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const currentUser = authService.getUser();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await minDelay(authService.logout());
      toast.success('Đăng xuất thành công!');
      navigate('/');
    } catch {
      toast.error('Đăng xuất thất bại');
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">

        {/* ── Mobile sidebar toggle ── */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-40 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-lg flex items-center justify-center text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <span className="font-semibold text-gray-800">Tài khoản</span>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <SidebarContent
                currentUser={currentUser}
                isActive={isActive}
                navigate={(href) => { navigate(href); setMobileOpen(false); }}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            </aside>
          </div>
        )}

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-20">
            <SidebarContent
              currentUser={currentUser}
              isActive={isActive}
              navigate={navigate}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar content (shared between mobile/desktop) ──────────────────────────
function SidebarContent({
  currentUser,
  isActive,
  navigate,
  onLogout,
  loggingOut,
}: {
  currentUser: ReturnType<typeof authService.getUser>;
  isActive: (href: string) => boolean;
  navigate: (href: string) => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{currentUser?.name || 'Người dùng'}</p>
            <p className="text-xs text-gray-400 truncate">{currentUser?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5">
        {sidebarItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {label}
              </span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loggingOut ? (
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {loggingOut ? 'Đang đăng xuất...' : 'Đăng Xuất'}
        </button>
      </div>
    </div>
  );
}
