import type { ProjectRole, ProjectWithDetails } from '../types/project';

/**
 * プロジェクト権限管理ユーティリティ
 * Role-Based Access Control (RBAC) の実装
 */

// 権限レベルの定義（数値が大きいほど権限が強い）
const ROLE_LEVELS: Record<ProjectRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

// 操作権限の定義
export interface ProjectPermissions {
  // プロジェクト基本操作
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canArchiveProject: boolean;
  
  // タスク関連操作
  canViewTasks: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canAssignTasks: boolean;
  
  // メンバー管理操作
  canViewMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  
  // プロジェクト設定操作
  canEditSettings: boolean;
  canManageIntegrations: boolean;
  canExportData: boolean;
  
  // 管理者権限
  canManagePermissions: boolean;
  canTransferOwnership: boolean;
  
  // 統計・レポート閲覧
  canViewStats: boolean;
  canViewReports: boolean;
}

/**
 * ロールに基づいて権限を計算
 */
export const calculatePermissions = (userRole: ProjectRole | null): ProjectPermissions => {
  if (!userRole) {
    // プロジェクトメンバーではない場合（権限なし）
    return {
      canViewProject: false,
      canEditProject: false,
      canDeleteProject: false,
      canArchiveProject: false,
      canViewTasks: false,
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canAssignTasks: false,
      canViewMembers: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeRoles: false,
      canEditSettings: false,
      canManageIntegrations: false,
      canExportData: false,
      canManagePermissions: false,
      canTransferOwnership: false,
      canViewStats: false,
      canViewReports: false,
    };
  }

  const roleLevel = ROLE_LEVELS[userRole];
  
  return {
    // プロジェクト基本操作
    canViewProject: roleLevel >= ROLE_LEVELS.VIEWER,
    canEditProject: roleLevel >= ROLE_LEVELS.ADMIN,
    canDeleteProject: roleLevel >= ROLE_LEVELS.OWNER,
    canArchiveProject: roleLevel >= ROLE_LEVELS.ADMIN,
    
    // タスク関連操作
    canViewTasks: roleLevel >= ROLE_LEVELS.VIEWER,
    canCreateTasks: roleLevel >= ROLE_LEVELS.MEMBER,
    canEditTasks: roleLevel >= ROLE_LEVELS.MEMBER,
    canDeleteTasks: roleLevel >= ROLE_LEVELS.ADMIN,
    canAssignTasks: roleLevel >= ROLE_LEVELS.MEMBER,
    
    // メンバー管理操作
    canViewMembers: roleLevel >= ROLE_LEVELS.VIEWER,
    canInviteMembers: roleLevel >= ROLE_LEVELS.ADMIN,
    canRemoveMembers: roleLevel >= ROLE_LEVELS.ADMIN,
    canChangeRoles: roleLevel >= ROLE_LEVELS.ADMIN,
    
    // プロジェクト設定操作
    canEditSettings: roleLevel >= ROLE_LEVELS.ADMIN,
    canManageIntegrations: roleLevel >= ROLE_LEVELS.ADMIN,
    canExportData: roleLevel >= ROLE_LEVELS.MEMBER,
    
    // 管理者権限
    canManagePermissions: roleLevel >= ROLE_LEVELS.OWNER,
    canTransferOwnership: roleLevel >= ROLE_LEVELS.OWNER,
    
    // 統計・レポート閲覧
    canViewStats: roleLevel >= ROLE_LEVELS.MEMBER,
    canViewReports: roleLevel >= ROLE_LEVELS.MEMBER,
  };
};

/**
 * 現在のユーザーのプロジェクト内での権限を取得
 */
export const getUserProjectPermissions = (
  project: ProjectWithDetails | null,
  currentUserId: string | null
): ProjectPermissions => {
  if (!project || !currentUserId) {
    return calculatePermissions(null);
  }

  // オーナーかどうかチェック
  if (project.ownerId === currentUserId) {
    return calculatePermissions('OWNER');
  }

  // メンバーかどうかチェック
  const memberRole = project.members.find(member => member.user.id === currentUserId)?.role;
  return calculatePermissions(memberRole || null);
};

/**
 * 特定の操作が許可されているかチェック
 */
export const hasPermission = (
  permissions: ProjectPermissions,
  action: keyof ProjectPermissions
): boolean => {
  return permissions[action];
};

/**
 * 複数の操作のうち、いずれかが許可されているかチェック
 */
