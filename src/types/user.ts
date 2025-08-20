/**
 * ユーザー管理・認証システムの型定義
 */

// ユーザーの状態
export type UserStatus = 
  | 'active'     // アクティブ
  | 'inactive'   // 非アクティブ
  | 'suspended'  // 停止中
  | 'pending';   // 承認待ち

// ユーザーの役割
export type UserRole = 
  | 'admin'      // 管理者
  | 'manager'    // マネージャー
  | 'member'     // メンバー
  | 'guest';     // ゲスト

// 認証プロバイダー
export type AuthProvider = 
  | 'email'      // メール認証
  | 'google'     // Google認証
  | 'github'     // GitHub認証
  | 'microsoft'; // Microsoft認証

// ユーザー設定
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    taskDeadlines: boolean;
    projectUpdates: boolean;
    mentions: boolean;
  };
}

// ユーザープロフィール
export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

// メインのUser型定義
export interface User {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  profile: UserProfile;
  preferences: UserPreferences;
  authProvider: AuthProvider;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ユーザー作成用のInput型
export interface CreateUserInput {
  email: string;
  profile: Omit<UserProfile, 'displayName'> & { displayName?: string };
  role?: UserRole;
  preferences?: Partial<UserPreferences>;
  authProvider?: AuthProvider;
}

// ユーザー更新用のInput型
export interface UpdateUserInput {
  status?: UserStatus;
  role?: UserRole;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

// 認証状態の型定義
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

// ログイン用のInput型
export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// サインアップ用のInput型
export interface SignupInput {
  email: string;
  password: string;
  confirmPassword: string;
  profile: {
    firstName: string;
    lastName: string;
    displayName?: string;
  };
}

// パスワードリセット用の型
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// OAuth認証用の型
export interface OAuthLoginInput {
  provider: AuthProvider;
  code: string;
  state?: string;
}

// セッション情報
export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

// APIエラーレスポンス
export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

// ユーザーフィルター用の型
export interface UserFilter {
  status?: UserStatus[];
  role?: UserRole[];
  search?: string;
  department?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

// ユーザーソート用の型
export type UserSortField = 
  | 'email'
  | 'displayName'
  | 'role'
  | 'status'
  | 'createdAt'
  | 'lastLoginAt';

export interface UserSort {
  field: UserSortField;
  order: 'asc' | 'desc';
}

// ユーザーリスト表示用の設定
export interface UserListOptions {
  filter?: UserFilter;
  sort?: UserSort;
  page?: number;
  limit?: number;
}