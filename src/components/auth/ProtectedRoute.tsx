import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 最低限必要なユーザーロール（指定なしの場合は認証済みであれば可） */
  requiredRole?: 'admin' | 'manager' | 'member' | 'guest';
  /** 認証が必要ない場合のリダイレクト先（デフォルトは dashboard） */
  redirectTo?: string;
}

/**
 * 認証が必要なルートを保護するコンポーネント
 * - 認証状態をチェック
 * - 必要に応じて特定のロールを要求
 * - 未認証の場合はログインページにリダイレクト
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'guest',
  redirectTo = '/',
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check authentication status from localStorage
        const authStatus = localStorage.getItem('isAuthenticated');
        const token = localStorage.getItem('token');
        const userString = localStorage.getItem('user');

        if (authStatus === 'true' && token && userString) {
          const user = JSON.parse(userString);
          setIsAuthenticated(true);
          setUserRole(user.role || 'guest');
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for authentication changes (in case of multi-tab usage)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'isAuthenticated' ||
        e.key === 'token' ||
        e.key === 'user'
      ) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role permissions
  const roleHierarchy = {
    guest: 0,
    member: 1,
    manager: 2,
    admin: 3,
  };

  const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  // If user doesn't have sufficient role, redirect or show error
  if (userRoleLevel < requiredRoleLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.664 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              アクセス権限がありません
            </h2>
            <p className="mt-2 text-sm text-red-600">
              このページにアクセスするには{requiredRole}以上の権限が必要です。
              <br />
              現在の権限: {userRole}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                前のページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated and has proper role, render children
  return <>{children}</>;
};

/**
 * 認証済みユーザーのリダイレクト用コンポーネント
 * 既にログイン済みの場合はダッシュボードにリダイレクト
 */
export const AuthenticatedRedirect: React.FC<{
  children: React.ReactNode;
  redirectTo?: string;
}> = ({ children, redirectTo = '/' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem('isAuthenticated');
        const token = localStorage.getItem('token');

        if (authStatus === 'true' && token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;