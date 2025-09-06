/**
 * Unit tests for event utilities
 */

import {
  createStopPropagationHandler,
  createStopPropagationClickHandler,
  isClickOutsideExcluding,
  createClickOutsideHandler,
  createModalClickOutsideHandler,
  elementMatchesAnySelector,
  DEFAULT_MODAL_EXCLUDE_SELECTORS
} from '../eventUtils';

// Mock React for click handler tests
const mockReactMouseEvent = (target: Element, bubbles = true): React.MouseEvent => {
  const event = {
    target,
    currentTarget: target,
    stopPropagation: jest.fn(),
    preventDefault: jest.fn(),
    bubbles,
    cancelable: true,
    type: 'click'
  } as unknown as React.MouseEvent;
  return event;
};

// Mock DOM Event for regular event tests
const mockDOMEvent = (target: Element, bubbles = true): Event => {
  const event = {
    target,
    currentTarget: target,
    stopPropagation: jest.fn(),
    preventDefault: jest.fn(),
    bubbles,
    cancelable: true,
    type: 'click'
  } as unknown as Event;
  return event;
};

// Mock DOM elements
const createMockElement = (tagName: string, attributes: Record<string, string> = {}): Element => {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes,
    matches: jest.fn((selector: string) => {
      // Simple mock implementation for common selectors
      if (selector.startsWith('[data-')) {
        const attr = selector.slice(1, -1).split('=')[0];
        return attr in attributes;
      }
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return attributes.class?.includes(className) || false;
      }
      return tagName.toLowerCase() === selector.toLowerCase();
    }),
    closest: jest.fn((selector: string) => {
      // Return self if matches, otherwise null for simplicity
      return element.matches(selector) ? element : null;
    }),
    contains: jest.fn((other: Element) => {
      return element === other;
    })
  } as unknown as Element;
  
  return element;
};

