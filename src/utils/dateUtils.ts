/**
 * Date processing utilities for safe date handling
 * Eliminates "TypeError: dueDate.getTime is not a function" errors
 */

export interface DateProcessingResult {
  isValid: boolean;
  date?: Date;
  error?: string;
  originalInput: string | Date | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Safely parses date input from various sources (string, Date, undefined)
 * @param dateInput - Input that may be a string, Date object, or undefined
 * @returns DateProcessingResult with validation status and converted date
 */
export function safeParseDate(dateInput: string | Date | undefined): DateProcessingResult {
  const result: DateProcessingResult = {
    isValid: false,
    originalInput: dateInput
  };

  // Handle undefined or null inputs
  if (dateInput === undefined || dateInput === null) {
    result.isValid = true; // undefined is valid (optional field)
    return result;
  }

  // Handle empty string inputs
  if (typeof dateInput === 'string' && dateInput.trim() === '') {
    result.isValid = true; // empty string is valid (optional field)
    return result;
  }

  // Handle Date object inputs
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      result.error = '無効な日付オブジェクトです';
      return result;
    }
    result.isValid = true;
    result.date = dateInput;
    return result;
  }

  // Handle string inputs
  if (typeof dateInput === 'string') {
    try {
      const parsedDate = new Date(dateInput);
      
      if (isNaN(parsedDate.getTime())) {
        result.error = '日付形式が無効です。YYYY-MM-DD形式で入力してください';
        return result;
      }

      result.isValid = true;
      result.date = parsedDate;
      return result;
    } catch (error) {
      result.error = '日付の解析中にエラーが発生しました';
      return result;
    }
  }

  // Handle unsupported types
  result.error = `サポートされていない日付形式です: ${typeof dateInput}`;
  return result;
}

/**
 * Validates date input specifically for form validation
 * @param dateInput - String input from form fields
 * @returns ValidationResult with validation status
 */
export function validateDateInput(dateInput: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false
  };

  // Empty string is valid (optional field)
  if (dateInput.trim() === '') {
    result.isValid = true;
    return result;
  }

  const parseResult = safeParseDate(dateInput);
  if (!parseResult.isValid) {
    result.error = parseResult.error;
    return result;
  }

  if (!parseResult.date) {
    result.isValid = true; // No date to validate further
    return result;
  }

  // Additional validation rules
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const inputDate = new Date(parseResult.date);
  inputDate.setHours(0, 0, 0, 0);

  if (inputDate < today) {
    result.error = '期日は今日以降の日付を指定してください';
    return result;
  }

  // Check for reasonable future date (e.g., within 10 years)
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 10);

  if (parseResult.date > maxFutureDate) {
    result.error = '期日は10年以内の日付を指定してください';
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * Formats a Date object for API transmission
 * @param date - Date object to format
 * @returns ISO string representation or empty string for invalid dates
 */
export function formatDateForAPI(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

/**
 * Formats a Date object for display in forms (YYYY-MM-DD format)
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format or empty string for invalid dates
 */
export function formatDateForForm(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
}

/**
 * Safely gets the timestamp from a date input
 * @param dateInput - Input that may be a string, Date object, or undefined
 * @returns timestamp number or null if invalid
 */
export function safeGetTime(dateInput: string | Date | undefined): number | null {
  const parseResult = safeParseDate(dateInput);
  
  if (!parseResult.isValid || !parseResult.date) {
    return null;
  }

  return parseResult.date.getTime();
}

/**
 * Creates a Date object from form input with error handling
 * @param formDateValue - String value from form input
 * @returns Date object or undefined if invalid/empty
 */
export function createDateFromFormInput(formDateValue: string): Date | undefined {
  const parseResult = safeParseDate(formDateValue);
  
  if (parseResult.isValid && parseResult.date) {
    return parseResult.date;
  }

  return undefined;
}