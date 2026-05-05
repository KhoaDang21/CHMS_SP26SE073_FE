import { useNavigate } from 'react-router-dom';
import { Home, LogOut, X } from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import { staffNavItemsGrouped } from '../../config/staffNavItems';

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
  const sections = groupedItems && groupedItems.length > 0 ? groupedItems : staffNavItemsGrouped;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{title}</h1>
              <p className="text-xs text-cyan-200">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.section} className="space-y-1.5">
              <h3 className="px-4 py-2 text-xs font-bold text-cyan-200 uppercase tracking-wider">
                {section.section}
              </h3>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.path === currentPath;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[44px] ${
                      active ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-cyan-100 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm text-left leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
              {(userName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userName || 'Staff'}</p>
              <RoleBadge role={(userRole || 'staff') as any} size="sm" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-cyan-500/30">
          <button
            onClick={onLogout}
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}