export const hasAnyPermission = (
  permissions: ProjectPermissions,
  actions: Array<keyof ProjectPermissions>
): boolean => {
  return actions.some(action => permissions[action]);
};

/**
 * すべての操作が許可されているかチェック
 */
export const hasAllPermissions = (
  permissions: ProjectPermissions,
  actions: Array<keyof ProjectPermissions>
): boolean => {
  return actions.every(action => permissions[action]);
};

/**
 * ロールの階層チェック（指定されたロール以上の権限があるか）
 */
export const hasRoleOrHigher = (
  userRole: ProjectRole | null,
  requiredRole: ProjectRole
): boolean => {
  if (!userRole) return false;
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
};

/**
 * ロール変更が可能かチェック
 */
export const canChangeUserRole = (
  currentUserRole: ProjectRole | null,
  targetUserRole: ProjectRole,
  newRole: ProjectRole,
  isOwnerOperation = false
): boolean => {
  if (!currentUserRole) return false;

  // オーナーの権限変更はオーナー権限譲渡のみ
  if (targetUserRole === 'OWNER' && !isOwnerOperation) {
    return false;
  }

  // 自分と同等以上の権限を持つユーザーの権限は変更できない
  if (ROLE_LEVELS[targetUserRole] >= ROLE_LEVELS[currentUserRole]) {
    return false;
  }

  // 自分の権限レベル以上の権限は付与できない
  if (ROLE_LEVELS[newRole] >= ROLE_LEVELS[currentUserRole]) {
    return false;
  }

  // 管理者権限以上が必要
  return hasRoleOrHigher(currentUserRole, 'ADMIN');
};

/**
 * プロジェクトからメンバーを削除可能かチェック
 */
export const canRemoveUser = (
  currentUserRole: ProjectRole | null,
  targetUserRole: ProjectRole,
  currentUserId: string,
  targetUserId: string
): boolean => {
  if (!currentUserRole) return false;

  // オーナーは削除できない
  if (targetUserRole === 'OWNER') return false;

  // 自分自身の場合は「脱退」として許可（ただしオーナーは除く）
  if (currentUserId === targetUserId) {
    return currentUserRole !== 'OWNER';
  }

  // 自分と同等以上の権限を持つユーザーは削除できない
  if (ROLE_LEVELS[targetUserRole] >= ROLE_LEVELS[currentUserRole]) {
    return false;
  }

  // 管理者権限以上が必要
  return hasRoleOrHigher(currentUserRole, 'ADMIN');
};

/**
 * プロジェクト削除が可能かチェック
 */
export const canDeleteProject = (
  userRole: ProjectRole | null,
  hasActiveTasks = false,
  forceDelete = false
): boolean => {
  if (!userRole || userRole !== 'OWNER') return false;

  // アクティブなタスクがある場合、強制削除フラグが必要
  if (hasActiveTasks && !forceDelete) return false;

  return true;
};

/**
 * ロール表示名を取得
 */
export const getRoleDisplayName = (role: ProjectRole): string => {
  const roleNames: Record<ProjectRole, string> = {
    OWNER: 'オーナー',
    ADMIN: '管理者',
    MEMBER: 'メンバー',
    VIEWER: '閲覧者',
  };
  return roleNames[role];
};

/**
 * ロール説明を取得
 */
export const getRoleDescription = (role: ProjectRole): string => {
  const descriptions: Record<ProjectRole, string> = {
    OWNER: 'プロジェクトの完全な管理権限を持ちます。削除や権限譲渡が可能です。',
    ADMIN: 'プロジェクトの管理権限を持ちます。メンバー管理や設定変更が可能です。',
    MEMBER: 'プロジェクトの操作権限を持ちます。タスクの作成・編集が可能です。',
    VIEWER: 'プロジェクトの閲覧権限のみを持ちます。',
  };
  return descriptions[role];
};

/**
 * 利用可能なロール一覧を取得（現在のユーザーが設定可能なロール）
 */
export const getAvailableRoles = (currentUserRole: ProjectRole | null): ProjectRole[] => {
  if (!currentUserRole) return [];

  const currentLevel = ROLE_LEVELS[currentUserRole];
  
  return Object.keys(ROLE_LEVELS)
    .filter(role => {
      const roleLevel = ROLE_LEVELS[role as ProjectRole];
      // 自分の権限未満のロールのみ設定可能（オーナーは除く）
      return roleLevel < currentLevel && role !== 'OWNER';
    }) as ProjectRole[];
};