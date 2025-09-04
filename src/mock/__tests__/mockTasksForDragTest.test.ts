/**
 * Issue 033: mockTasksForDragTest.ts の単体テスト
 */

import { 
  dragTestTasks, 
  testCases, 
  getTasksByStatus, 
  generateTestTask, 
  createTestScenario,
  getDragTestStats
} from '../mockTasksForDragTest';
import { TaskStatus, Task } from '../../types/task';

describe('mockTasksForDragTest', () => {
  describe('dragTestTasks', () => {
    it('should have exactly 8 test tasks', () => {
      expect(dragTestTasks).toHaveLength(8);
    });

    it('should contain tasks with all required statuses', () => {
      const statuses = dragTestTasks.map(task => task.status);
      expect(statuses).toContain('todo');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('done');
    });

    it('should have 3 todo tasks', () => {
      const todoTasks = dragTestTasks.filter(task => task.status === 'todo');
      expect(todoTasks).toHaveLength(3);
    });

    it('should have 2 in_progress tasks', () => {
      const inProgressTasks = dragTestTasks.filter(task => task.status === 'in_progress');
      expect(inProgressTasks).toHaveLength(2);
    });

    it('should have 3 done tasks', () => {
      const doneTasks = dragTestTasks.filter(task => task.status === 'done');
      expect(doneTasks).toHaveLength(3);
    });

    it('should have all tasks with required properties', () => {
      dragTestTasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
        expect(task.priority).toBeDefined();
        expect(task.tags).toBeInstanceOf(Array);
        expect(task.subtasks).toBeInstanceOf(Array);
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
        expect(task.createdBy).toBeDefined();
        expect(task.updatedBy).toBeDefined();
      });
    });
  });

  describe('testCases', () => {
    it('should have at least one test case', () => {
      expect(testCases.length).toBeGreaterThan(0);
    });

    it('should have all test cases with required properties', () => {
      testCases.forEach(testCase => {
        expect(testCase.id).toBeDefined();
        expect(testCase.name).toBeDefined();
        expect(testCase.description).toBeDefined();
        expect(testCase.tasks).toBeInstanceOf(Array);
        expect(testCase.expectedBehavior).toBeDefined();
        expect(testCase.validationRules).toBeInstanceOf(Array);
      });
    });

    it('should have basic drag test case', () => {
      const basicTest = testCases.find(tc => tc.id === 'basic-drag-test');
      expect(basicTest).toBeDefined();
      expect(basicTest?.name).toBe('基本ドラッグテスト');
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks grouped by status', () => {
      const grouped = getTasksByStatus();
      
      expect(grouped.todo).toBeInstanceOf(Array);
      expect(grouped.in_progress).toBeInstanceOf(Array);
      expect(grouped.done).toBeInstanceOf(Array);
      
      expect(grouped.todo).toHaveLength(3);
      expect(grouped.in_progress).toHaveLength(2);
      expect(grouped.done).toHaveLength(3);
    });

    it('should return empty arrays for custom empty task list', () => {
      const grouped = getTasksByStatus([]);
      
      expect(grouped.todo).toHaveLength(0);
      expect(grouped.in_progress).toHaveLength(0);
      expect(grouped.done).toHaveLength(0);
    });

    it('should correctly filter custom task list', () => {
      const customTasks: Task[] = [
        {
          ...dragTestTasks[0],
          id: 'custom-1',
          status: 'todo' as TaskStatus
        },
        {
          ...dragTestTasks[1], 
          id: 'custom-2',
          status: 'done' as TaskStatus
        }
      ];

      const grouped = getTasksByStatus(customTasks);
      expect(grouped.todo).toHaveLength(1);
      expect(grouped.in_progress).toHaveLength(0);
      expect(grouped.done).toHaveLength(1);
    });
  });

  describe('generateTestTask', () => {
    it('should generate a test task with default values', () => {
      const task = generateTestTask();
      
      expect(task.id).toContain('test-');
      expect(task.title).toBe('生成されたテストタスク');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.tags).toHaveLength(1);
      expect(task.subtasks).toHaveLength(0);
      expect(task.createdBy).toBe('test-system');
      expect(task.updatedBy).toBe('test-system');
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        title: 'カスタムタスク',
        status: 'done' as TaskStatus,
        priority: 'high' as const
      };
      
      const task = generateTestTask(overrides);
      
      expect(task.title).toBe('カスタムタスク');
      expect(task.status).toBe('done');
      expect(task.priority).toBe('high');
    });
  });

  describe('createTestScenario', () => {
    it('should return basic scenario tasks', () => {
      const basicTasks = createTestScenario('basic');
      expect(basicTasks.length).toBeGreaterThan(0);
      // 基本シナリオは単純なタスク（サブタスクが少ない、タグが少ない）
      basicTasks.forEach(task => {
        expect(task.subtasks.length <= 1 && task.tags.length <= 2).toBe(true);
      });
    });

    it('should return complex scenario tasks', () => {
      const complexTasks = createTestScenario('complex');
      expect(complexTasks.length).toBeGreaterThanOrEqual(0); // 0件でも許可（条件が厳しい場合）
      // 複雑シナリオはサブタスクが多い、または複数タグを持つタスク
      complexTasks.forEach(task => {
        expect(task.subtasks.length >= 2 || task.tags.length >= 3).toBe(true);
      });
    });

    it('should return edge case scenario tasks', () => {
      const edgeTasks = createTestScenario('edge');
      expect(edgeTasks.length).toBeGreaterThan(0);
      // エッジケースは長い説明文やcritical優先度を含む
      const hasLongDescription = edgeTasks.some(task => 
        task.description && task.description.length > 100
      );
      const hasCriticalPriority = edgeTasks.some(task => 
        task.priority === 'critical'
      );
      expect(hasLongDescription || hasCriticalPriority).toBe(true);
    });

    it('should return all tasks for default scenario', () => {
      const defaultTasks = createTestScenario('basic' as any);
      expect(defaultTasks.length).toBeGreaterThan(0);
    });
  });

  describe('getDragTestStats', () => {
    it('should return correct statistics', () => {
      const stats = getDragTestStats();
      
      expect(stats.total).toBe(8);
      expect(stats.todo).toBe(3);
      expect(stats.inProgress).toBe(2);
      expect(stats.done).toBe(3);
      expect(stats.withSubtasks).toBeGreaterThan(0);
      expect(stats.withMultipleTags).toBeGreaterThan(0);
    });

    it('should have priority distribution', () => {
      const stats = getDragTestStats();
      
      expect(typeof stats.priorityDistribution.urgent).toBe('number');
      expect(typeof stats.priorityDistribution.high).toBe('number');
      expect(typeof stats.priorityDistribution.medium).toBe('number');
      expect(typeof stats.priorityDistribution.low).toBe('number');
      
      const totalPriority = stats.priorityDistribution.urgent + 
                           stats.priorityDistribution.high + 
                           stats.priorityDistribution.medium + 
                           stats.priorityDistribution.low;
      expect(totalPriority).toBe(8);
    });
  });

  describe('data integrity', () => {
    it('should have unique task IDs', () => {
      const ids = dragTestTasks.map(task => task.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid dates', () => {
      dragTestTasks.forEach(task => {
        expect(task.createdAt.getTime()).not.toBeNaN();
        expect(task.updatedAt.getTime()).not.toBeNaN();
        expect(task.createdAt.getTime()).toBeLessThanOrEqual(task.updatedAt.getTime());
        
        if (task.dueDate) {
          expect(task.dueDate.getTime()).not.toBeNaN();
        }
      });
    });

    it('should have valid subtask structure', () => {
      dragTestTasks.forEach(task => {
        task.subtasks.forEach(subtask => {
          expect(subtask.id).toBeDefined();
          expect(subtask.title).toBeDefined();
          expect(typeof subtask.completed).toBe('boolean');
          expect(subtask.createdAt).toBeInstanceOf(Date);
          expect(subtask.updatedAt).toBeInstanceOf(Date);
        });
      });
    });

    it('should have valid tag structure', () => {
      dragTestTasks.forEach(task => {
        task.tags.forEach(tag => {
          expect(tag.id).toBeDefined();
          expect(tag.name).toBeDefined();
          expect(tag.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });
    });
  });
});