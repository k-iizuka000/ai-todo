/**
 * Selector utility functions for visual feedback and display management
 * Provides reusable utilities for Project and Tag selectors
 */

import { Project } from '../types/project';
import { Tag } from '../types/tag';

// Visual states for selectors
export type SelectorState = 'default' | 'selected' | 'open' | 'loading' | 'error';

// Display update options
export interface DisplayUpdateOptions {
  project?: Project | null;
  projectId?: string | null;
  tags?: Tag[];
  isLoading?: boolean;
  error?: string;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
}

/**
 * Updates button display text based on current state
 * @param options - Display update configuration
 * @returns Display text string
 */
export function updateButtonDisplay(options: DisplayUpdateOptions): string {
  const {
    project,
    projectId,
    tags,
    isLoading = false,
    error,
    allowNone = false,
    noneLabel = 'なし',
    placeholder = '選択してください'
  } = options;

  // Loading state
  if (isLoading) {
    return '読み込み中...';
  }

  // Error state
  if (error) {
    return 'エラーが発生しました';
  }

  // Project display logic
  if (project !== undefined) {
    if (project) {
      return project.name;
    }
    if (projectId === null && allowNone) {
      return noneLabel;
    }
    return placeholder;
  }

  // Tag display logic
  if (tags !== undefined) {
    if (tags.length === 0) {
      return 'タグを選択';
    }
    if (tags.length === 1) {
      return tags[0].name;
    }
    if (tags.length <= 3) {
      return tags.map(tag => tag.name).join(', ');
    }
    return `${tags.slice(0, 2).map(tag => tag.name).join(', ')} 他${tags.length - 2}個`;
  }

  return placeholder;
}

/**
 * Determines the current visual state of a selector
 * @param options - State determination options
 * @returns Current selector state
 */
export function getSelectorState(options: {
  isLoading?: boolean;
  error?: string;
  hasSelection?: boolean;
  isOpen?: boolean;
}): SelectorState {
  const { isLoading = false, error, hasSelection = false, isOpen = false } = options;

  if (isLoading) return 'loading';
  if (error) return 'error';
  if (hasSelection) return 'selected';
  if (isOpen) return 'open';
  return 'default';
}

/**
 * Generates CSS classes for selection state visualization
 * @param state - Current selector state
 * @returns CSS class string
 */
export function showSelectionState(state: SelectorState): string {
  const baseClasses = 'transition-all duration-200 ease-in-out';
  
  switch (state) {
    case 'selected':
      return `${baseClasses} border-primary/30 bg-primary/5 text-primary`;
    case 'open':
      return `${baseClasses} ring-2 ring-primary/20 border-primary/50`;
    case 'loading':
      return `${baseClasses} border-blue-300 bg-blue-50/50 text-blue-600 cursor-wait`;
    case 'error':
      return `${baseClasses} border-red-300 bg-red-50/50 text-red-600`;
    case 'default':
    default:
      return `${baseClasses} border-gray-300 hover:border-gray-400`;
  }
}

/**
 * Generates appropriate icon classes based on selector state
 * @param state - Current selector state
 * @returns Icon CSS classes
 */
export function getStateIcon(state: SelectorState): string {
  switch (state) {
    case 'selected':
      return 'text-primary';
    case 'loading':
      return 'text-blue-500 animate-spin';
    case 'error':
      return 'text-red-500';
    case 'open':
      return 'text-primary rotate-180';
    case 'default':
    default:
      return 'text-gray-500';
  }
}

/**
 * Creates accessible ARIA attributes for selectors
 * @param options - ARIA configuration options
 * @returns ARIA attributes object
 */
export function getAriaAttributes(options: {
  state: SelectorState;
  isExpanded?: boolean;
  hasSelection?: boolean;
  errorMessage?: string;
  selectionCount?: number;
}) {
  const { state, isExpanded = false, hasSelection = false, errorMessage, selectionCount } = options;

  const attributes: Record<string, string | boolean | undefined> = {
    role: 'combobox',
    'aria-expanded': isExpanded,
    'aria-haspopup': 'listbox'
  };

  if (state === 'error' && errorMessage) {
    attributes['aria-describedby'] = 'selector-error';
    attributes['aria-invalid'] = true;
  }

  if (hasSelection && selectionCount !== undefined) {
    attributes['aria-label'] = `${selectionCount}個選択済み`;
  }

  if (state === 'loading') {
    attributes['aria-busy'] = true;
  }

  return attributes;
}

/**
 * Validates selector input and provides feedback
 * @param options - Validation options
 * @returns Validation result
 */
export interface SelectorValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSelectorInput(options: {
  required?: boolean;
  maxItems?: number;
  minItems?: number;
  selectedItems?: number;
  inputValue?: string;
  type: 'project' | 'tag';
}): SelectorValidation {
  const {
    required = false,
    maxItems,
    minItems = 0,
    selectedItems = 0,
    inputValue = '',
    type
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Required validation
  if (required && selectedItems === 0) {
    errors.push(`${type === 'project' ? 'プロジェクト' : 'タグ'}の選択は必須です`);
  }

  // Min items validation
  if (selectedItems < minItems) {
    errors.push(`最低${minItems}個の${type === 'project' ? 'プロジェクト' : 'タグ'}を選択してください`);
  }

  // Max items validation
  if (maxItems && selectedItems > maxItems) {
    errors.push(`${type === 'project' ? 'プロジェクト' : 'タグ'}は最大${maxItems}個まで選択できます`);
  }

  // Input value validation
  if (inputValue.length > 100) {
    errors.push('入力値が長すぎます（100文字以内）');
  }

  // Warning for approaching limits
  if (maxItems && selectedItems >= maxItems * 0.8) {
    warnings.push(`選択上限（${maxItems}個）に近づいています`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formats display text for multiple selections with proper truncation
 * @param items - Array of items to display
 * @param maxDisplay - Maximum items to show before truncation
 * @param getDisplayName - Function to extract display name from item
 * @returns Formatted display string
 */
export function formatMultipleSelection<T>(
  items: T[],
  maxDisplay: number = 3,
  getDisplayName: (item: T) => string
): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length <= maxDisplay) {
    return items.map(getDisplayName).join(', ');
  }

  const displayItems = items.slice(0, maxDisplay - 1);
  const remainingCount = items.length - (maxDisplay - 1);
  
  return `${displayItems.map(getDisplayName).join(', ')}, 他${remainingCount}個`;
}

/**
 * Creates a debounced search function for selector filtering
 * @param callback - Search callback function
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced search function
 */
export function createDebouncedSearch<T>(
  callback: (query: string) => Promise<T[]> | T[],
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (query: string): Promise<T[]> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const results = await callback(query);
          resolve(results);
        } catch (error) {
          console.error('Search error:', error);
          resolve([]);
        }
      }, delay);
    });
  };
}