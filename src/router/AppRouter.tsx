import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/auth/AuthLayout';
import ProtectedRoute, { AuthenticatedRedirect } from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import TaskDetailDemo from '@/pages/TaskDetailDemo';
import { ProjectManagement } from '@/pages/ProjectManagement';
import Calendar from '@/pages/Calendar';
import DailyScheduleView from '@/pages/DailyScheduleView';
import Analytics from '@/pages/Analytics';
import TagManagement from '@/pages/TagManagement';
import ScheduleErrorBoundary from '@/components/schedule/ScheduleErrorBoundary';
import NotFound from '@/pages/NotFound';
import LoginForm from '@/pages/auth/LoginForm';
import SignupForm from '@/pages/auth/SignupForm';
import SettingsLayout from '@/pages/settings/SettingsLayout';
import GeneralSettings from '@/pages/settings/GeneralSettings';
import AISettings from '@/pages/settings/AISettings';
import ThemeSettings from '@/pages/settings/ThemeSettings';
import DataManagement from '@/pages/settings/DataManagement';

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

// Wildcard redirect component for backward compatibility
const TasksWildcardRedirect: React.FC = () => {
  const location = useLocation();
  // Get the full path after /tasks
  const tasksPath = location.pathname.replace(/^\/tasks/, '');
  const dashboardPath = tasksPath ? `/dashboard${tasksPath}` : '/dashboard';
  return <Navigate to={dashboardPath} replace />;
};

const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Authentication routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route 
            path="login" 
            element={
              <AuthenticatedRedirect>
                <LoginForm />
              </AuthenticatedRedirect>
            } 
          />
          <Route 
            path="signup" 
            element={
              <AuthenticatedRedirect>
                <SignupForm />
              </AuthenticatedRedirect>
            } 
          />
        </Route>

        {/* Protected application routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect routes for backward compatibility */}
          {/* Root redirect to dashboard */}
          <Route path="" element={<Navigate to="/dashboard" replace />} />
          
          {/* Wildcard tasks paths redirect to dashboard */}
          <Route path="tasks/*" element={<TasksWildcardRedirect />} />

          {/* Dashboard routes */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/:taskId" element={<Dashboard />} />
          <Route path="dashboard/today" element={<Dashboard />} />
          <Route path="dashboard/today/:taskId" element={<Dashboard />} />
          <Route path="dashboard/important" element={<Dashboard />} />
          <Route path="dashboard/important/:taskId" element={<Dashboard />} />
          <Route path="dashboard/completed" element={<Dashboard />} />
          <Route path="dashboard/completed/:taskId" element={<Dashboard />} />
          <Route path="dashboard/demo" element={<TaskDetailDemo />} />
          
          {/* Project routes */}
          <Route path="projects" element={<ProjectManagement />} />
          
          {/* Calendar routes */}
          <Route path="calendar" element={<Calendar />} />
          
          {/* Schedule routes */}
          <Route 
            path="schedule" 
            element={
              <ScheduleErrorBoundary>
                <DailyScheduleView />
              </ScheduleErrorBoundary>
            } 
          />
          
          {/* Analytics routes */}
          <Route path="analytics" element={<Analytics />} />
          
          {/* Tags routes */}
          <Route path="tags" element={<TagManagement />} />
          
          {/* Settings routes with nested layout */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<GeneralSettings />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="theme" element={<ThemeSettings />} />
            <Route path="data" element={<DataManagement />} />
          </Route>
        </Route>
        
        {/* 404 route - outside of protected routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;