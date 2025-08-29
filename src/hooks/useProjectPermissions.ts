import { useMemo } from 'react';
import { useProject } from './useProjects';
import {
  getUserProjectPermissions,
  calculatePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canChangeUserRole,
  canRemoveUser,
  canDeleteProject,
  type ProjectPermissions,
} from '../utils/projectPermissions';
import type { ProjectRole } from '../types/project';

// 認証されたユーザー情報を取得する仮のhook（実装は認証システムに依存）
const useCurrentUser = () => {
  // TODO: 実際の認証システムと連携
  return {
    id: 'current-user', // デモ用
    isAuthenticated: true,
  };
};

/**
 * プロジェクト権限管理フック
 */
export const useProjectPermissions = (projectId: string | null) => {
  const { data: project, isLoading: isProjectLoading } = useProject(projectId || '', false);
  const currentUser = useCurrentUser();

  const permissions = useMemo(() => {
    if (!project || !currentUser.isAuthenticated) {
      return calculatePermissions(null);
    }

    return getUserProjectPermissions(project, currentUser.id);
  }, [project, currentUser]);

  const userRole = useMemo(() => {
    if (!project || !currentUser.isAuthenticated) {
      return null;
    }

    // オーナーかどうかチェック
    if (project.ownerId === currentUser.id) {
      return 'OWNER' as ProjectRole;
    }

    // メンバーかどうかチェック
    const member = project.members.find(member => member.user.id === currentUser.id);
    return member?.role || null;
  }, [project, currentUser]);

  const permissionCheckers = useMemo(() => ({
    /**
     * 特定の操作が許可されているかチェック
     */
    can: (action: keyof ProjectPermissions) => hasPermission(permissions, action),

    /**
     * いずれかの操作が許可されているかチェック
     */
    canAny: (actions: Array<keyof ProjectPermissions>) => hasAnyPermission(permissions, actions),

    /**
     * すべての操作が許可されているかチェック
     */
    canAll: (actions: Array<keyof ProjectPermissions>) => hasAllPermissions(permissions, actions),

    /**
     * メンバーの役割変更が可能かチェック
     */
    canChangeRole: (targetUserRole: ProjectRole, newRole: ProjectRole, isOwnerTransfer = false) => 
      canChangeUserRole(userRole, targetUserRole, newRole, isOwnerTransfer),

    /**
     * メンバーの削除が可能かチェック
     */
    canRemoveMember: (targetUserRole: ProjectRole, targetUserId: string) => 
      canRemoveUser(userRole, targetUserRole, currentUser.id, targetUserId),

    /**
     * プロジェクト削除が可能かチェック
     */
    canDeleteProject: (hasActiveTasks = false, forceDelete = false) => 
      canDeleteProject(userRole, hasActiveTasks, forceDelete),

    /**
     * プロジェクトメンバーかどうかチェック
     */
    isMember: () => userRole !== null,

    /**
     * プロジェクトオーナーかどうかチェック
     */
    isOwner: () => userRole === 'OWNER',

    /**
     * 管理者権限以上があるかチェック
     */
    isAdminOrHigher: () => userRole === 'OWNER' || userRole === 'ADMIN',
  }), [permissions, userRole, currentUser.id]);

  return {
    // 基本情報
    userRole,
    permissions,
    project,
    isLoading: isProjectLoading,
    isAuthenticated: currentUser.isAuthenticated,

    // 権限チェック関数
    ...permissionCheckers,

    // よく使用される権限の直接アクセス
    quick: {
      canEdit: permissions.canEditProject,
      canDelete: permissions.canDeleteProject,
      canManageMembers: permissions.canInviteMembers || permissions.canRemoveMembers,
      canViewStats: permissions.canViewStats,
      canCreateTasks: permissions.canCreateTasks,
      canEditTasks: permissions.canEditTasks,
      isReadOnly: userRole === 'VIEWER',
    },
  };
};

/**
 * 複数プロジェクトの権限を一括チェックするフック
 */
export const useProjectsPermissions = (projectIds: string[]) => {
  const currentUser = useCurrentUser();

  const projectsPermissions = useMemo(() => {
    return projectIds.reduce((acc, projectId) => {
      // 各プロジェクトの権限は個別に計算する必要があるが、
      // ここでは簡単化のため基本的なチェックのみ実装
      acc[projectId] = {
        canView: currentUser.isAuthenticated,
        canEdit: false, // 実際のプロジェクトデータが必要
        canDelete: false,
      };
      return acc;
    }, {} as Record<string, { canView: boolean; canEdit: boolean; canDelete: boolean }>);
  }, [projectIds, currentUser]);

  return projectsPermissions;
};

/**
 * プロジェクトアクセス可能性チェックフック（軽量版）
 */
export const useProjectAccessCheck = (projectId: string | null) => {
  const currentUser = useCurrentUser();
  
  return {
    canAttemptAccess: currentUser.isAuthenticated && !!projectId,
    shouldRedirect: !currentUser.isAuthenticated,
  };
};

/**
 * プロジェクト権限に基づくUIコンポーネント制御フック
 */
export const useProjectUI = (projectId: string | null) => {
  const { permissions, userRole, quick } = useProjectPermissions(projectId);

  const uiControls = useMemo(() => ({
    // ボタンの表示制御
    showEditButton: permissions.canEditProject,
    showDeleteButton: permissions.canDeleteProject,
    showInviteButton: permissions.canInviteMembers,
    showSettingsButton: permissions.canEditSettings,
    showStatsButton: permissions.canViewStats,

    // メニュー項目の表示制御
    showMembersMenu: permissions.canViewMembers,
    showAdminMenu: permissions.canEditSettings || permissions.canManagePermissions,
    showOwnerMenu: userRole === 'OWNER',

    // フォームの状態制御
    isReadOnlyForm: userRole === 'VIEWER' || !permissions.canEditProject,
    disableTaskCreation: !permissions.canCreateTasks,
    disableTaskAssignment: !permissions.canAssignTasks,

    // アラート・警告の表示制御
    showPermissionWarning: !permissions.canEditProject && userRole !== null,
    showUpgradePrompt: userRole === 'VIEWER',

    // アクセス制御
    hideIfNoAccess: (requiredPermission: keyof ProjectPermissions) => 
      !permissions[requiredPermission],
    
    disableIfNoPermission: (requiredPermission: keyof ProjectPermissions) => 
      !permissions[requiredPermission],
  }), [permissions, userRole]);

  return {
    ...uiControls,
    userRole,
    permissions,
    quick,
  };
};

/**
 * プロジェクトメンバー管理用フック
 */
export const useProjectMemberManagement = (projectId: string | null) => {
  const { permissions, userRole, canChangeRole, canRemoveMember } = useProjectPermissions(projectId);

  const memberActions = useMemo(() => ({
    /**
     * メンバー招待が可能かチェック
     */
    canInvite: permissions.canInviteMembers,

    /**
     * 特定メンバーの役割変更が可能かチェック
     */
    canChangeRoleFor: (targetRole: ProjectRole, newRole: ProjectRole) =>
      canChangeRole(targetRole, newRole),

    /**
     * 特定メンバーの削除が可能かチェック
     */
    canRemoveUser: (targetRole: ProjectRole, targetUserId: string) =>
      canRemoveMember(targetRole, targetUserId),

    /**
     * オーナー権限譲渡が可能かチェック
     */
    canTransferOwnership: userRole === 'OWNER',

    /**
     * メンバー一覧の表示が可能かチェック
     */
    canViewMembers: permissions.canViewMembers,
  }), [permissions, userRole, canChangeRole, canRemoveMember]);

  return memberActions;
};