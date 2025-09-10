/**
 * Task Operations E2E Tests
 * Issue #001 Mock Mode Fix: End-to-end tests for task status updates
 * Tests complete user workflow: DnD → PATCH request → page reload → GET reflects change
 */

import { test, expect } from '@playwright/test';

test.describe('Task Operations E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the kanban board
    await page.goto('/dashboard');
    
    // Wait for the page to load and tasks to be fetched
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
    
    // Wait for initial API call to complete
    await page.waitForLoadState('networkidle');
  });

  test('should drag and drop task between columns with API persistence', async ({ page }) => {
    // Create a test task first (assuming we have a way to create tasks)
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'E2E Test Task');
    await page.click('[data-testid="create-task-submit"]');
    
    // Wait for task creation to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && response.request().method() === 'POST'
    );
    
    // Find the created task in the TODO column
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const testTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'E2E Test Task'
    });
    
    await expect(testTask).toBeVisible();
    
    // Get the task ID for monitoring API calls
    const taskCardElement = await testTask.first();
    const taskId = await taskCardElement.getAttribute('data-testid');
    const extractedTaskId = taskId?.replace('task-card-', '') || '';
    
    // Set up network monitoring for PATCH request
    let patchRequestCount = 0;
    let patchRequestBody: any = null;
    
    page.on('request', request => {
      if (request.url().includes(`/api/v1/tasks/${extractedTaskId}`) && 
          request.method() === 'PATCH') {
        patchRequestCount++;
        patchRequestBody = request.postDataJSON();
      }
    });
    
    // Drag task from TODO to IN_PROGRESS column
    const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    
    await testTask.dragTo(inProgressColumn);
    
    // Wait for the PATCH request to complete
    await page.waitForResponse(response => 
      response.url().includes(`/api/v1/tasks/${extractedTaskId}`) && 
      response.request().method() === 'PATCH'
    );
    
    // Verify only one PATCH request was made
    expect(patchRequestCount).toBe(1);
    
    // Verify PATCH request body contains only status
    expect(patchRequestBody).toEqual({ status: 'in_progress' });
    
    // Verify task moved visually to in_progress column
    const movedTask = inProgressColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'E2E Test Task'
    });
    await expect(movedTask).toBeVisible();
    
    // Verify task is no longer in TODO column
    const todoTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'E2E Test Task'
    });
    await expect(todoTask).not.toBeVisible();
  });

  test('should persist task status changes across page reloads', async ({ page }) => {
    // Create a test task
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'Persistence Test Task');
    await page.click('[data-testid="create-task-submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && response.request().method() === 'POST'
    );
    
    // Move task to DONE column
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const testTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Persistence Test Task'
    });
    
    const doneColumn = page.locator('[data-testid="kanban-column-done"]');
    await testTask.dragTo(doneColumn);
    
    // Wait for PATCH request
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks/') && 
      response.request().method() === 'PATCH'
    );
    
    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
    
    // Wait for GET request to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && response.request().method() === 'GET'
    );
    
    // Verify task is still in DONE column after reload
    const persistedTask = doneColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Persistence Test Task'
    });
    await expect(persistedTask).toBeVisible();
    
    // Verify task is not in other columns
    const todoTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Persistence Test Task'
    });
    await expect(todoTask).not.toBeVisible();
  });

  test('should handle API errors gracefully during drag and drop', async ({ page }) => {
    // Mock API to return error for PATCH requests
    await page.route('**/api/v1/tasks/*/status', route => {
      route.abort('failed');
    });
    
    // Create a test task
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'Error Test Task');
    await page.click('[data-testid="create-task-submit"]');
    
    // Find the task and attempt to drag it
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const testTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Error Test Task'
    });
    
    const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    
    // Attempt drag and drop
    await testTask.dragTo(inProgressColumn);
    
    // Wait a moment for error handling
    await page.waitForTimeout(2000);
    
    // Verify task rolled back to original position
    const rollbackTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Error Test Task'
    });
    await expect(rollbackTask).toBeVisible();
    
    // Verify error message is displayed
    const errorToast = page.locator('[data-testid="error-toast"]').or(
      page.locator('text=タスクステータスの更新に失敗しました')
    );
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test('should prevent duplicate API calls during rapid drag operations', async ({ page }) => {
    // Create a test task
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'Duplicate Prevention Test');
    await page.click('[data-testid="create-task-submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && response.request().method() === 'POST'
    );
    
    const testTask = page.locator('[data-testid*="task-card"]').filter({
      hasText: 'Duplicate Prevention Test'
    });
    
    // Monitor PATCH requests
    let patchRequestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/v1/tasks/') && 
          request.method() === 'PATCH') {
        patchRequestCount++;
      }
    });
    
    const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    
    // Perform rapid drag operations
    await testTask.dragTo(inProgressColumn);
    await testTask.dragTo(inProgressColumn); // Second drag to same column
    
    // Wait for any potential requests to complete
    await page.waitForTimeout(3000);
    
    // Verify only one PATCH request was made (second drag should be ignored)
    expect(patchRequestCount).toBeLessThanOrEqual(1);
  });

  test('should validate task data integrity after status updates', async ({ page }) => {
    // Create a task with additional metadata
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'Data Integrity Test');
    await page.fill('[data-testid="task-description-input"]', 'Test description');
    await page.selectOption('[data-testid="task-priority-select"]', 'high');
    await page.click('[data-testid="create-task-submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && response.request().method() === 'POST'
    );
    
    // Move task to in_progress
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const testTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Data Integrity Test'
    });
    
    const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    await testTask.dragTo(inProgressColumn);
    
    // Capture the PATCH response
    const patchResponse = await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks/') && 
      response.request().method() === 'PATCH'
    );
    
    const updatedTaskData = await patchResponse.json();
    
    // Verify response contains required fields
    expect(updatedTaskData).toHaveProperty('id');
    expect(updatedTaskData).toHaveProperty('status');
    expect(updatedTaskData).toHaveProperty('updatedAt');
    expect(updatedTaskData.status).toBe('in_progress');
    
    // Verify task metadata is preserved
    expect(updatedTaskData.title).toBe('Data Integrity Test');
    expect(updatedTaskData.description).toBe('Test description');
    expect(updatedTaskData.priority).toBe('high');
    
    // Verify updatedAt timestamp is updated
    const updatedAt = new Date(updatedTaskData.updatedAt);
    const now = new Date();
    const timeDifference = now.getTime() - updatedAt.getTime();
    expect(timeDifference).toBeLessThan(60000); // Updated within last minute
  });

  test('should handle network timeout and retry scenarios', async ({ page }) => {
    // Set up delayed response for first request, success for retry
    let requestCount = 0;
    await page.route('**/api/v1/tasks/*/status', route => {
      requestCount++;
      if (requestCount === 1) {
        // First request: delay and timeout
        setTimeout(() => route.abort('timedout'), 6000);
      } else {
        // Subsequent requests: success
        route.continue();
      }
    });
    
    // Create and move task
    await page.click('[data-testid="new-task-button"]');
    await page.fill('[data-testid="task-title-input"]', 'Timeout Test Task');
    await page.click('[data-testid="create-task-submit"]');
    
    const testTask = page.locator('[data-testid*="task-card"]').filter({
      hasText: 'Timeout Test Task'
    });
    
    const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    await testTask.dragTo(inProgressColumn);
    
    // Wait for timeout error
    await page.waitForTimeout(7000);
    
    // Verify error handling
    const errorMessage = page.locator('text=タスクステータスの更新に失敗しました');
    await expect(errorMessage).toBeVisible();
    
    // Verify rollback occurred
    const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    const rollbackTask = todoColumn.locator('[data-testid*="task-card"]').filter({
      hasText: 'Timeout Test Task'
    });
    await expect(rollbackTask).toBeVisible();
  });
});