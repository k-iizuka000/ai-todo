// Controller Layer - Clean Architecture
// Exports all controllers for dependency injection

export { BaseController } from './BaseController.js';
export { TaskController } from './TaskController.js';
export { ProjectController } from './ProjectController.js';
export { ScheduleController } from './ScheduleController.js';

// Controller instances factory
// This would typically be handled by a DI container in larger applications
import { TaskService } from '@/services/TaskService.js';
import { ProjectService } from '@/services/ProjectService.js';
import { ScheduleService } from '@/services/ScheduleService.js';
import { TaskRepository } from '@/repositories/TaskRepository.js';
import { ProjectRepository } from '@/repositories/ProjectRepository.js';
import { ScheduleRepository } from '@/repositories/ScheduleRepository.js';

// Manual dependency injection (simplified for this project)
// In production, consider using InversifyJS or similar DI container

// Import Controller classes for instantiation
import { TaskController } from './TaskController.js';
import { ProjectController } from './ProjectController.js';
import { ScheduleController } from './ScheduleController.js';

const taskRepository = new TaskRepository();
const projectRepository = new ProjectRepository();
const scheduleRepository = new ScheduleRepository();

// Service instances with dependency injection
const taskService = new TaskService(taskRepository);
const projectService = new ProjectService(projectRepository);
const scheduleService = new ScheduleService(scheduleRepository);

// Controller instances with dependency injection
export const taskController = new TaskController(taskService);
export const projectController = new ProjectController(projectService);
export const scheduleController = new ScheduleController(scheduleService);