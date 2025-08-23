import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/auth/AuthLayout';
import ProtectedRoute, { AuthenticatedRedirect } from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Tasks from '@/pages/Tasks';
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
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Tasks routes */}
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:taskId" element={<Tasks />} />
          <Route path="tasks/today" element={<Tasks />} />
          <Route path="tasks/today/:taskId" element={<Tasks />} />
          {/* 
            後方互換性維持: 「重要なタスク」「完了済みタスク」はサイドメニューから削除されたが、
            直接URLアクセス、ブックマーク、外部リンクの互換性を保つため、ルート定義は維持する
          */}
          <Route path="tasks/important" element={<Tasks />} />
          <Route path="tasks/important/:taskId" element={<Tasks />} />
          <Route path="tasks/completed" element={<Tasks />} />
          <Route path="tasks/completed/:taskId" element={<Tasks />} />
          <Route path="tasks/demo" element={<TaskDetailDemo />} />
          
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