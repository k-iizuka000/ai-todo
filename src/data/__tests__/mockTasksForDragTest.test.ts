/**
 * Issue 033: ドラッグ&ドロップテスト専用モックデータの単体テスト
 */

import { 
  dragTestTasks, 
  getTasksByStatus, 
  testCases, 
  generateTestTask,
  createTestScenario,
  logDragOperation
} from '../mockTasksForDragTest';
import { Task, TaskStatus } from '@/types/task';

import { vi } from 'vitest';

// モック: console.log (ログ機能のテスト用)
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('mockTasksForDragTest', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    // NODE_ENVをdevelopmentに設定してログを有効化
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('dragTestTasks', () => {
    it('8件のタスクが正しく定義されている', () => {
      expect(dragTestTasks).toHaveLength(8);
      expect(Array.isArray(dragTestTasks)).toBe(true);
    });

    it('各ステータスに適切な数のタスクが配置されている', () => {
      const todoTasks = dragTestTasks.filter(task => task.status === 'todo');
      const inProgressTasks = dragTestTasks.filter(task => task.status === 'in_progress');
      const doneTasks = dragTestTasks.filter(task => task.status === 'done');

      expect(todoTasks).toHaveLength(3);
      expect(inProgressTasks).toHaveLength(2);
      expect(doneTasks).toHaveLength(3);
    });

    it('すべてのタスクが必須フィールドを持っている', () => {
      dragTestTasks.forEach(task => {
        expect(task.id).toBeTruthy();
        expect(task.title).toBeTruthy();
        expect(task.status).toBeTruthy();
        expect(task.priority).toBeTruthy();
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
        expect(task.createdBy).toBeTruthy();
        expect(task.updatedBy).toBeTruthy();
        expect(Array.isArray(task.tags)).toBe(true);
        expect(Array.isArray(task.subtasks)).toBe(true);
      });
    });

    it('タスクIDがユニークである', () => {
      const ids = dragTestTasks.map(task => task.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(dragTestTasks.length);
    });

    it('多様な優先度設定を含んでいる', () => {
      const priorities = dragTestTasks.map(task => task.priority);
      const uniquePriorities = new Set(priorities);
      expect(uniquePriorities.size).toBeGreaterThan(1);
      expect(priorities).toContain('urgent');
      expect(priorities).toContain('high');
      expect(priorities).toContain('medium');
      expect(priorities).toContain('low');
    });

    it('サブタスクを持つタスクが存在する', () => {
      const tasksWithSubtasks = dragTestTasks.filter(task => task.subtasks.length > 0);
      expect(tasksWithSubtasks.length).toBeGreaterThan(0);
    });

    it('複数タグを持つタスクが存在する', () => {
      const tasksWithMultipleTags = dragTestTasks.filter(task => task.tags.length > 1);
      expect(tasksWithMultipleTags.length).toBeGreaterThan(0);
    });

    it('プロジェクト未設定のタスクが存在する（エッジケース）', () => {
      const tasksWithoutProject = dragTestTasks.filter(task => !task.projectId);
      expect(tasksWithoutProject.length).toBeGreaterThan(0);
    });

    it('担当者未設定のタスクが存在する（エッジケース）', () => {
      const tasksWithoutAssignee = dragTestTasks.filter(task => !task.assigneeId);
      expect(tasksWithoutAssignee.length).toBeGreaterThan(0);
    });
  });

  describe('getTasksByStatus', () => {
    it('タスクをステータス別に正しくグループ化する', () => {
      const result = getTasksByStatus(dragTestTasks);

      expect(result).toHaveProperty('todo');
      expect(result).toHaveProperty('in_progress');
      expect(result).toHaveProperty('done');
      
      expect(Array.isArray(result.todo)).toBe(true);
      expect(Array.isArray(result.in_progress)).toBe(true);
      expect(Array.isArray(result.done)).toBe(true);
    });

    it('各ステータスのタスク数が正確である', () => {
      const result = getTasksByStatus(dragTestTasks);

      expect(result.todo).toHaveLength(3);
      expect(result.in_progress).toHaveLength(2);
      expect(result.done).toHaveLength(3);
    });

    it('空の配列を渡した場合、空のオブジェクトを返す', () => {
      const result = getTasksByStatus([]);

      expect(result.todo).toHaveLength(0);
      expect(result.in_progress).toHaveLength(0);
      expect(result.done).toHaveLength(0);
    });

    it('特定のステータスのタスクのみの場合、他のステータスは空配列になる', () => {
      const todoOnlyTasks = dragTestTasks.filter(task => task.status === 'todo');
      const result = getTasksByStatus(todoOnlyTasks);

      expect(result.todo).toHaveLength(3);
      expect(result.in_progress).toHaveLength(0);
      expect(result.done).toHaveLength(0);
    });
  });

  describe('testCases', () => {
    it('複数のテストケースが定義されている', () => {
      expect(testCases.length).toBeGreaterThan(0);
      expect(Array.isArray(testCases)).toBe(true);
    });

    it('すべてのテストケースが必須フィールドを持っている', () => {
      testCases.forEach(testCase => {
        expect(testCase.id).toBeTruthy();
        expect(testCase.name).toBeTruthy();
        expect(testCase.description).toBeTruthy();
        expect(Array.isArray(testCase.tasks)).toBe(true);
        expect(testCase.expectedBehavior).toBeTruthy();
        expect(Array.isArray(testCase.validationRules)).toBe(true);
      });
    });

    it('basic-drag-testケースが存在する', () => {
      const basicTest = testCases.find(tc => tc.id === 'basic-drag-test');
      expect(basicTest).toBeDefined();
      expect(basicTest?.name).toBe('基本ドラッグテスト');
    });

    it('complex-drag-testケースが存在する', () => {
      const complexTest = testCases.find(tc => tc.id === 'complex-drag-test');
      expect(complexTest).toBeDefined();
      expect(complexTest?.name).toBe('複合ドラッグテスト');
    });

    it('edge-case-testケースが存在する', () => {
      const edgeTest = testCases.find(tc => tc.id === 'edge-case-test');
      expect(edgeTest).toBeDefined();
      expect(edgeTest?.name).toBe('エッジケーステスト');
    });

    it('各テストケースに検証ルールが設定されている', () => {
      testCases.forEach(testCase => {
        expect(testCase.validationRules.length).toBeGreaterThan(0);
        testCase.validationRules.forEach(rule => {
          expect(rule.type).toMatch(/^(visual|api|state)$/);
          expect(rule.description).toBeTruthy();
          expect(typeof rule.validator).toBe('function');
        });
      });
    });
  });

  describe('generateTestTask', () => {
    it('デフォルトのタスクを生成する', () => {
      const task = generateTestTask();

      expect(task.id).toBeTruthy();
      expect(task.title).toContain('生成されたテストタスク');
      expect(task.title).toMatch(/^生成されたテストタスク \d+$/);
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.createdBy).toBe('test-generator');
      expect(task.updatedBy).toBe('test-generator');
      expect(Array.isArray(task.tags)).toBe(true);
      expect(Array.isArray(task.subtasks)).toBe(true);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('オーバーライドが正しく適用される', () => {
      const overrides = {
        status: 'done' as TaskStatus,
        priority: 'high' as const,
        title: 'カスタムタスク'
      };
      const task = generateTestTask(overrides);

      expect(task.status).toBe('done');
      expect(task.priority).toBe('high');
      expect(task.title).toBe('カスタムタスク');
    });

    it('生成されるIDがユニークである', () => {
      const task1 = generateTestTask();
      const task2 = generateTestTask();

      expect(task1.id).not.toBe(task2.id);
    });

    it('生成時刻が異なるタスクは異なるタイトルを持つ', async () => {
      const task1 = generateTestTask();
      // 少し待ってから生成（タイトルに時刻が含まれるため）
      await new Promise(resolve => setTimeout(resolve, 1));
      const task2 = generateTestTask();

      expect(task1.title).not.toBe(task2.title);
    });
  });

  describe('createTestScenario', () => {
    it('basicシナリオは3つのタスクを返す', () => {
      const scenario = createTestScenario('basic');
      expect(scenario).toHaveLength(3);
      expect(scenario.some(task => task.status === 'todo')).toBe(true);
      expect(scenario.some(task => task.status === 'in_progress')).toBe(true);
      expect(scenario.some(task => task.status === 'done')).toBe(true);
    });

    it('complexシナリオはサブタスクまたはタグ付きタスクを返す', () => {
      const scenario = createTestScenario('complex');
      expect(scenario.length).toBeGreaterThan(0);
      scenario.forEach(task => {
        const hasComplexFeature = task.subtasks.length > 0 || task.tags.length > 1 || task.projectId;
        expect(hasComplexFeature).toBe(true);
      });
    });

    it('edgeシナリオは未設定項目または長い説明を持つタスクを返す', () => {
      const scenario = createTestScenario('edge');
      expect(scenario.length).toBeGreaterThan(0);
      scenario.forEach(task => {
        const isEdgeCase = !task.projectId || !task.assigneeId || (task.description && task.description.length > 100);
        expect(isEdgeCase).toBe(true);
      });
    });

    it('不正なシナリオタイプの場合、全タスクを返す', () => {
      const scenario = createTestScenario('invalid' as any);
      expect(scenario).toEqual(dragTestTasks);
    });
  });

  describe('logDragOperation', () => {
    it('development環境でログを出力する', () => {
      process.env.NODE_ENV = 'development';
      const testTask = dragTestTasks[0];
      const details = { test: 'data' };

      logDragOperation('TEST_OPERATION', testTask, details);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith('[DragTest] TEST_OPERATION:', {
        taskId: testTask.id,
        title: testTask.title,
        status: testTask.status,
        priority: testTask.priority,
        timestamp: expect.any(String),
        details
      });
    });

    it('production環境ではログを出力しない', () => {
      process.env.NODE_ENV = 'production';
      const testTask = dragTestTasks[0];

      logDragOperation('TEST_OPERATION', testTask);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('詳細情報なしでも正しくログを出力する', () => {
      process.env.NODE_ENV = 'development';
      const testTask = dragTestTasks[0];

      logDragOperation('SIMPLE_OPERATION', testTask);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleLog.mock.calls[0];
      expect(logCall[1]).toEqual(expect.objectContaining({
        taskId: testTask.id,
        title: testTask.title,
        status: testTask.status,
        priority: testTask.priority,
        timestamp: expect.any(String),
        details: undefined
      }));
    });
  });

  describe('データ整合性テスト', () => {
    it('すべてのタスクが有効なステータスを持っている', () => {
      const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'done', 'archived'];
      dragTestTasks.forEach(task => {
        expect(validStatuses).toContain(task.status);
      });
    });

    it('すべてのタスクが有効な優先度を持っている', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent', 'critical'];
      dragTestTasks.forEach(task => {
        expect(validPriorities).toContain(task.priority);
      });
    });

    it('すべてのサブタスクが必須フィールドを持っている', () => {
      dragTestTasks.forEach(task => {
        task.subtasks.forEach(subtask => {
          expect(subtask.id).toBeTruthy();
          expect(subtask.title).toBeTruthy();
          expect(typeof subtask.completed).toBe('boolean');
          expect(subtask.createdAt).toBeInstanceOf(Date);
          expect(subtask.updatedAt).toBeInstanceOf(Date);
        });
      });
    });

    it('すべてのタグが必須フィールドを持っている', () => {
      dragTestTasks.forEach(task => {
        task.tags.forEach(tag => {
          expect(tag.id).toBeTruthy();
          expect(tag.name).toBeTruthy();
          expect(tag.color).toBeTruthy();
          expect(tag.createdAt).toBeInstanceOf(Date);
          expect(tag.updatedAt).toBeInstanceOf(Date);
        });
      });
    });

    it('日付フィールドが論理的に正しい順序である', () => {
      dragTestTasks.forEach(task => {
        expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(task.createdAt.getTime());
        
        task.subtasks.forEach(subtask => {
          expect(subtask.updatedAt.getTime()).toBeGreaterThanOrEqual(subtask.createdAt.getTime());
        });
      });
    });
  });
});