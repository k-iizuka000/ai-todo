import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Folder, 
  Calendar, 
  BarChart3, 
  LucideIcon 
} from 'lucide-react';
import { mobileRoutes } from '@/router/routes';

// モバイル用に表示するアイコンマッピング
const iconMap: Record<string, LucideIcon> = {
  Home,
  CheckSquare,
  Folder,
  Calendar,
  BarChart3,
};

const MobileNavigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileRoutes.slice(0, 5).map((route) => {
          const Icon = route.icon ? iconMap[route.icon] : null;
          const active = isActive(route.path);
          
          return (
            <NavLink
              key={route.path}
              to={route.path}
              className="flex flex-col items-center justify-center space-y-1 px-2 py-1 rounded-lg transition-all duration-200 min-w-0 flex-1"
            >
              <div className={`p-1 rounded-md transition-colors duration-200 ${
                active ? 'bg-primary-100' : 'hover:bg-gray-100'
              }`}>
                {Icon && (
                  <Icon 
                    className={`h-5 w-5 ${
                      active ? 'text-primary-600' : 'text-gray-600'
                    }`} 
                  />
                )}
              </div>
              <span 
                className={`text-xs font-medium truncate ${
                  active ? 'text-primary-600' : 'text-gray-600'
                }`}
              >
                {route.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      
      {/* Safe area padding for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </nav>
  );
};

export default MobileNavigation;