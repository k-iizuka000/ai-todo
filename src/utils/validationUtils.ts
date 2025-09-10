/**
 * Validation utilities for form validation and data integrity
 * Centralized validation logic extracted from TaskForm component
 */

import { validateDateInput } from './dateUtils';
import type { Tag } from '../types/tag';
import type { Priority } from '../types/task';
import type { Project } from '../types/project';
import { validateTagArray, validateTagSelection } from './tagValidation';
import { validateProjectName, validateCreateProject, hasProjectValidationErrors } from './projectValidation';

// Re-export interfaces for validation
export interface ValidationErrors {
  title?: string[];
  description?: string[];
  priority?: string[];
  dueDate?: string[];
  estimatedHours?: string[];
  tags?: string[];
  projectId?: string[];
  general?: string[]; // For cross-field validation errors
  [key: string]: string[] | undefined;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  estimatedHours: string;
  tags: Tag[];
  projectId?: string;
}

// プロジェクト・タグ連携用の拡張フォームデータ型
export interface TaskFormWithCategoriesData extends TaskFormData {
  selectedProject?: Project | null;
  availableProjects?: Project[];
  availableTags?: Tag[];
}

/**
 * Validates the title field
 * @param title - Title string to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateTitle(title: string): string[] | undefined {
  const errors: string[] = [];

  if (!title.trim()) {
    errors.push('タイトルは必須です');
  } else if (title.length > 100) {
    errors.push('タイトルは100文字以内で入力してください');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the description field
 * @param description - Description string to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateDescription(description: string): string[] | undefined {
  const errors: string[] = [];

  if (description.length > 1000) {
    errors.push('説明は1000文字以内で入力してください');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the due date field using enhanced date processing
 * @param dueDate - Date string to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateDueDate(dueDate: string): string[] | undefined {
  const errors: string[] = [];

  // Use the enhanced date validation from dateUtils
  const dateValidation = validateDateInput(dueDate);
  
  if (!dateValidation.isValid && dateValidation.error) {
    errors.push(dateValidation.error);
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the estimated hours field
 * @param estimatedHours - Hours string to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateEstimatedHours(estimatedHours: string): string[] | undefined {
  const errors: string[] = [];

  if (estimatedHours.trim() !== '') {
    const hours = parseFloat(estimatedHours);
    
    if (isNaN(hours)) {
      errors.push('数値を入力してください');
    } else if (hours < 0) {
      errors.push('正の数値を入力してください');
    } else if (hours > 1000) {
      errors.push('見積時間は1000時間以内で入力してください');
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the tags field (enhanced with additional validation)
 * @param tags - Array of tags to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateTags(tags: Tag[]): string[] | undefined {
  // 基本的なvalidationは拡張されたtagValidationユーティリティを使用
  const basicErrors = validateTagArray(tags);
  if (basicErrors) {
    return basicErrors;
  }

  // 追加の整合性チェック
  const errors: string[] = [];

  // タグのカラー重複チェック（警告レベル）
  const colorCounts = new Map<string, number>();
  for (const tag of tags) {
    const color = tag.color?.toLowerCase();
    if (color) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // 同じ色が3つ以上ある場合は警告
  for (const [color, count] of colorCounts.entries()) {
    if (count >= 3) {
      // エラーではなく警告として扱いたい場合は別の仕組みが必要
      // errors.push('同じ色のタグが多数選択されています。識別しやすくするため異なる色の使用を推奨します');
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the project ID field (enhanced)
 * @param projectId - Project ID to validate
 * @param availableProjects - Available projects to validate against
 * @returns Array of error messages or undefined if valid
 */
