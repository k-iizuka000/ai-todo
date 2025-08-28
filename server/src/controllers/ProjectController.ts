import { Request, Response } from 'express';
import { ProjectService } from '@/services/ProjectService.js';
import { BaseController } from './BaseController.js';

/**
 * Project Controller - Clean Architecture Pattern
 */
export class ProjectController extends BaseController {
  private projectService: ProjectService;

  constructor(projectService: ProjectService) {
    super();
    this.projectService = projectService;
  }

  /**
   * Get paginated list of projects
   */
  public async getProjects(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { search } = this.buildStandardFilters(req);
    
    const queryParams = {
      ...pagination,
      search,
      status: this.getArrayParam(req.query.status as string | string[]),
    };

    const result = await this.projectService.getProjects(userId, queryParams);
    this.sendPaginatedSuccess(res, result.projects, result.meta);
  }

  /**
   * Get project by ID
   */
  public async getProjectById(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'projectId');
    const project = await this.projectService.getProjectById(id, userId);
    this.sendSuccess(res, project);
  }

  /**
   * Create a new project
   */
  public async createProject(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const projectData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    };

    const project = await this.projectService.createProject(projectData);
    this.sendSuccess(res, project, 'Project created successfully', 201);
  }

  /**
   * Update project by ID
   */
  public async updateProject(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'projectId');
    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const project = await this.projectService.updateProject(id, updateData, userId);
    this.sendSuccess(res, project, 'Project updated successfully');
  }

  /**
   * Delete project
   */
  public async deleteProject(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'projectId');
    await this.projectService.deleteProject(id, userId);
    this.sendNoContent(res);
  }

  /**
   * Get project statistics
   */
  public async getProjectStats(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    
    this.validateUUID(id, 'projectId');
    const stats = await this.projectService.getProjectStats(id, userId);
    this.sendSuccess(res, stats);
  }

  /**
   * Add member to project
   */
  public async addMember(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id } = req.params;
    const { memberId, role } = req.body;
    
    this.validateUUID(id, 'projectId');
    this.validateUUID(memberId, 'memberId');
    
    const member = await this.projectService.addMember(id, memberId, role, userId);
    this.sendSuccess(res, member, 'Member added successfully', 201);
  }

  /**
   * Remove member from project
   */
  public async removeMember(req: Request, res: Response): Promise<void> {
    const userId = this.getUserId(req);
    const { id, memberId } = req.params;
    
    this.validateUUID(id, 'projectId');
    this.validateUUID(memberId, 'memberId');
    
    await this.projectService.removeMember(id, memberId, userId);
    this.sendSuccess(res, null, 'Member removed successfully');
  }
}