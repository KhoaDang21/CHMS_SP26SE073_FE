import React, { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminNavItemsGrouped } from "../../config/adminNavItemsGrouped";
import type { AdminNavItem, AdminNavSection } from "../../config/adminNavItemsGrouped";

const SCROLL_KEY = "adminSidebarScrollTop";

interface AdminSidebarProps {
  isAdminMode?: boolean;
  navItems?: readonly AdminNavItem[];
  groupedItems?: readonly AdminNavSection[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isAdminMode = true,
  navItems,
  groupedItems,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && scrollRef.current) {
      scrollRef.current.scrollTop = parseInt(saved, 10);
    }
  }, []);

  // Save scroll position on scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current.scrollTop));
    }
  };

  const useGrouped = groupedItems && groupedItems.length > 0;
  const itemsToDisplay = useGrouped ? groupedItems : undefined;

  if (!useGrouped && navItems && navItems.length > 0) {
    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="min-w-0 flex-1 text-left truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (!useGrouped && !isAdminMode) {
    return null;
  }

  const sectionsToDisplay = itemsToDisplay || adminNavItemsGrouped;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-280px)]"
    >
      {sectionsToDisplay.map((section) => (
        <div key={section.section} className="flex flex-col gap-2">
          <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
            {section.section}
          </h3>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="min-w-0 flex-1 text-left truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminSidebar;