export function validateProjectId(
  projectId?: string, 
  availableProjects?: Project[]
): string[] | undefined {
  const errors: string[] = [];

  // Project ID is optional, but if provided should be valid format
  if (projectId && typeof projectId !== 'string') {
    errors.push('無効なプロジェクトIDです');
  }

  // プロジェクト存在チェック（利用可能なプロジェクト一覧が提供されている場合）
  if (projectId && availableProjects) {
    const projectExists = availableProjects.some(project => project.id === projectId);
    if (!projectExists) {
      errors.push('選択されたプロジェクトが見つかりません');
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the priority field
 * @param priority - Priority to validate
 * @returns Array of error messages or undefined if valid
 */
export function validatePriority(priority: Priority): string[] | undefined {
  const errors: string[] = [];
  const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'];

  if (!validPriorities.includes(priority)) {
    errors.push('無効な優先度が指定されています');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Performs comprehensive validation of task form data (enhanced)
 * @param formData - Complete task form data to validate
 * @param validationOptions - Additional validation options
 * @returns ValidationErrors object with field-specific errors
 */
export function validateTaskForm(
  formData: TaskFormData | TaskFormWithCategoriesData,
  validationOptions: {
    availableProjects?: Project[];
    requiredTags?: boolean;
    maxTags?: number;
  } = {}
): ValidationErrors {
  const errors: ValidationErrors = {};
  const { availableProjects, requiredTags = false, maxTags = 10 } = validationOptions;

  // Validate each field
  const titleErrors = validateTitle(formData.title);
  if (titleErrors) errors.title = titleErrors;

  const descriptionErrors = validateDescription(formData.description);
  if (descriptionErrors) errors.description = descriptionErrors;

  const dueDateErrors = validateDueDate(formData.dueDate);
  if (dueDateErrors) errors.dueDate = dueDateErrors;

  const estimatedHoursErrors = validateEstimatedHours(formData.estimatedHours);
  if (estimatedHoursErrors) errors.estimatedHours = estimatedHoursErrors;

  // 拡張されたタグvalidation
  const tagSelectionErrors = validateTagSelection(formData.tags, {
    isRequired: requiredTags,
    maxLimit: maxTags
  });
  if (tagSelectionErrors.tags || tagSelectionErrors.required || tagSelectionErrors.maxLimit) {
    const allTagErrors = [
      ...(tagSelectionErrors.tags || []),
      ...(tagSelectionErrors.required || []),
      ...(tagSelectionErrors.maxLimit || [])
    ];
    if (allTagErrors.length > 0) errors.tags = allTagErrors;
  }

  const projectIdErrors = validateProjectId(formData.projectId, availableProjects);
  if (projectIdErrors) errors.projectId = projectIdErrors;

  const priorityErrors = validatePriority(formData.priority);
  if (priorityErrors) errors.priority = priorityErrors;

  // プロジェクト・タグの組み合わせvalidation
  if ('selectedProject' in formData && formData.selectedProject && formData.tags.length > 0) {
    // プロジェクトとタグの整合性チェック（必要に応じて実装）
    // 例：特定のプロジェクトでは特定のタグが必要、など
  }

  return errors;
}

/**
 * Checks if validation errors object contains any errors
 * @param errors - ValidationErrors object to check
 * @returns true if there are no errors, false otherwise
 */
export function isValidationClean(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Gets all error messages from validation errors object as flat array
 * @param errors - ValidationErrors object
 * @returns Array of all error messages
 */
export function getAllErrorMessages(errors: ValidationErrors): string[] {
  const allErrors: string[] = [];

  Object.values(errors).forEach(fieldErrors => {
    if (fieldErrors && Array.isArray(fieldErrors)) {
      allErrors.push(...fieldErrors);
    }
  });

  return allErrors;
}

/**
 * Import helper functions for better organization
 */
export { hasTagSelectionErrors, getAllTagErrorMessages } from './tagValidation';
export { hasProjectValidationErrors, getAllProjectErrorMessages } from './projectValidation';

/**
 * Validates a single field and returns field-specific errors (enhanced)
 * @param field - Field name to validate
 * @param value - Value to validate
 * @param formData - Complete form data for context-dependent validation
 * @param validationOptions - Additional validation options
 * @returns Array of error messages or undefined if valid
 */
export function validateField(
  field: keyof TaskFormData,
  value: any,
  formData?: TaskFormData | TaskFormWithCategoriesData,
  validationOptions: {
    availableProjects?: Project[];
    requiredTags?: boolean;
    maxTags?: number;
  } = {}
): string[] | undefined {
  const { availableProjects, requiredTags = false, maxTags = 10 } = validationOptions;

  switch (field) {
    case 'title':
      return validateTitle(value);
    case 'description':
      return validateDescription(value);
    case 'dueDate':
      return validateDueDate(value);
    case 'estimatedHours':
      return validateEstimatedHours(value);
    case 'tags':
      const tagSelectionErrors = validateTagSelection(value, {
        isRequired: requiredTags,
        maxLimit: maxTags
      });
      if (hasTagSelectionErrors(tagSelectionErrors)) {
        return getAllTagErrorMessages(tagSelectionErrors);
      }
      return undefined;
    case 'projectId':
      return validateProjectId(value, availableProjects);
    case 'priority':
      return validatePriority(value);
    default:
      return undefined;
  }
}

/**
 * Enhanced validation with project-tag integration support
 * @param formData - Task form data with categories
 * @param validationMode - Validation mode (create, update, etc.)
 * @returns Comprehensive validation results
 */
export function validateTaskWithCategories(
  formData: TaskFormWithCategoriesData,
  validationMode: 'create' | 'update' = 'create'
): ValidationErrors {
  const validationOptions = {
    availableProjects: formData.availableProjects,
    requiredTags: false, // Can be configured per business rules
    maxTags: 10
  };

  return validateTaskForm(formData, validationOptions);
}

/**
 * Cross-field validation for project-tag combinations
 * @param projectId - Selected project ID
 * @param tags - Selected tags
 * @param availableProjects - Available projects with metadata
 * @returns Cross-validation errors
 */
export function validateProjectTagIntegration(
  projectId?: string,
  tags: Tag[] = [],
  availableProjects?: Project[]
): string[] {
  const errors: string[] = [];

  // Business logic: If project is selected, validate tag compatibility
  if (projectId && tags.length > 0 && availableProjects) {
    const selectedProject = availableProjects.find(p => p.id === projectId);
    
    if (selectedProject) {
      // Example business rule: Critical projects require at least 2 tags
      if (selectedProject.priority === 'CRITICAL' && tags.length < 2) {
        errors.push('重要度が「クリティカル」のプロジェクトには最低2つのタグが必要です');
      }
      
      // Example: Archived projects should not accept new tasks
      if (selectedProject.isArchived) {
        errors.push('アーカイブされたプロジェクトには新しいタスクを追加できません');
      }
    }
  }

  return errors;
}