/**
 * Validation utilities for form validation and data integrity
 * Centralized validation logic extracted from TaskForm component
 */

import { validateDateInput } from './dateUtils';
import type { Tag } from '../types/tag';
import type { Priority } from '../types/task';

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
 * Validates the tags field
 * @param tags - Array of tags to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateTags(tags: Tag[]): string[] | undefined {
  const errors: string[] = [];

  if (tags.length > 10) {
    errors.push('タグは10個以内で設定してください');
  }

  // Validate individual tag structure
  for (const tag of tags) {
    if (!tag.id || typeof tag.id !== 'string') {
      errors.push('無効なタグが含まれています');
      break;
    }
    if (!tag.name || typeof tag.name !== 'string' || tag.name.trim() === '') {
      errors.push('タグ名が無効です');
      break;
    }
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Validates the project ID field
 * @param projectId - Project ID to validate
 * @returns Array of error messages or undefined if valid
 */
export function validateProjectId(projectId?: string): string[] | undefined {
  const errors: string[] = [];

  // Project ID is optional, but if provided should be valid format
  if (projectId && typeof projectId !== 'string') {
    errors.push('無効なプロジェクトIDです');
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
  const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent', 'critical'];

  if (!validPriorities.includes(priority)) {
    errors.push('無効な優先度が指定されています');
  }

  return errors.length > 0 ? errors : undefined;
}

/**
 * Performs comprehensive validation of task form data
 * @param formData - Complete task form data to validate
 * @returns ValidationErrors object with field-specific errors
 */
export function validateTaskForm(formData: TaskFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate each field
  const titleErrors = validateTitle(formData.title);
  if (titleErrors) errors.title = titleErrors;

  const descriptionErrors = validateDescription(formData.description);
  if (descriptionErrors) errors.description = descriptionErrors;

  const dueDateErrors = validateDueDate(formData.dueDate);
  if (dueDateErrors) errors.dueDate = dueDateErrors;

  const estimatedHoursErrors = validateEstimatedHours(formData.estimatedHours);
  if (estimatedHoursErrors) errors.estimatedHours = estimatedHoursErrors;

  const tagsErrors = validateTags(formData.tags);
  if (tagsErrors) errors.tags = tagsErrors;

  const projectIdErrors = validateProjectId(formData.projectId);
  if (projectIdErrors) errors.projectId = projectIdErrors;

  const priorityErrors = validatePriority(formData.priority);
  if (priorityErrors) errors.priority = priorityErrors;

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
 * Validates a single field and returns field-specific errors
 * @param field - Field name to validate
 * @param value - Value to validate
 * @param formData - Complete form data for context-dependent validation
 * @returns Array of error messages or undefined if valid
 */
export function validateField(
  field: keyof TaskFormData,
  value: any,
  formData?: TaskFormData
): string[] | undefined {
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
      return validateTags(value);
    case 'projectId':
      return validateProjectId(value);
    case 'priority':
      return validatePriority(value);
    default:
      return undefined;
  }
}