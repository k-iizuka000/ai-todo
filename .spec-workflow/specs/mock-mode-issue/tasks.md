# Tasks Document

<!-- AI Instructions: For each task, generate a _Prompt field with structured AI guidance following this format:
_Prompt: Role: [specialized developer role] | Task: [clear task description with context references] | Restrictions: [what not to do, constraints] | Success: [specific completion criteria]_
This helps provide better AI agent guidance beyond simple "work on this task" prompts. -->

- [x] 1. Fix TaskAPI fetchTasks implementation in src/stores/api/taskApi.ts
  - File: src/stores/api/taskApi.ts
  - Modify fetchTasks method to use correct endpoint and handle errors properly
  - Ensure GET /api/v1/tasks returns tasks sorted by createdAt DESC, force client-side sorting if server doesn't provide proper order
  - Purpose: Enable task fetching from database instead of always failing
  - _Leverage: existing SimpleApiClient, ENDPOINTS configuration_
  - _Requirements: R1, R2_
  - _Prompt: Role: Backend API Developer specializing in REST client implementation | Task: Fix the fetchTasks method in TaskAPI to properly connect to GET /api/v1/tasks endpoint, handle success/error responses, and ensure tasks are returned sorted by createdAt DESC (force client-side sorting if server doesn't provide proper order) following requirements R1 and R2 | Restrictions: Do not add automatic retry logic or complex error recovery, maintain existing error handling patterns, do not modify existing SimpleApiClient interface | Success: fetchTasks successfully retrieves tasks from database, handles network errors gracefully, returns tasks in newest-first order regardless of server response order_

- [x] 2. Fix TaskAPI updateTaskStatus implementation in src/stores/api/taskApi.ts
  - File: src/stores/api/taskApi.ts
  - Add new updateTaskStatus method for PATCH /api/v1/tasks/:id with status only
  - Replace existing updateTask usage with status-specific method
  - Response must include at least id, status, updatedAt fields for store consistency
  - Purpose: Enable task status updates to persist to database
  - _Leverage: existing SimpleApiClient, ENDPOINTS configuration_
  - _Requirements: R1, R3_
  - _Prompt: Role: Backend API Developer with expertise in PATCH operations and data validation | Task: Implement updateTaskStatus method for PATCH /api/v1/tasks/:id endpoint that sends only status field and returns updated task with at least id, status, updatedAt fields, following requirements R1 and R3 | Restrictions: Only send status field in request body, do not modify other task properties, maintain existing error handling patterns, ensure proper TypeScript typing, no automatic retry logic | Success: updateTaskStatus successfully updates task status in database, returns updated task object with required fields, handles validation and network errors appropriately_

- [x] 3. Update TaskStore fetchTasks to use API with error fallback in src/stores/taskStore.ts
  - File: src/stores/taskStore.ts
  - Modify fetchTasks to call TaskAPI.fetchTasks() first
  - On API failure, show error toast with retry button (no mock fallback)
  - Update store state appropriately for success/error scenarios
  - Purpose: Connect store to real API while handling failures gracefully
  - _Leverage: existing TaskAPI, toast notification system_
  - _Requirements: R2, R3_
  - _Prompt: Role: Frontend State Management Developer with expertise in Zustand and error handling | Task: Update TaskStore fetchTasks method to call TaskAPI.fetchTasks(), handle success by updating store state, and on failure show error toast with retry button without falling back to mock data, following requirements R2 and R3 | Restrictions: Do not fall back to mock data on failure, must show error state and retry option, maintain existing store structure, ensure proper loading states, no automatic retry logic | Success: Store fetches from API successfully, errors show user-friendly messages with retry options, no mock data fallback occurs_

- [x] 4. Update TaskStore updateTaskStatus with optimistic UI and rollback in src/stores/taskStore.ts
  - File: src/stores/taskStore.ts
  - Implement optimistic UI updates for task status changes
  - Call TaskAPI.updateTaskStatus() and rollback on failure
  - Show error toast and revert UI state on API errors
  - Response must include at least id, status, updatedAt fields for store update consistency
  - Purpose: Provide responsive UI while ensuring data consistency
  - _Leverage: existing TaskAPI, toast notification system_
  - _Requirements: R1, R3_
  - _Prompt: Role: Frontend Developer specializing in optimistic UI patterns and error recovery | Task: Implement optimistic task status updates in TaskStore that immediately updates UI, calls TaskAPI.updateTaskStatus(), and rolls back changes with error toast on failure, expecting response with at least id, status, updatedAt fields, following requirements R1 and R3 | Restrictions: Must implement proper rollback mechanism, show clear error messages, maintain UI responsiveness, do not leave store in inconsistent state, no automatic retry logic | Success: UI updates immediately on user action, API failures trigger visual rollback, error messages guide user to retry_

- [x] 5. Add error handling and toast notifications in src/stores/taskStore.ts
  - File: src/stores/taskStore.ts
  - Integrate toast notification system for API errors
  - Add user-initiated retry functionality only (no automatic retries)
  - Implement proper error state management in store
  - Purpose: Provide user feedback and recovery options for API failures
  - _Leverage: existing toast/notification system, error handling utilities_
  - _Requirements: R3_
  - _Prompt: Role: UX Engineer specializing in error handling and user feedback systems | Task: Integrate toast notifications for API errors and add user-initiated retry functionality (no automatic retries), implementing proper error state management following requirement R3 | Restrictions: Use existing toast system, do not create custom notification UI, ensure error messages are user-friendly, maintain store performance, no automatic retry mechanisms | Success: Users receive clear feedback on errors, user-initiated retry functionality works correctly, error states are properly managed and displayed_

- [x] 6. Update Dashboard component to handle loading and error states in src/pages/Dashboard.tsx
  - File: src/pages/Dashboard.tsx
  - Remove mock data fallback logic (specifically the `tasksFromStore.length > 0 ? tasksFromStore : mockTasks` conditional)
  - Add proper loading spinners and error states
  - Handle empty task list states appropriately
  - Force client-side sorting by createdAt DESC if server doesn't provide proper order
  - Purpose: Remove mock mode dependency and show proper UI states
  - _Leverage: existing loading components, error display components_
  - _Requirements: R2, R3_
  - _Prompt: Role: Frontend UI Developer with expertise in React state management and user experience | Task: Remove mock data fallback conditional from Dashboard component and implement proper loading, error, and empty states using existing UI components, with client-side sorting fallback, following requirements R2 and R3 | Restrictions: Do not use mock data as fallback, must show appropriate loading states, use existing UI component patterns, maintain responsive design | Success: Dashboard shows loading states during fetch, displays errors appropriately, handles empty task lists without mock data, tasks display in correct order_

- [x] 7. Update KanbanBoard drag-and-drop to use new updateTaskStatus in src/components/kanban/KanbanBoard.tsx
  - File: src/components/kanban/KanbanBoard.tsx
  - Modify drag-and-drop handlers to call TaskStore.updateTaskStatus
  - Ensure proper optimistic UI updates and error handling
  - Add guard logic: 1 action = 1 PATCH request (prevent duplicate calls, skip API call if dropping to same status)
  - Remove any mock mode related code
  - Purpose: Connect UI interactions to persistent database operations
  - _Leverage: existing drag-and-drop logic, TaskStore_
  - _Requirements: R1, R3_
  - _Prompt: Role: Frontend Interaction Developer with expertise in drag-and-drop interfaces and state management | Task: Update KanbanBoard drag-and-drop handlers to use TaskStore.updateTaskStatus with optimistic UI updates, implementing guard logic to prevent duplicate PATCH requests and skip API calls for same-status drops, following requirements R1 and R3 | Restrictions: Maintain existing drag-and-drop UX, ensure smooth visual transitions, handle errors gracefully, do not break accessibility, prevent multiple simultaneous API calls for same action | Success: Drag-and-drop operations persist to database, UI provides immediate feedback, errors are handled with visual rollback, no duplicate API calls occur_

- [x] 8. Add Date conversion utilities for ISO8601 strings in src/utils/dateUtils.ts
  - File: src/utils/dateUtils.ts (create if doesn't exist)
  - Create utilities to convert ISO8601 strings to Date objects
  - Add formatting functions for task dates
  - Ensure consistent date handling across application
  - Purpose: Handle server date strings consistently in client code
  - _Leverage: existing utility patterns_
  - _Requirements: Task Model data handling_
  - _Prompt: Role: Utility Developer with expertise in date/time handling and TypeScript | Task: Create date conversion utilities for handling ISO8601 strings from API responses, ensuring consistent date formatting and parsing across the application | Restrictions: Use standard JavaScript Date methods, handle timezone considerations, maintain consistent date formats, ensure null safety | Success: Date utilities handle all API date formats correctly, consistent date display throughout UI, proper timezone handling_

- [x] 9. Write unit tests for TaskAPI methods in src/stores/api/__tests__/taskApi.test.ts
  - File: src/stores/api/__tests__/taskApi.test.ts (create directory if doesn't exist)
  - Test fetchTasks success and error scenarios
  - Test updateTaskStatus with valid and invalid data
  - Mock SimpleApiClient for isolated testing
  - Purpose: Ensure API client reliability and error handling
  - _Leverage: existing test utilities, mocking frameworks_
  - _Requirements: R1, R2_
  - _Prompt: Role: QA Engineer with expertise in API testing and Jest mocking | Task: Create comprehensive unit tests for TaskAPI fetchTasks and updateTaskStatus methods, testing both success and error scenarios with proper mocking, covering requirements R1 and R2 | Restrictions: Must mock all external dependencies, test error scenarios thoroughly, ensure test isolation, do not test HTTP library implementation | Success: All API methods tested with good coverage, error scenarios properly handled, tests run independently and consistently_

- [x] 10. Write integration tests for TaskStore operations in src/stores/__tests__/taskStore.integration.test.ts
  - File: src/stores/__tests__/taskStore.test.ts (create directory if doesn't exist)
  - Test complete task operations workflow
  - Test error handling and rollback scenarios
  - Mock TaskAPI for controlled testing
  - Purpose: Verify store behavior and error recovery
  - _Leverage: existing test utilities, Zustand testing patterns_
  - _Requirements: R1, R3_
  - _Prompt: Role: Integration Test Engineer with expertise in state management testing and React testing patterns | Task: Create integration tests for TaskStore operations including error handling and rollback scenarios, following requirements R1 and R3 | Restrictions: Must test state transitions correctly, mock external dependencies, test error recovery thoroughly, maintain test performance | Success: Store operations tested end-to-end, error scenarios properly validated, state consistency verified in all cases_

- [x] 11. Write E2E tests for task status updates in src/components/kanban/__tests__/taskOperations.e2e.test.ts
  - File: src/components/kanban/__tests__/taskOperations.e2e.test.ts (create directory if doesn't exist)
  - Test complete user workflow: DnD → PATCH request → page reload → GET reflects change
  - Test error scenarios with network failures
  - Verify single PATCH request per drag action (no duplicate requests)
  - Verify task persistence across page refreshes
  - Purpose: Validate end-to-end functionality and user experience
  - _Leverage: existing E2E testing framework (Playwright MCP)_
  - _Requirements: All requirements validation_
  - _Prompt: Role: E2E Test Automation Engineer with expertise in user workflow testing and browser automation | Task: Create end-to-end tests for complete task status update workflows including DnD → PATCH → reload → GET verification, ensuring single PATCH per action and testing error scenarios, covering all requirements | Restrictions: Test real user interactions only, do not test implementation details, ensure tests are reliable across environments, maintain test speed, verify network request counts | Success: E2E tests cover all critical user journeys, single PATCH per action verified, error scenarios are properly tested, task persistence validated from user perspective_

- [x] 12. Final integration and cleanup
  - File: Multiple files for cleanup
  - Remove all mock mode fallback code
  - Clean up console.log statements and debug code
  - Update error messages for consistency
  - Verify all requirements are met
  - Purpose: Finalize implementation and ensure production readiness
  - _Leverage: code review checklist, requirements verification_
  - _Requirements: All requirements_
  - _Prompt: Role: Senior Developer with expertise in code quality and system integration | Task: Perform final cleanup by removing all mock mode fallback code, debugging statements, and inconsistent error messages while verifying all requirements are fully implemented | Restrictions: Do not break existing functionality, maintain code quality standards, ensure no development artifacts remain, follow project conventions | Success: All mock mode code removed, error messages are consistent and user-friendly, all requirements verified and working correctly in production-like environment_