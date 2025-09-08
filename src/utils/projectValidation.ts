/**
 * プロジェクトvalidationユーティリティ
 * プロジェクト関連のデータ品質保証とエラー防止
 */

import type { Project, ProjectStatus, ProjectPriority, CreateProjectInput, UpdateProjectInput } from '../types/project';

// プロジェクトvalidationエラーの型定義
export interface ProjectValidationErrors {
  name?: string[];
  description?: string[];
  status?: string[];
  priority?: string[];
  color?: string[];
  icon?: string[];
  startDate?: string[];
  endDate?: string[];
  deadline?: string[];
  budget?: string[];
  tagIds?: string[];
  memberIds?: string[];
  general?: string[];
  [key: string]: string[] | undefined;
}

/**
 * プロジェクト名のvalidation
 */
export function validateProjectName(name: string): string[] | undefined {
  const errors: string[] = [];

  if (!name || !name.trim()) {
    errors.push('プロジェクト名は必須です');
  } else if (name.length > 100) {
    errors.push('プロジェクト名は100文字以内で入力してください');
  } else if (name.length < 2) {
    errors.push('プロジェクト名は2文字以上で入力してください');
  }

  // 禁止文字チェック（制御文字や特殊文字）
  if (/[\x00-\x1f\x7f]/.test(name)) {
    errors.push('プロジェクト名に使用できない文字が含まれています');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト説明のvalidation
 */
export function validateProjectDescription(description?: string): string[] | undefined {
  const errors: string[] = [];

  if (description && description.length > 1000) {
    errors.push('プロジェクト説明は1000文字以内で入力してください');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト状態のvalidation
 */
export function validateProjectStatus(status: ProjectStatus): string[] | undefined {
  const errors: string[] = [];
  const validStatuses: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    errors.push('無効なプロジェクト状態が指定されています');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト優先度のvalidation
 */
export function validateProjectPriority(priority: ProjectPriority): string[] | undefined {
  const errors: string[] = [];
  const validPriorities: ProjectPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  if (!validPriorities.includes(priority)) {
    errors.push('無効なプロジェクト優先度が指定されています');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクトカラーのvalidation
 */
export function validateProjectColor(color: string): string[] | undefined {
  const errors: string[] = [];

  if (!color) {
    errors.push('プロジェクトカラーは必須です');
  } else if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    errors.push('有効なカラーコード（#RRGGBB形式）を指定してください');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト予算のvalidation
 */
export function validateProjectBudget(budget?: number): string[] | undefined {
  const errors: string[] = [];

  if (budget !== undefined) {
    if (budget < 0) {
      errors.push('予算は正の数値で入力してください');
    } else if (budget > 100000000) {
      errors.push('予算は1億円以内で入力してください');
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト日付のvalidation（開始日・終了日・締切日）
 */
export function validateProjectDates(startDate?: Date, endDate?: Date, deadline?: Date): string[] | undefined {
  const errors: string[] = [];

  // 開始日と終了日の関係チェック
  if (startDate && endDate && startDate >= endDate) {
    errors.push('終了日は開始日より後の日付を指定してください');
  }

  // 締切日のチェック
  if (deadline) {
    if (startDate && deadline < startDate) {
      errors.push('締切日は開始日以降の日付を指定してください');
    }
    if (endDate && deadline > endDate) {
      errors.push('締切日は終了日以前の日付を指定してください');
    }
  }

  // 過去日のチェック（新規作成時のみ適用したい場合）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (startDate && startDate < today) {
    // 警告レベル（エラーにはしない）
    // errors.push('開始日は今日以降の日付を推奨します');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクトタグIDs配列のvalidation
 */
export function validateProjectTagIds(tagIds?: string[]): string[] | undefined {
  const errors: string[] = [];

  if (tagIds) {
    if (tagIds.length > 10) {
      errors.push('プロジェクトに設定できるタグは10個以内です');
    }

    // 重複チェック
    const uniqueTagIds = new Set(tagIds);
    if (uniqueTagIds.size !== tagIds.length) {
      errors.push('重複するタグが選択されています');
    }

    // 各タグIDのフォーマットチェック
    for (const tagId of tagIds) {
      if (!tagId || typeof tagId !== 'string' || tagId.trim() === '') {
        errors.push('無効なタグIDが含まれています');
        break;
      }
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクトメンバーIDs配列のvalidation
 */
export function validateProjectMemberIds(memberIds?: string[]): string[] | undefined {
  const errors: string[] = [];

  if (memberIds) {
    if (memberIds.length > 100) {
      errors.push('プロジェクトメンバーは100人以内で設定してください');
    }

    // 重複チェック
    const uniqueMemberIds = new Set(memberIds);
    if (uniqueMemberIds.size !== memberIds.length) {
      errors.push('重複するメンバーが選択されています');
    }

    // 各メンバーIDのフォーマットチェック
    for (const memberId of memberIds) {
      if (!memberId || typeof memberId !== 'string' || memberId.trim() === '') {
        errors.push('無効なメンバーIDが含まれています');
        break;
      }
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * プロジェクト作成データの包括的validation
 */
export function validateCreateProject(projectData: CreateProjectInput): ProjectValidationErrors {
  const errors: ProjectValidationErrors = {};

  // 各フィールドのvalidation
  const nameErrors = validateProjectName(projectData.name);
  if (nameErrors) errors.name = nameErrors;

  const descriptionErrors = validateProjectDescription(projectData.description);
  if (descriptionErrors) errors.description = descriptionErrors;

  if (projectData.status) {
    const statusErrors = validateProjectStatus(projectData.status);
    if (statusErrors) errors.status = statusErrors;
  }

  if (projectData.priority) {
    const priorityErrors = validateProjectPriority(projectData.priority);
    if (priorityErrors) errors.priority = priorityErrors;
  }

  if (projectData.color) {
    const colorErrors = validateProjectColor(projectData.color);
    if (colorErrors) errors.color = colorErrors;
  }

  const budgetErrors = validateProjectBudget(projectData.budget);
  if (budgetErrors) errors.budget = budgetErrors;

  const dateErrors = validateProjectDates(
    projectData.startDate,
    projectData.endDate,
    projectData.deadline
  );
  if (dateErrors) errors.general = dateErrors;

  const tagIdErrors = validateProjectTagIds(projectData.tagIds);
  if (tagIdErrors) errors.tagIds = tagIdErrors;

  const memberIdErrors = validateProjectMemberIds(projectData.memberIds);
  if (memberIdErrors) errors.memberIds = memberIdErrors;

  return errors;
}

/**
 * プロジェクト更新データの包括的validation
 */
export function validateUpdateProject(projectData: UpdateProjectInput): ProjectValidationErrors {
  const errors: ProjectValidationErrors = {};

  // 各フィールドのvalidation（更新データなので存在する場合のみチェック）
  if (projectData.name !== undefined) {
    const nameErrors = validateProjectName(projectData.name);
    if (nameErrors) errors.name = nameErrors;
  }

  if (projectData.description !== undefined) {
    const descriptionErrors = validateProjectDescription(projectData.description);
    if (descriptionErrors) errors.description = descriptionErrors;
  }

  if (projectData.status) {
    const statusErrors = validateProjectStatus(projectData.status);
    if (statusErrors) errors.status = statusErrors;
  }

  if (projectData.priority) {
    const priorityErrors = validateProjectPriority(projectData.priority);
    if (priorityErrors) errors.priority = priorityErrors;
  }

  if (projectData.color) {
    const colorErrors = validateProjectColor(projectData.color);
    if (colorErrors) errors.color = colorErrors;
  }

  if (projectData.budget !== undefined) {
    const budgetErrors = validateProjectBudget(projectData.budget);
    if (budgetErrors) errors.budget = budgetErrors;
  }

  // 日付のvalidation（部分的な更新でも整合性をチェック）
  const dateErrors = validateProjectDates(
    projectData.startDate,
    projectData.endDate,
    projectData.deadline
  );
  if (dateErrors) errors.general = dateErrors;

  if (projectData.tagIds !== undefined) {
    const tagIdErrors = validateProjectTagIds(projectData.tagIds);
    if (tagIdErrors) errors.tagIds = tagIdErrors;
  }

  if (projectData.memberIds !== undefined) {
    const memberIdErrors = validateProjectMemberIds(projectData.memberIds);
    if (memberIdErrors) errors.memberIds = memberIdErrors;
  }

  return errors;
}

/**
 * ValidationErrorsオブジェクトにエラーが存在するかチェック
 */
export function hasProjectValidationErrors(errors: ProjectValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * すべてのプロジェクトvalidationエラーを平坦な配列で取得
 */
export function getAllProjectErrorMessages(errors: ProjectValidationErrors): string[] {
  const allErrors: string[] = [];

  Object.values(errors).forEach(fieldErrors => {
    if (fieldErrors && Array.isArray(fieldErrors)) {
      allErrors.push(...fieldErrors);
    }
  });

  return allErrors;
}

/**
 * プロジェクトの単一フィールドvalidation
 */
export function validateProjectField(
  field: keyof CreateProjectInput,
  value: any
): string[] | undefined {
  switch (field) {
    case 'name':
      return validateProjectName(value);
    case 'description':
      return validateProjectDescription(value);
    case 'status':
      return validateProjectStatus(value);
    case 'priority':
      return validateProjectPriority(value);
    case 'color':
      return validateProjectColor(value);
    case 'budget':
      return validateProjectBudget(value);
    case 'tagIds':
      return validateProjectTagIds(value);
    case 'memberIds':
      return validateProjectMemberIds(value);
    default:
      return undefined;
  }
}