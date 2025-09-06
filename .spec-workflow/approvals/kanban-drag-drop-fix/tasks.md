# Tasks Document

## Phase 1: Event Handler Fixes

- [x] 1. Fix drag start event handler in KanbanBoard.tsx
  - File: src/components/kanban/KanbanBoard.tsx
  - Capture correct task data and source column in handleDragStart
  - Store original task status for rollback scenarios
  - Purpose: Ensure drag operation initializes with correct data
  - _Leverage: Existing DndContext and DragStartEvent types_
  - _Requirements: 2.1, 2.2_

- [x] 2. Fix drag over event handler in KanbanBoard.tsx
  - File: src/components/kanban/KanbanBoard.tsx
  - Implement handleDragOver to validate drop targets
  - Add logic to prevent dropping on same column
  - Purpose: Validate drop zones during drag operation
  - _Leverage: Existing DragOverEvent type and column status checks_
  - _Requirements: 2.3, 2.4_

- [x] 3. Fix drag end event handler in KanbanBoard.tsx
  - File: src/components/kanban/KanbanBoard.tsx
  - Process task movement in handleDragEnd
  - Call task update action with new status
  - Add error handling for failed moves
  - Purpose: Complete the drag-drop operation with proper state update
  - _Leverage: useTaskActions hook, DragEndEvent type_
  - _Requirements: 1.2, 1.3, 2.5_

## Phase 2: Drop Zone Configuration

- [x] 4. Fix droppable configuration in KanbanColumn.tsx
  - File: src/components/kanban/KanbanColumn.tsx
  - Properly configure useDroppable hook with column status as id
  - Ensure setNodeRef is correctly applied to drop zone element
  - Purpose: Enable proper drop zone detection for each column
  - _Leverage: @dnd-kit/core useDroppable hook_
  - _Requirements: 1.2, 3.2_

- [x] 5. Add visual feedback for drop zones in KanbanColumn.tsx
  - File: src/components/kanban/KanbanColumn.tsx
  - Apply highlighting styles when isOver is true
  - Add CSS classes for valid/invalid drop states
  - Purpose: Provide clear visual feedback during drag operations
  - _Leverage: Existing isDraggedOver prop and className system_
  - _Requirements: 3.1, 3.2, 3.3_

## Phase 3: State Management

- [ ] 6. Create DragDropHandler utility
  - File: src/utils/dragDropHandler.ts (new)
  - Implement validateDrop function to check if move is allowed
  - Create processTaskMove function for state updates
  - Add rollbackMove function for error recovery
  - Purpose: Centralize drag-drop validation and state management
  - _Leverage: Task types, TaskStatus enum_
  - _Requirements: 1.4, 2.1, 2.4_

- [ ] 7. Integrate DragDropHandler in KanbanBoard
  - File: src/components/kanban/KanbanBoard.tsx
  - Import and use DragDropHandler utility functions
  - Replace inline logic with utility function calls
  - Purpose: Use centralized logic for consistency
  - _Leverage: New DragDropHandler utility_
  - _Requirements: 1.2, 1.3, 2.5_

- [ ] 8. Fix task status update in useTaskActions
  - File: src/hooks/useTaskActions.ts
  - Ensure updateTaskStatus properly updates task in store
  - Add optimistic updates with rollback on failure
  - Purpose: Ensure backend sync for status changes
  - _Leverage: Existing taskStore and update methods_
  - _Requirements: 1.3, 1.5_

## Phase 4: Error Handling

- [ ] 9. Add error boundaries for drag operations
  - File: src/components/kanban/KanbanBoard.tsx
  - Wrap drag handlers in try-catch blocks
  - Show user-friendly error messages on failures
  - Purpose: Graceful error handling for drag-drop failures
  - _Leverage: Existing TaskErrorBoundary component_
  - _Requirements: 1.4, 3.4, 3.5_

- [ ] 10. Implement rollback mechanism
  - File: src/utils/dragDropHandler.ts
  - Add state rollback on backend sync failure
  - Restore task to original column on error
  - Purpose: Maintain consistency on operation failures
  - _Leverage: Task state management in taskStore_
  - _Requirements: 1.4, 3.4_

## Phase 5: Testing

- [ ] 11. Create unit tests for DragDropHandler
  - File: src/utils/__tests__/dragDropHandler.test.ts (new)
  - Test validateDrop with various scenarios
  - Test processTaskMove and rollbackMove functions
  - Purpose: Ensure utility functions work correctly
  - _Leverage: Jest testing framework, existing test utilities_
  - _Requirements: All_

- [ ] 12. Update KanbanBoard integration tests
  - File: src/components/kanban/__tests__/KanbanBoard.test.tsx
  - Add tests for drag-drop event handlers
  - Test error scenarios and recovery
  - Purpose: Verify complete drag-drop flow works
  - _Leverage: React Testing Library, existing test setup_
  - _Requirements: All_

- [ ] 13. Create E2E test for drag-drop functionality
  - File: tests/e2e/kanban-drag-drop.spec.ts (new)
  - Test drag-drop between all column combinations
  - Verify backend persistence of changes
  - Test error recovery scenarios
  - Purpose: Ensure end-to-end functionality works
  - _Leverage: Playwright MCP tools_
  - _Requirements: All_