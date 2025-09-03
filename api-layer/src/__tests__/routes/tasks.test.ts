import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { taskApiRoutes } from '../../routes/tasks';
import { authMiddleware } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';

// Prismaのモック
jest.mock('@prisma/client');
jest.mock('jsonwebtoken');

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
} as any;

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

// テスト用アプリセットアップ
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // テスト用認証ミドルウェア（実際のJWT検証をスキップ）
  app.use('/api/tasks', (req: any, res, next) => {
    req.userId = 'test-user-id';
    next();
  });
  
  app.use('/api/tasks', taskApiRoutes);
  app.use(errorHandler);
  
  return app;
};

describe('Task API Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    
    // ユーザー存在確認のモック
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'test-user-id',
      status: 'ACTIVE'
    });
  });

  describe('GET /api/tasks', () => {
    it('should return user tasks successfully', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task 1',
          description: 'Test Description 1',
          status: 'TODO',
          priority: 'HIGH',
          createdBy: 'test-user-id',
          assigneeId: 'test-user-id',
          project: null,
          tags: [],
          subtasks: [],
          assignee: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: { displayName: 'Test User' }
          },
          creator: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: { displayName: 'Test User' }
          }
        }
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(response.body).toEqual(mockTasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { assigneeId: 'test-user-id' },
            { createdBy: 'test-user-id' }
          ]
        },
        include: expect.objectContaining({
          project: true,
          tags: expect.any(Object),
          subtasks: true,
          assignee: expect.any(Object),
          creator: expect.any(Object)
        }),
        orderBy: { updatedAt: 'desc' }
      });
    });

    it('should handle database error', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tasks')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch tasks'
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a specific task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task 1',
        description: 'Test Description 1',
        status: 'TODO',
        priority: 'HIGH',
        createdBy: 'test-user-id',
        assigneeId: 'test-user-id',
        project: null,
        tags: [],
        subtasks: [],
        assignee: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        },
        creator: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        },
        comments: []
      };

      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/api/tasks/task-1')
        .expect(200);

      expect(response.body).toEqual(mockTask);
    });

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/tasks/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const newTaskData = {
        title: 'New Task',
        description: 'New task description',
        status: 'TODO',
        priority: 'MEDIUM'
      };

      const createdTask = {
        id: 'new-task-id',
        ...newTaskData,
        createdBy: 'test-user-id',
        assigneeId: 'test-user-id',
        project: null,
        tags: [],
        subtasks: [],
        assignee: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        },
        creator: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        }
      };

      mockPrisma.task.create.mockResolvedValue(createdTask);

      const response = await request(app)
        .post('/api/tasks')
        .send(newTaskData)
        .expect(201);

      expect(response.body).toEqual(createdTask);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Task',
          description: 'New task description',
          status: 'TODO',
          priority: 'MEDIUM',
          createdBy: 'test-user-id',
          assigneeId: 'test-user-id',
        }),
        include: expect.any(Object)
      });
    });

    it('should return 400 for missing title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Task without title'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Title is required'
      });
    });

    it('should validate project access when projectId provided', async () => {
      const newTaskData = {
        title: 'New Task',
        projectId: 'project-1'
      };

      // プロジェクトが存在しない場合
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/tasks')
        .send(newTaskData)
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied to project'
      });
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Original Task',
        createdBy: 'test-user-id',
        assigneeId: 'test-user-id',
        projectId: null
      };

      const updateData = {
        title: 'Updated Task',
        status: 'IN_PROGRESS'
      };

      const updatedTask = {
        ...existingTask,
        ...updateData,
        updatedBy: 'test-user-id',
        project: null,
        tags: [],
        subtasks: [],
        assignee: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        },
        creator: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: { displayName: 'Test User' }
        }
      };

      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue(updatedTask);

      const response = await request(app)
        .put('/api/tasks/task-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedTask);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          title: 'Updated Task',
          status: 'IN_PROGRESS',
          updatedBy: 'test-user-id'
        }),
        include: expect.any(Object)
      });
    });

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/tasks/non-existent')
        .send({ title: 'Updated Task' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found'
      });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task to delete',
        createdBy: 'test-user-id'
      };

      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.delete.mockResolvedValue(existingTask);

      await request(app)
        .delete('/api/tasks/task-1')
        .expect(204);

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' }
      });
    });

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/tasks/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found or access denied'
      });
    });

    it('should only allow task creator to delete', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task to delete',
        createdBy: 'other-user-id' // 異なるユーザー
      };

      mockPrisma.task.findFirst.mockResolvedValue(null); // 権限チェックで見つからない

      const response = await request(app)
        .delete('/api/tasks/task-1')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Task not found or access denied'
      });
    });
  });

  describe('PATCH /api/tasks/:id/archive', () => {
    it('should archive a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task to archive',
        createdBy: 'test-user-id',
        assigneeId: 'test-user-id'
      };

      const archivedTask = {
        ...existingTask,
        archivedAt: new Date(),
        project: null,
        tags: [],
        subtasks: []
      };

      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue(archivedTask);

      const response = await request(app)
        .patch('/api/tasks/task-1/archive')
        .expect(200);

      expect(response.body).toEqual(archivedTask);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          archivedAt: expect.any(Date),
          updatedBy: 'test-user-id'
        }),
        include: expect.any(Object)
      });
    });
  });

  describe('PATCH /api/tasks/:id/unarchive', () => {
    it('should unarchive a task successfully', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Task to unarchive',
        createdBy: 'test-user-id',
        assigneeId: 'test-user-id',
        archivedAt: new Date()
      };

      const unarchivedTask = {
        ...existingTask,
        archivedAt: null,
        project: null,
        tags: [],
        subtasks: []
      };

      mockPrisma.task.findFirst.mockResolvedValue(existingTask);
      mockPrisma.task.update.mockResolvedValue(unarchivedTask);

      const response = await request(app)
        .patch('/api/tasks/task-1/unarchive')
        .expect(200);

      expect(response.body).toEqual(unarchivedTask);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          archivedAt: null,
          updatedBy: 'test-user-id'
        }),
        include: expect.any(Object)
      });
    });
  });
});