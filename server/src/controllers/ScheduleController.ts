import { Request, Response } from 'express';
import { ScheduleService } from '@/services/ScheduleService.js';
import { BaseController } from './BaseController.js';

/**
 * Schedule Controller - Clean Architecture Pattern
 */
export class ScheduleController extends BaseController {
  private scheduleService: ScheduleService;

  constructor(scheduleService: ScheduleService) {
    super();
    this.scheduleService = scheduleService;
  }

  /**
   * Get schedules with date range and filters
   */
  public async getSchedules(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    
    const queryParams = {
      ...pagination,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
      projectId: req.query.projectId as string,
    };

    if (queryParams.projectId) {
      this.validateUUID(queryParams.projectId, 'projectId');
    }

    const result = await this.scheduleService.getSchedules(userId, queryParams);
    this.sendPaginatedSuccess(res, result.schedules, result.meta);
  }

  /**
   * Get schedule by ID
   */
  public async getScheduleById(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'scheduleId');
    const schedule = await this.scheduleService.getScheduleById(id, userId);
    this.sendSuccess(res, schedule);
  }

  /**
   * Create a new schedule
   */
  public async createSchedule(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const scheduleData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    };

    const schedule = await this.scheduleService.createSchedule(scheduleData);
    this.sendSuccess(res, schedule, 'Schedule created successfully', 201);
  }

  /**
   * Update schedule by ID
   */
  public async updateSchedule(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'scheduleId');
    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const schedule = await this.scheduleService.updateSchedule(id, updateData, userId);
    this.sendSuccess(res, schedule, 'Schedule updated successfully');
  }

  /**
   * Delete schedule
   */
  public async deleteSchedule(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'scheduleId');
    await this.scheduleService.deleteSchedule(id, userId);
    this.sendNoContent(res);
  }

  /**
   * Get daily schedule
   */
  public async getDailySchedule(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw this.createApiError(400, 'Invalid date format. Use YYYY-MM-DD', 'INVALID_DATE_FORMAT');
    }

    const dailySchedule = await this.scheduleService.getDailySchedule(userId, date);
    this.sendSuccess(res, dailySchedule);
  }

  /**
   * Get weekly schedule
   */
  public async getWeeklySchedule(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { startDate } = req.params;
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      throw this.createApiError(400, 'Invalid date format. Use YYYY-MM-DD', 'INVALID_DATE_FORMAT');
    }

    const weeklySchedule = await this.scheduleService.getWeeklySchedule(userId, startDate);
    this.sendSuccess(res, weeklySchedule);
  }

  /**
   * Create API error helper (local helper method)
   */
  private createApiError(status: number, message: string, code: string) {
    const error = new Error(message);
    (error as any).status = status;
    (error as any).code = code;
    return error;
  }
}