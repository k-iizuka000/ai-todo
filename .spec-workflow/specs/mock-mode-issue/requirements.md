# Requirements Document

## Introduction

This feature addresses a critical bug where drag-and-drop status changes are not persisted to the database and the initial view does not load tasks from the database. The issue has been investigated in `/issues/001-mock-mode-issue.md`.

The resolution is essential: tasks must be saved to DB immediately upon status move, and the dashboard must render from DB state on page load.

## Alignment with Product Vision

This fix is fundamental to the core product vision of providing a reliable task management system. Without persistent data storage on move and proper initial loading, the application cannot fulfill its basic promise of helping users organize and track their tasks over time.

## Requirements

### Requirement 1: Drag-and-Drop Immediate Persistence

**User Story:** As a user, when I drag and drop a task between columns, I want the change to be saved to the database immediately so that the state persists across refreshes.

#### Acceptance Criteria

1. WHEN user drags a task to another column (status change) THEN system SHALL immediately send `PATCH /api/v1/tasks/:id` with `{ status: <new_status> }`.
2. WHEN API request succeeds THEN system SHALL finalize local state from the server response (e.g., `status`, `updatedAt`).
3. WHEN API request fails THEN system SHALL rollback the move to the previous state and display an error toast. No switch to mock mode and no silent fallback.
4. System SHALL issue exactly one network request per move action.

### Requirement 2: Initial Load from Database

**User Story:** As a user, when I load or reload the dashboard, I want tasks to be fetched from the database and shown in a consistent order.

#### Acceptance Criteria

1. WHEN page loads or reloads THEN system SHALL fetch tasks via `GET /api/v1/tasks`.
2. System SHALL render tasks sorted by `createdAt` (descending: newest first) for the initial view.
3. IF the initial fetch fails THEN system SHALL show a visible loading error with a retry action. The system SHALL NOT switch to mock data.

### Requirement 3: Configuration Options and Policy

**Policy:**
- System SHALL NOT use mock mode in any environment.
- Environments MAY use different databases, but for now the implementation SHALL target the development database only.

### Out of Scope (Explicit)
- Same-column reordering and position management (e.g., `positionKey`, batch reorder)
- Batch reorder API (e.g., `/api/v1/tasks/reorder`)
- Mock mode fallback and any mock-data migration

## Non-Functional Requirements

### Code Architecture and Modularity
- **SRP**: Separate API client logic from state management
- **Modular Design**: Isolate task API operations in dedicated service modules
- **Clear Interfaces**: Define TypeScript interfaces for task operations and API responses relevant to this scope (GET tasks, PATCH status)

### Performance
- Move save (PATCH) and initial load (GET) should complete within 5 seconds under normal conditions
- UI should remain responsive during operations with appropriate loading/rollback states

### Security
- Task data should be validated on both client and server sides
- Database access must use parameterized queries to prevent SQL injection

### Reliability
- System must gracefully handle API timeouts and network failures for GET and PATCH
- For move failures, UI must rollback and show an error toast; no mock fallback

### Usability
- Error messages must be user-friendly and actionable
- UI loading states must indicate when data is being fetched or a move is being saved
