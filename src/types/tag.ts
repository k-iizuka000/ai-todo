/**
 * タグ管理システムの型定義
 */

export interface Tag {
  id: string;              // 一意のID
  name: string;            // タグ名（最大20文字）
  color: string;           // カラーコード（#RRGGBB形式）
  usageCount?: number;     // 使用回数
  createdAt?: Date;        // 作成日時
  updatedAt?: Date;        // 更新日時
}

// Utility Types の活用
export type CreateTagInput = Pick<Tag, 'name' | 'color'>;
export type UpdateTagInput = Partial<CreateTagInput>;
export type TagWithoutDates = Omit<Tag, 'createdAt' | 'updatedAt'>;
export type RequiredTag = Required<Tag>;

// タグとタスク数の統計情報を含む型
export interface TagWithTaskCount extends Tag {
  taskCount: number;          // 関連タスク数
  completedTaskCount?: number; // 完了済みタスク数
  activeTaskCount?: number;   // アクティブタスク数
}

export interface TagFilter {
  search?: string;
  sortBy?: 'name' | 'usageCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// バリデーション結果の型
export interface TagValidationResult {
  isValid: boolean;
  errors: string[];
}

// タグ名のバリデーション定数
export const TAG_VALIDATION_RULES = {
  MAX_LENGTH: 20,
  FORBIDDEN_CHARS: /[<>&"'`]/g,  // HTML特殊文字を禁止
  FORBIDDEN_PATTERNS: /^\s|\s$|^\.|\.$/g,  // 先頭末尾空白、先頭末尾ドットを禁止
} as const;

// タグ名バリデーション関数
export const validateTagName = (name: string): TagValidationResult => {
  const errors: string[] = [];

  // 空文字チェック
  if (!name || name.trim().length === 0) {
    errors.push('タグ名を入力してください');
    return { isValid: false, errors };
  }

  // 長さチェック
  if (name.length > TAG_VALIDATION_RULES.MAX_LENGTH) {
    errors.push(`タグ名は${TAG_VALIDATION_RULES.MAX_LENGTH}文字以内で入力してください`);
  }

  // 禁止文字チェック
  if (TAG_VALIDATION_RULES.FORBIDDEN_CHARS.test(name)) {
    errors.push('タグ名に使用できない文字が含まれています（< > & " \' `）');
  }

  // 禁止パターンチェック（先頭末尾の空白、ドット）
  if (TAG_VALIDATION_RULES.FORBIDDEN_PATTERNS.test(name)) {
    errors.push('タグ名の先頭・末尾に空白やドットは使用できません');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// タグ全体のバリデーション関数
export const validateTag = (tag: CreateTagInput): TagValidationResult => {
  const nameValidation = validateTagName(tag.name);
  const errors = [...nameValidation.errors];

  // カラーコードチェック
  if (!tag.color || !/^#[0-9A-Fa-f]{6}$/.test(tag.color)) {
    errors.push('有効なカラーコード（#RRGGBB形式）を指定してください');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// タグカラーのプリセット
export const TAG_PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

export type TagPresetColor = typeof TAG_PRESET_COLORS[number];