import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogOut, X } from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { staffNavItemsGrouped } from '../../config/staffNavItems';

const SCROLL_KEY = 'staffSidebarScrollTop';

type SidebarNavItem = {
  id: string;
  label: string;
  icon: any;
  path: string;
};

type SidebarNavSection = {
  section: string;
  items: SidebarNavItem[];
};

type StaffSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  userName?: string | null;
  userRole?: string | null;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
  groupedItems?: readonly SidebarNavSection[];
};

export default function StaffSidebar({
  isOpen,
  onClose,
  currentPath,
  userName,
  userRole,
  onLogout,
  title = 'CHMS',
  subtitle = 'Staff Portal',
  groupedItems,
}: StaffSidebarProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLElement>(null);
  const sections = groupedItems && groupedItems.length > 0 ? groupedItems : staffNavItemsGrouped;

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && scrollRef.current) {
      scrollRef.current.scrollTop = parseInt(saved, 10);
    }
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current.scrollTop));
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-blue-600 to-blue-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">{title}</h1>
            <p className="text-xs text-blue-200">{subtitle}</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors" type="button">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
      >
        {sections.map((section) => (
          <div key={section.section}>
            <p className="px-3 mb-2 text-[10px] font-bold text-blue-300 uppercase tracking-widest">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.path === currentPath;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                      active
                        ? 'bg-white text-blue-700 font-semibold shadow-md'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-blue-600' : ''}`} style={{ width: '18px', height: '18px' }} />
                    <span className="text-left leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: user + logout */}
      <div className="flex-shrink-0 border-t border-white/10 px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base flex-shrink-0">
            {(userName || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{userName || 'Staff'}</p>
            <div className="mt-0.5">
              <RoleBadge role={(userRole || 'staff') as any} size="sm" />
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
