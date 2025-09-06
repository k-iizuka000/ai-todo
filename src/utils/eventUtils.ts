/**
 * Event handling utilities for UI components
 * Provides reusable functions for modal control and event propagation management
 */

/**
 * Configuration for event handlers
 */
export interface EventHandlerConfig {
  /** Stop event propagation */
  stopPropagation: boolean;
  /** Prevent default browser behavior */
  preventDefault: boolean;
  /** CSS selectors to exclude from click-outside detection */
  excludeSelectors: string[];
}

/**
 * Creates an event handler that stops propagation before calling the original handler
 * @param handler Original event handler function
 * @param config Event handler configuration
 * @returns Enhanced event handler with propagation control
 */
export function createStopPropagationHandler<T extends Event>(
  handler: (event: T) => void,
  config: Partial<EventHandlerConfig> = {}
): (event: T) => void {
  const { stopPropagation = true, preventDefault = false } = config;
  
  return (event: T) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (preventDefault) {
      event.preventDefault();
    }
    handler(event);
  };
}

/**
 * Creates a click handler that stops propagation
 * @param handler Original click handler
 * @param config Event handler configuration
 * @returns Enhanced click handler
 */
export function createStopPropagationClickHandler(
  handler: (event: React.MouseEvent) => void,
  config: Partial<EventHandlerConfig> = {}
): (event: React.MouseEvent) => void {
  return createStopPropagationHandler(handler, config);
}

/**
 * Checks if a click event occurred outside an element, excluding specific selectors
 * @param event The click event
 * @param containerElement The container element to check against
 * @param excludeSelectors CSS selectors to exclude from outside detection
 * @returns true if click is outside the container and not in excluded elements
 */
export function isClickOutsideExcluding(
  event: Event,
  containerElement: Element,
  excludeSelectors: string[] = []
): boolean {
  const target = event.target as Element;
  
  // If click is inside the container, it's not outside
  if (containerElement.contains(target)) {
    return false;
  }
  
  // Check if click is in any excluded elements
  for (const selector of excludeSelectors) {
    try {
      const excludedElement = target.closest(selector);
      if (excludedElement) {
        return false; // Click is in excluded element, treat as "inside"
      }
    } catch (error) {
      console.warn(`Invalid selector in isClickOutsideExcluding: ${selector}`, error);
    }
  }
  
  // Click is outside container and not in excluded elements
  return true;
}

/**
 * Creates a click-outside handler for modal-like components
 * @param onClickOutside Handler to call when clicking outside
 * @param containerRef Ref to the container element
 * @param excludeSelectors CSS selectors to exclude from outside detection
 * @returns Cleanup function to remove event listener
 */
export function createClickOutsideHandler(
  onClickOutside: () => void,
  containerRef: React.RefObject<Element>,
  excludeSelectors: string[] = []
): () => void {
  const handleClickOutside = (event: Event) => {
    if (containerRef.current && isClickOutsideExcluding(event, containerRef.current, excludeSelectors)) {
      onClickOutside();
    }
  };

  // Add event listener
  document.addEventListener('mousedown', handleClickOutside);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}

/**
 * Default exclude selectors for common form elements and dropdowns
 */
export const DEFAULT_MODAL_EXCLUDE_SELECTORS = [
  '[data-combobox]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '.combobox',
  '.dropdown',
  '.select-dropdown',
  '.project-selector',
  '.tag-selector'
];

/**
 * Enhanced click-outside handler specifically for modals
 * @param onClickOutside Handler to call when clicking outside
 * @param containerRef Ref to the modal container
 * @param additionalExcludeSelectors Additional selectors to exclude
 * @returns Cleanup function
 */
export function createModalClickOutsideHandler(
  onClickOutside: () => void,
  containerRef: React.RefObject<Element>,
  additionalExcludeSelectors: string[] = []
): () => void {
  const excludeSelectors = [
    ...DEFAULT_MODAL_EXCLUDE_SELECTORS,
    ...additionalExcludeSelectors
  ];
  
  return createClickOutsideHandler(onClickOutside, containerRef, excludeSelectors);
}

/**
 * Utility to check if an element matches any of the provided selectors
 * @param element Element to check
 * @param selectors Array of CSS selectors
 * @returns true if element matches any selector
 */
export function elementMatchesAnySelector(element: Element, selectors: string[]): boolean {
  for (const selector of selectors) {
    try {
      if (element.matches(selector) || element.closest(selector)) {
        return true;
      }
    } catch (error) {
      console.warn(`Invalid selector in elementMatchesAnySelector: ${selector}`, error);
    }
  }
  return false;
}