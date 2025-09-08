/**
 * タグバリデーション関数
 * 設計書グループ3: TagCreateModal/TagEditModal用
 */

import type { Tag, TagValidationResult, CreateTagInput, UpdateTagInput, TagWithTaskCount } from '@/types/tag';

/**
 * タグ名のバリデーション（基本バージョン）
 * @param name タグ名
 * @param existingTags 既存のタグ一覧
 * @param currentTagId 編集時の現在のタグID（重複チェック除外用）
 * @returns バリデーション結果
 */
export const validateTagName = (
  name: string, 
  existingTags: Tag[], 
  currentTagId?: string
): TagValidationResult => {
  const errors: string[] = [];
  
  // 文字数制限（1-20文字）
  if (name.length < 1) {
    errors.push('タグ名を入力してください');
  } else if (name.length > 20) {
    errors.push('タグ名は20文字以内で入力してください');
  }
  
  // 重複チェック（大文字小文字を区別しない）
  const duplicateTag = existingTags.find(tag => 
    tag.name.toLowerCase() === name.toLowerCase() && 
    tag.id !== currentTagId
  );
  if (duplicateTag) {
    errors.push('このタグ名は既に使用されています');
  }
  
  // 禁止文字のチェック（XSS対策）
  const forbiddenChars = /<|>|&|"|'/;
  if (forbiddenChars.test(name)) {
    errors.push('使用できない文字が含まれています（<, >, &, ", \' は使用できません）');
  }
  
  // 先頭・末尾の空白チェック
  if (name !== name.trim()) {
    errors.push('タグ名の先頭・末尾に空白は使用できません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * カラーコードのバリデーション
 * @param color カラーコード（#RRGGBB形式）
 * @returns バリデーション結果
 */
export const validateTagColor = (color: string): TagValidationResult => {
  const errors: string[] = [];
  
  // HEXカラーコード形式のチェック
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexColorRegex.test(color)) {
    errors.push('カラーコードは#RRGGBBの形式で入力してください（例: #FF0000）');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * タグデータ全体のバリデーション（基本バージョン）
 * @param name タグ名
 * @param color カラーコード
 * @param existingTags 既存のタグ一覧
 * @param currentTagId 編集時の現在のタグID
 * @returns バリデーション結果
 */
export const validateTagData = (
  name: string,
  color: string,
  existingTags: Tag[],
  currentTagId?: string
): TagValidationResult => {
  const nameValidation = validateTagName(name, existingTags, currentTagId);
  const colorValidation = validateTagColor(color);
  
  const allErrors = [...nameValidation.errors, ...colorValidation.errors];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * 文字列から有効なHEXカラーコードを抽出する
 * @param input 入力文字列
 * @returns 有効なHEXカラーコードまたはnull
 */
export const extractValidHexColor = (input: string): string | null => {
  // #なしで入力された場合は自動で追加
  const withHash = input.startsWith('#') ? input : `#${input}`;
  
  // 3桁の場合は6桁に拡張（例: #FFF -> #FFFFFF）
  const hexColorRegex = /^#[0-9A-Fa-f]{3}$/;
  if (hexColorRegex.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  
  // 6桁の場合はそのまま
  const fullHexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (fullHexRegex.test(withHash)) {
    return withHash.toUpperCase();
  }
  
  return null;
};

/**
 * 色の明度を計算してテキスト色を決定する
 * @param hexColor HEXカラーコード
 * @returns 'white' | 'black'
 */
export const getTextColorForBackground = (hexColor: string): 'white' | 'black' => {
  // HEXカラーコードからRGB値を抽出
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // 明度を計算（ITU-R BT.709 係数使用）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // 明度が0.5以上なら黒文字、未満なら白文字
  return luminance > 0.5 ? 'black' : 'white';
};

/**
 * タグ名のサニタイズ
 * @param name タグ名
 * @returns サニタイズされたタグ名
 */
export const sanitizeTagName = (name: string): string => {
  return name
    .trim()
    .replace(/[<>&"']/g, '') // 危険な文字を削除
    .replace(/\s+/g, ' '); // 連続する空白を1つにまとめる
};

// ==============================
// 拡張機能: タグ配列と選択のvalidation
// ==============================

// タグ配列validationエラーの型定義
export interface TagArrayValidationErrors {
  tags?: string[];
  tagIds?: string[];
  duplicates?: string[];
  general?: string[];
  [key: string]: string[] | undefined;
}

// タグ選択・validationエラー
export interface TagSelectionValidationErrors extends TagArrayValidationErrors {
  maxLimit?: string[];
  required?: string[];
  permission?: string[];
}

/**
 * タグ配列の包括的validation
 */
export function validateTagArray(tags: Tag[]): string[] | undefined {
  const errors: string[] = [];

  if (!Array.isArray(tags)) {
    errors.push('タグは配列形式で指定してください');
    return errors;
  }

  if (tags.length > 10) {
    errors.push('タグは10個以内で設定してください');
  }

  // 重複チェック（ID・名前両方）
  const tagIds = new Set<string>();
  const tagNames = new Set<string>();

  for (const tag of tags) {
    // タグ構造の基本チェック
    if (!tag.id || typeof tag.id !== 'string') {
      errors.push('無効なタグIDが含まれています');
      break;
    }

    if (!tag.name || typeof tag.name !== 'string') {
      errors.push('無効なタグ名が含まれています');
      break;
    }

    // 重複チェック
    if (tagIds.has(tag.id)) {
      errors.push(`重複するタグ「${tag.name}」が選択されています`);
    }
    if (tagNames.has(tag.name.toLowerCase())) {
      errors.push(`同じ名前のタグ「${tag.name}」が複数選択されています`);
    }

    tagIds.add(tag.id);
    tagNames.add(tag.name.toLowerCase());

    // 各タグの個別validation
    if (tag.color) {
      const colorValidation = validateTagColor(tag.color);
      if (!colorValidation.isValid) {
        errors.push(`タグ「${tag.name}」: ${colorValidation.errors.join(', ')}`);
      }
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * タグID配列のvalidation（文字列配列）
 */
export function validateTagIdArray(tagIds: string[]): string[] | undefined {
  const errors: string[] = [];

  if (!Array.isArray(tagIds)) {
    errors.push('タグIDは配列形式で指定してください');
    return errors;
  }

  if (tagIds.length > 10) {
    errors.push('タグは10個以内で設定してください');
  }

  // 重複チェック
  const uniqueTagIds = new Set(tagIds);
  if (uniqueTagIds.size !== tagIds.length) {
    errors.push('重複するタグが選択されています');
  }

  // 各タグIDの形式チェック
  for (const tagId of tagIds) {
    if (!tagId || typeof tagId !== 'string' || tagId.trim() === '') {
      errors.push('無効なタグIDが含まれています');
      break;
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * 必須タグのvalidation
 */
export function validateRequiredTags(tags: Tag[], isRequired: boolean = false): string[] | undefined {
  const errors: string[] = [];

  if (isRequired && (!tags || tags.length === 0)) {
    errors.push('少なくとも1つのタグを選択してください');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * タグと関連タスクの整合性validation
 */
export function validateTagTaskConsistency(
  tags: Tag[],
  existingTaskTags?: TagWithTaskCount[]
): string[] | undefined {
  const errors: string[] = [];

  if (!existingTaskTags || existingTaskTags.length === 0) {
    return undefined;
  }

  // 使用中タグの削除チェック
  const newTagIds = new Set(tags.map(tag => tag.id));
  const tagsWithTasks = existingTaskTags.filter(tag => tag.taskCount > 0);

  for (const usedTag of tagsWithTasks) {
    if (!newTagIds.has(usedTag.id)) {
      errors.push(
        `タグ「${usedTag.name}」は${usedTag.taskCount}個のタスクで使用中のため削除できません`
      );
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * タグの権限チェック（例：ユーザーがそのタグを使用できるか）
 */
export function validateTagPermissions(
  tags: Tag[],
  allowedTagIds?: string[]
): string[] | undefined {
  const errors: string[] = [];

  if (!allowedTagIds) {
    return undefined;
  }

  const allowedSet = new Set(allowedTagIds);
  
  for (const tag of tags) {
    if (!allowedSet.has(tag.id)) {
      errors.push(`タグ「${tag.name}」を使用する権限がありません`);
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * タグ選択の包括的validation
 */
export function validateTagSelection(
  selectedTags: Tag[],
  options: {
    isRequired?: boolean;
    maxLimit?: number;
    allowedTagIds?: string[];
    existingTaskTags?: TagWithTaskCount[];
  } = {}
): TagSelectionValidationErrors {
  const errors: TagSelectionValidationErrors = {};
  const { isRequired = false, maxLimit = 10, allowedTagIds, existingTaskTags } = options;

  // 基本的なタグ配列validation
  const arrayErrors = validateTagArray(selectedTags);
  if (arrayErrors) errors.tags = arrayErrors;

  // 必須チェック
  const requiredErrors = validateRequiredTags(selectedTags, isRequired);
  if (requiredErrors) errors.required = requiredErrors;

  // 最大数制限チェック（カスタム制限）
  if (maxLimit && selectedTags.length > maxLimit) {
    errors.maxLimit = [`タグは${maxLimit}個以内で設定してください`];
  }

  // 権限チェック
  const permissionErrors = validateTagPermissions(selectedTags, allowedTagIds);
  if (permissionErrors) errors.permission = permissionErrors;

  // 既存タスクとの整合性チェック
  const consistencyErrors = validateTagTaskConsistency(selectedTags, existingTaskTags);
  if (consistencyErrors) errors.general = consistencyErrors;

  return errors;
}

/**
 * TagSelectionValidationErrorsにエラーが存在するかチェック
 */
export function hasTagSelectionErrors(errors: TagSelectionValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * すべてのタグvalidationエラーを平均な配列で取得
 */
export function getAllTagErrorMessages(errors: TagSelectionValidationErrors): string[] {
  const allErrors: string[] = [];

  Object.values(errors).forEach(fieldErrors => {
    if (fieldErrors && Array.isArray(fieldErrors)) {
      allErrors.push(...fieldErrors);
    }
  });

  return allErrors;
}