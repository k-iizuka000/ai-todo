import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Settings, 
  User, 
  Bot, 
  Database, 
  Palette 
} from 'lucide-react';

interface SettingsNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    path: '/settings/general',
    label: '一般設定',
    icon: <User size={20} />,
    description: 'アカウント情報と基本設定'
  },
  {
    path: '/settings/ai',
    label: 'AI設定',
    icon: <Bot size={20} />,
    description: 'AI機能とアシスタント設定'
  },
  {
    path: '/settings/theme',
    label: 'テーマ設定',
    icon: <Palette size={20} />,
    description: '外観とテーマのカスタマイズ'
  },
  {
    path: '/settings/data',
    label: 'データ管理',
    icon: <Database size={20} />,
    description: 'データの移行とバックアップ'
  }
];

const SettingsLayout: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={24} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        </div>
        <p className="text-gray-600">アプリケーションの設定をカスタマイズできます。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {settingsNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-start gap-3 p-4 rounded-lg border transition-all hover:bg-gray-50 ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="mt-0.5">{item.icon}</div>
                <div>
                  <div className="font-medium mb-1">{item.label}</div>
                  <div className="text-sm text-gray-500 leading-tight">
                    {item.description}
                  </div>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;