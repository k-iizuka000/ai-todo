/**
 * Error Handler Hook
 * エラー処理とユーザーフィードバックの統合管理
 */

import { useCallback } from 'react';
import { useTaskStore } from '../stores/taskStoreHybrid';
import { ApiError } from '../api/client';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const { setError, clearError } = useTaskStore();

  const handleError = useCallback((
    error: unknown,
    context: string = 'Unknown',
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    let errorMessage = fallbackMessage;
    let errorCode = 'UNKNOWN_ERROR';

    // Parse different error types
    if (error instanceof ApiError) {
      errorMessage = error.message;
      errorCode = error.code;
      
      if (logError) {
        console.error(`API Error [${context}]:`, {
          code: error.code,
          message: error.message,
          status: error.status,
          details: error.details
        });
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      
      if (logError) {
        console.error(`Error [${context}]:`, error);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
      
      if (logError) {
        console.error(`String Error [${context}]:`, error);
      }
    } else {
      if (logError) {
        console.error(`Unknown Error [${context}]:`, error);
      }
    }

    // Show user notification
    if (showNotification) {
      setError(`${context}: ${errorMessage}`);
      
      // Auto clear error after 10 seconds
      setTimeout(() => {
        clearError();
      }, 10000);
    }

    // Return parsed error info
    return {
      message: errorMessage,
      code: errorCode,
      context
    };
  }, [setError, clearError]);

  const handleApiError = useCallback((error: unknown, operation: string) => {
    return handleError(error, operation, {
      showNotification: true,
      logError: true
    });
  }, [handleError]);

  const handleNetworkError = useCallback((error: unknown) => {
    return handleError(error, 'Network Connection', {
      showNotification: true,
      logError: true,
      fallbackMessage: 'Network connection failed. Please check your internet connection.'
    });
  }, [handleError]);

  const handleValidationError = useCallback((error: unknown) => {
    return handleError(error, 'Validation', {
      showNotification: true,
      logError: false, // Validation errors are user errors, not system errors
      fallbackMessage: 'Please check your input and try again.'
    });
  }, [handleError]);

  // Specific handlers for common operations
  const handleTaskCreateError = useCallback((error: unknown) => {
    return handleApiError(error, 'Task Creation Failed');
  }, [handleApiError]);

  const handleTaskUpdateError = useCallback((error: unknown) => {
    return handleApiError(error, 'Task Update Failed');
  }, [handleApiError]);

  const handleTaskDeleteError = useCallback((error: unknown) => {
    return handleApiError(error, 'Task Deletion Failed');
  }, [handleApiError]);

  const handleTaskFetchError = useCallback((error: unknown) => {
    return handleApiError(error, 'Failed to Load Tasks');
  }, [handleApiError]);

  // Retry with error handling
  const withErrorHandling = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    context: string,
    maxRetries: number = 3
  ) => {
    return async (...args: T): Promise<R> => {
      let lastError: unknown;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;
          
          // Handle specific retry conditions
          if (error instanceof ApiError) {
            // Don't retry for client errors (4xx)
            if (error.status >= 400 && error.status < 500) {
              break;
            }
            
            // Don't retry for validation errors
            if (error.code === 'VALIDATION_ERROR') {
              break;
            }
          }
          
          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed
      handleError(lastError, `${context} (after ${maxRetries} attempts)`);
      throw lastError;
    };
  }, [handleError]);

  return {
    handleError,
    handleApiError,
    handleNetworkError,
    handleValidationError,
    handleTaskCreateError,
    handleTaskUpdateError,
    handleTaskDeleteError,
    handleTaskFetchError,
    withErrorHandling,
    clearError
  };
}

// Error types for better error categorization
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return ErrorCategory.NETWORK;
    if (error.code === 'VALIDATION_ERROR') return ErrorCategory.VALIDATION;
    if (error.status === 401) return ErrorCategory.AUTHENTICATION;
    if (error.status === 403) return ErrorCategory.AUTHORIZATION;
    if (error.status === 404) return ErrorCategory.NOT_FOUND;
    if (error.status >= 500) return ErrorCategory.SERVER;
    if (error.status >= 400) return ErrorCategory.CLIENT;
  }
  
  return ErrorCategory.UNKNOWN;
}

// Error recovery suggestions
export function getErrorRecoveryAction(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Please check your internet connection and try again.';
    case ErrorCategory.VALIDATION:
      return 'Please check your input and correct any errors.';
    case ErrorCategory.AUTHENTICATION:
      return 'Please log in again.';
    case ErrorCategory.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    case ErrorCategory.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorCategory.SERVER:
      return 'Server error occurred. Please try again later.';
    default:
      return 'Please try again or contact support if the problem persists.';
  }
}