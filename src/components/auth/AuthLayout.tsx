import React from 'react';
import { Outlet, Link } from 'react-router-dom';

/**
 * 認証関連ページ用のレイアウトコンポーネント
 * ログイン・サインアップフォームを中央に配置し、統一されたデザインを提供
 */
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">AI Todo</span>
            </Link>
            
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                ログイン
              </Link>
              <Link
                to="/auth/signup"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium rounded-md"
              >
                新規登録
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 AI Todo. All rights reserved.
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <Link
                to="/terms"
                className="text-xs text-gray-400 hover:text-gray-500"
              >
                利用規約
              </Link>
              <Link
                to="/privacy"
                className="text-xs text-gray-400 hover:text-gray-500"
              >
                プライバシーポリシー
              </Link>
              <Link
                to="/help"
                className="text-xs text-gray-400 hover:text-gray-500"
              >
                ヘルプ
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full opacity-20"></div>
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-purple-100 rounded-full opacity-10"></div>
        <div className="absolute bottom-1/3 -right-20 w-60 h-60 bg-green-100 rounded-full opacity-10"></div>
      </div>
    </div>
  );
};

export default AuthLayout;