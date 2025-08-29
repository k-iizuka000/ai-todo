import { Request, Response } from 'express';
import { TaskService } from '@/services/TaskService.js';
import { BaseController } from './BaseController.js';

/**
 * Task Controller - Clean Architecture Pattern
 * Handles HTTP requests/responses and delegates business logic to services
 */
export class TaskController extends BaseController {
  private taskService: TaskService;

  constructor(taskService: TaskService) {
    super();
    this.taskService = taskService;
  }

  /**
   * Get paginated list of tasks with filters
   */
  public async getTasks(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const filters = this.buildStandardFilters(req);

    const queryParams = {
      ...pagination,
      ...filters,
    };

    const result = await this.taskService.getTasks(userId, queryParams);
    this.sendPaginatedSuccess(res, result.tasks, result.meta);
  }

  /**
   * Get task by ID
   */
  public async getTaskById(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'taskId');
    const task = await this.taskService.getTaskById(id, userId);
    this.sendSuccess(res, task);
  }

  /**
   * Create a new task
   */
  public async createTask(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const taskData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    };

    const task = await this.taskService.createTask(taskData);
    this.sendSuccess(res, task, 'Task created successfully', 201);
  }

  /**
   * Update task by ID
   */
  public async updateTask(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'taskId');
    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const task = await this.taskService.updateTask(id, updateData, userId);
    this.sendSuccess(res, task, 'Task updated successfully');
  }

  /**
   * Update task status
   */
  public async updateTaskStatus(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    this.validateUUID(id, 'taskId');
    const task = await this.taskService.updateTaskStatus(id, status, userId);
    this.sendSuccess(res, task, `Task status updated to ${status}`);
  }

  /**
   * Archive task (soft delete)
   */
  public async archiveTask(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'taskId');
    await this.taskService.archiveTask(id, userId);
    this.sendSuccess(res, null, 'Task archived successfully');
  }

  /**
   * Delete task permanently
   */
  public async deleteTask(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'taskId');
    await this.taskService.deleteTask(id, userId);
    this.sendNoContent(res);
  }

  /**
   * Duplicate task
   */
  public async duplicateTask(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'taskId');
    const duplicatedTask = await this.taskService.duplicateTask(id, userId);
    this.sendSuccess(res, duplicatedTask, 'Task duplicated successfully', 201);
  }

  /**
   * Get task statistics
   */
  public async getTaskStats(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { projectId } = req.query;
    
    if (projectId) {
      this.validateUUID(projectId as string, 'projectId');
    }
    
    const stats = await this.taskService.getTaskStats(userId, projectId as string);
    this.sendSuccess(res, stats);
  }
}