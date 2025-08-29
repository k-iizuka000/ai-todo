import { Router } from 'express';
import { validateRequest, requireAuth } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ProjectService } from '../services/ProjectService.js';
import { prisma } from '../config/database.js';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectQueryParamsSchema,
  ProjectIdParamSchema,
  AddProjectMemberSchema,
  UpdateProjectMemberSchema,
  ProjectMemberIdParamSchema,
  BulkUpdateProjectsSchema
} from '../schemas/projectSchemas.js';

const router = Router();
const projectService = new ProjectService(prisma);

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Get paginated list of projects
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [name, status, priority, createdAt, updatedAt, startDate, endDate, deadline, budget]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved projects
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  requireAuth,
  validateRequest({ query: ProjectQueryParamsSchema }),
  asyncHandler(async (req, res) => {
    const { filter, pagination, sort } = req.query as any;
    const userId = req.user?.id;

    const result = await projectService.getProjects(filter, pagination, sort, userId);

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: result.projects,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Successfully retrieved project
 *       400:
 *         description: Invalid project ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Project not found
 */
router.get(
  '/:id',
  requireAuth,
  validateRequest({ params: ProjectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const includeStats = req.query.includeStats === 'true';
    const userId = req.user?.id;

    let project;
    if (includeStats) {
      project = await projectService.getProjectWithStats(id, userId);
    } else {
      project = await projectService.getProjectById(id, userId);
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: project,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectInput'
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireAuth,
  validateRequest({ body: CreateProjectSchema }),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const project = await projectService.createProject(req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectInput'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.put(
  '/:id',
  requireAuth,
  validateRequest({ params: ProjectIdParamSchema, body: UpdateProjectSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const project = await projectService.updateProject(id, req.body, userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.delete(
  '/:id',
  requireAuth,
  validateRequest({ params: ProjectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await projectService.deleteProject(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or cannot be deleted',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/bulk:
 *   patch:
 *     summary: Bulk update projects
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateProjectsInput'
 *     responses:
 *       200:
 *         description: Projects updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions for some projects
 */
router.patch(
  '/bulk',
  requireAuth,
  validateRequest({ body: BulkUpdateProjectsSchema }),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await projectService.bulkUpdateProjects(req.body, userId);

    res.json({
      success,
      message: success ? 'Projects updated successfully' : 'Failed to update projects',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{id}/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Projects]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Project not found
 */
router.get(
  '/:id/stats',
  requireAuth,
  validateRequest({ params: ProjectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const stats = await projectService.getProjectStats(id, userId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Project statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// プロジェクトメンバー管理のエンドポイント

/**
 * @swagger
 * /api/v1/projects/{id}/members:
 *   post:
 *     summary: Add a member to the project
 *     tags: [Project Members]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddProjectMemberInput'
 *     responses:
 *       201:
 *         description: Member added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: User is already a member
 */
router.post(
  '/:id/members',
  requireAuth,
  validateRequest({ params: ProjectIdParamSchema, body: AddProjectMemberSchema }),
  asyncHandler(async (req, res) => {
    const { id: projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await projectService.addProjectMember(projectId, req.body, userId);

    res.status(201).json({
      success,
      message: success ? 'Member added successfully' : 'Failed to add member',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/members/{userId}:
 *   put:
 *     summary: Update a project member's role
 *     tags: [Project Members]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectMemberInput'
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Member not found
 */
router.put(
  '/:projectId/members/:userId',
  requireAuth,
  validateRequest({ params: ProjectMemberIdParamSchema, body: UpdateProjectMemberSchema }),
  asyncHandler(async (req, res) => {
    const { projectId, userId: targetUserId } = req.params;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await projectService.updateProjectMember(projectId, targetUserId, req.body, requesterId);

    res.json({
      success,
      message: success ? 'Member role updated successfully' : 'Failed to update member role',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from the project
 *     tags: [Project Members]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Member not found
 */
router.delete(
  '/:projectId/members/:userId',
  requireAuth,
  validateRequest({ params: ProjectMemberIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { projectId, userId: targetUserId } = req.params;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await projectService.removeProjectMember(projectId, targetUserId, requesterId);

    res.json({
      success,
      message: success ? 'Member removed successfully' : 'Failed to remove member',
      timestamp: new Date().toISOString(),
    });
  })
);

export { router as projectRoutes };