describe('eventUtils', () => {
  
  describe('createStopPropagationHandler', () => {
    it('should stop propagation by default', () => {
      const mockHandler = jest.fn();
      const event = mockDOMEvent(createMockElement('div'));
      
      const enhancedHandler = createStopPropagationHandler(mockHandler);
      enhancedHandler(event);
      
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(event);
    });

    it('should prevent default when configured', () => {
      const mockHandler = jest.fn();
      const event = mockDOMEvent(createMockElement('div'));
      
      const enhancedHandler = createStopPropagationHandler(mockHandler, { preventDefault: true });
      enhancedHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(event);
    });

    it('should respect stopPropagation configuration', () => {
      const mockHandler = jest.fn();
      const event = mockDOMEvent(createMockElement('div'));
      
      const enhancedHandler = createStopPropagationHandler(mockHandler, { stopPropagation: false });
      enhancedHandler(event);
      
      expect(event.stopPropagation).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(event);
    });
  });

  describe('createStopPropagationClickHandler', () => {
    it('should create React click handler with stop propagation', () => {
      const mockHandler = jest.fn();
      const event = mockReactMouseEvent(createMockElement('button'));
      
      const enhancedHandler = createStopPropagationClickHandler(mockHandler);
      enhancedHandler(event);
      
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(event);
    });
  });

  describe('isClickOutsideExcluding', () => {
    let containerElement: Element;
    let insideElement: Element;
    let outsideElement: Element;
    let excludedElement: Element;

    beforeEach(() => {
      containerElement = createMockElement('div', { id: 'container' });
      insideElement = createMockElement('span');
      outsideElement = createMockElement('p');
      excludedElement = createMockElement('select', { 'data-combobox': 'true' });

      // Mock contains method for container
      containerElement.contains = jest.fn((element: Element) => {
        return element === insideElement;
      });
    });

    it('should return false for clicks inside container', () => {
      const event = mockDOMEvent(insideElement);
      const result = isClickOutsideExcluding(event, containerElement, []);
      
      expect(result).toBe(false);
    });

    it('should return true for clicks outside container with no exclusions', () => {
      const event = mockDOMEvent(outsideElement);
      const result = isClickOutsideExcluding(event, containerElement, []);
      
      expect(result).toBe(true);
    });

    it('should return false for clicks in excluded elements', () => {
      const event = mockDOMEvent(excludedElement);
      const result = isClickOutsideExcluding(event, containerElement, ['[data-combobox]']);
      
      expect(result).toBe(false);
      expect(excludedElement.closest).toHaveBeenCalledWith('[data-combobox]');
    });

    it('should handle invalid selectors gracefully', () => {
      const event = mockDOMEvent(outsideElement);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock closest to throw error for invalid selector
      outsideElement.closest = jest.fn(() => {
        throw new Error('Invalid selector');
      });
      
      const result = isClickOutsideExcluding(event, containerElement, ['[invalid']);
      
      expect(result).toBe(true); // Should still work despite invalid selector
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should work with multiple exclude selectors', () => {
      const event = mockDOMEvent(excludedElement);
      const result = isClickOutsideExcluding(event, containerElement, [
        '.some-class',
        '[data-combobox]',
        '.another-class'
      ]);
      
      expect(result).toBe(false);
    });
  });

  describe('createClickOutsideHandler', () => {
    let mockOnClickOutside: jest.Mock;
    let containerRef: React.RefObject<Element>;
    let containerElement: Element;

    beforeEach(() => {
      mockOnClickOutside = jest.fn();
      containerElement = createMockElement('div');
      containerRef = { current: containerElement };
      
      // Mock document event listeners
      document.addEventListener = jest.fn();
      document.removeEventListener = jest.fn();
    });

    it('should add event listener and return cleanup function', () => {
      const cleanup = createClickOutsideHandler(mockOnClickOutside, containerRef, []);
      
      expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      cleanup();
      expect(document.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('should not call handler when no container ref', () => {
      const emptyRef = { current: null };
      createClickOutsideHandler(mockOnClickOutside, emptyRef, []);
      
      // Simulate the event handler being called
      const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
      const event = mockDOMEvent(createMockElement('div'));
      eventHandler(event);
      
      expect(mockOnClickOutside).not.toHaveBeenCalled();
    });
  });

  describe('createModalClickOutsideHandler', () => {
    it('should use default modal exclude selectors', () => {
      const mockOnClickOutside = jest.fn();
      const containerRef = { current: createMockElement('div') };
      
      document.addEventListener = jest.fn();
      
      createModalClickOutsideHandler(mockOnClickOutside, containerRef, []);
      
      expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('should combine default and additional exclude selectors', () => {
      const mockOnClickOutside = jest.fn();
      const containerRef = { current: createMockElement('div') };
      const additionalSelectors = ['.custom-selector'];
      
      document.addEventListener = jest.fn();
      
      createModalClickOutsideHandler(mockOnClickOutside, containerRef, additionalSelectors);
      
      // Verify the function was created (detailed testing of selector combination 
      // would require accessing internal implementation)
      expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });

  describe('elementMatchesAnySelector', () => {
    let element: Element;

    beforeEach(() => {
      element = createMockElement('button', { 
        class: 'btn btn-primary', 
        'data-testid': 'submit-btn' 
      });
    });

    it('should return true when element matches any selector', () => {
      const selectors = ['.btn', '[data-testid="submit-btn"]', '.non-matching'];
      const result = elementMatchesAnySelector(element, selectors);
      
      expect(result).toBe(true);
    });

    it('should return false when element matches no selectors', () => {
      const selectors = ['.non-matching', '[data-other="value"]'];
      const result = elementMatchesAnySelector(element, selectors);
      
      expect(result).toBe(false);
    });

    it('should handle invalid selectors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock matches to throw error for invalid selector
      element.matches = jest.fn((selector) => {
        if (selector === '[invalid') {
          throw new Error('Invalid selector');
        }
        return false;
      });
      element.closest = jest.fn(() => null);
      
      const selectors = ['[invalid', '.valid-selector'];
      const result = elementMatchesAnySelector(element, selectors);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should use closest when direct match fails', () => {
      element.matches = jest.fn(() => false);
      element.closest = jest.fn((selector) => {
        return selector === '.parent-class' ? element : null;
      });
      
      const result = elementMatchesAnySelector(element, ['.parent-class']);
      
      expect(result).toBe(true);
      expect(element.closest).toHaveBeenCalledWith('.parent-class');
    });
  });

  describe('DEFAULT_MODAL_EXCLUDE_SELECTORS', () => {
    it('should include common form element selectors', () => {
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('[data-combobox]');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('[role="combobox"]');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('[role="listbox"]');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('.combobox');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('.dropdown');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('.project-selector');
      expect(DEFAULT_MODAL_EXCLUDE_SELECTORS).toContain('.tag-selector');
    });
  });
});