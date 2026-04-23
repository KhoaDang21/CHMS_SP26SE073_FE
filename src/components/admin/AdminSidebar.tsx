import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminNavItemsGrouped } from "../../config/adminNavItemsGrouped";
import type { AdminNavItem, AdminNavSection } from "../../config/adminNavItemsGrouped";

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

  // Determine which structure to use
  const useGrouped = groupedItems && groupedItems.length > 0;
  const itemsToDisplay = useGrouped ? groupedItems : undefined;

  // If navItems is provided (flat list), render without grouping
  if (!useGrouped && navItems && navItems.length > 0) {
    return (
      <div className="flex flex-col gap-2">
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
              <span className="min-w-0 flex-1 text-left truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Check if should show anything at all
  if (!useGrouped && !isAdminMode) {
    return null;
  }

  // Use groupedItems or default to adminNavItemsGrouped
  const sectionsToDisplay = itemsToDisplay || adminNavItemsGrouped;

  return (
    <div className="flex flex-col gap-6">
      {sectionsToDisplay.map((section) => (
        <div key={section.section} className="flex flex-col gap-2">
          {/* Section Header */}
          <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
            {section.section}
          </h3>

          {/* Section Items */}
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
                  <span className="min-w-0 flex-1 text-left truncate">
                    {item.label}
                  </span>
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
