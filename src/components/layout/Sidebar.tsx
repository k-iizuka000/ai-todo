import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Folder, 
  Calendar, 
  BarChart3, 
  Settings,
  Tag,
  Clock,
  ChevronRight,
  LucideIcon
} from 'lucide-react';
import { routes } from '@/router/routes';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

// アイコンマッピング
const iconMap: Record<string, LucideIcon> = {
  Home,
  CheckSquare,
  Folder,
  Calendar,
  BarChart3,
  Settings,
  Tag,
  Clock,
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(item => item !== path)
        : [...prev, path]
    );
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isExpanded = (path: string) => expandedItems.includes(path);

  React.useEffect(() => {
    // ページが変わった時に該当する親メニューを展開
    const currentRoute = routes.find(route => 
      route.children && route.children.some(child => 
        location.pathname === child.path || 
        (child.path !== '/' && location.pathname.startsWith(child.path))
      )
    );
    
    if (currentRoute && !expandedItems.includes(currentRoute.path)) {
      setExpandedItems(prev => [...prev, currentRoute.path]);
    }
  }, [location.pathname, expandedItems]);

  const renderNavItem = (route: typeof routes[0], level = 0) => {
    const Icon = route.icon ? iconMap[route.icon] : null;
    const hasChildren = route.children && route.children.length > 0;
    const active = isActive(route.path);
    const expanded = isExpanded(route.path);

    return (
      <div key={route.path}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(route.path)}
            className={`
              w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${active 
                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
              ${level > 0 ? 'ml-4' : ''}
            `}
          >
            <div className="flex items-center space-x-3">
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
              <span>{route.label}</span>
            </div>
            <ChevronRight 
              className={`h-4 w-4 transition-transform duration-200 ${
                expanded ? 'transform rotate-90' : ''
              }`} 
            />
          </button>
        ) : (
          <NavLink
            to={route.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                level > 0 ? 'ml-4' : ''
              } ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
            <span>{route.label}</span>
          </NavLink>
        )}

        {hasChildren && expanded && (
          <div className="mt-1 space-y-1">
            {route.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          sidebar-sticky fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo (mobile only) */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Todo</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {routes.map(route => renderNavItem(route))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">U</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">ユーザー名</p>
                <p className="text-xs">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;