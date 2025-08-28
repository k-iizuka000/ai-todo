import { SwaggerDefinition, Options } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'AI Todo API',
    version: '1.0.0',
    description: `
      AI Todo Management System API with Clean Architecture.
      
      This API provides comprehensive task, project, schedule, and notification management
      functionality built with modern best practices including:
      
      - Clean Architecture pattern
      - Type-safe validation with Zod
      - PostgreSQL with Prisma ORM  
      - RESTful API design
      - Comprehensive error handling
      - Rate limiting and security
      
      ## Authentication
      Currently, the API uses session-based authentication. Include the user ID
      in request headers or through authenticated sessions.
      
      ## Error Handling
      All errors follow a consistent format with appropriate HTTP status codes:
      - 400: Bad Request (validation errors)
      - 401: Unauthorized (authentication required)
      - 403: Forbidden (insufficient permissions)
      - 404: Not Found (resource doesn't exist)
      - 409: Conflict (business logic constraints)
      - 422: Unprocessable Entity (invalid state transition)
      - 429: Too Many Requests (rate limit exceeded)
      - 500: Internal Server Error (unexpected errors)
      
      ## Rate Limiting
      API requests are limited to prevent abuse:
      - Development: 1000 requests per 15 minutes per IP
      - Production: 100 requests per 15 minutes per IP
      
      ## Pagination
      List endpoints support pagination with consistent parameters:
      - \`page\`: Page number (default: 1, max: 1000)
      - \`limit\`: Items per page (default: 10, max: 100)
      
      Responses include pagination metadata in the \`meta\` field.
    `,
    contact: {
      name: 'AI Todo API Support',
      email: 'support@aitodo.example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.aitodo.example.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Users',
      description: 'User management and authentication',
    },
    {
      name: 'Tasks',
      description: 'Task management with CRUD operations, status tracking, and hierarchy support',
    },
    {
      name: 'Projects', 
      description: 'Project management with member roles, statistics, and task organization',
    },
    {
      name: 'Schedules',
      description: 'Daily schedule and time block management with calendar integration',
    },
    {
      name: 'Notifications',
      description: 'Real-time notification system with preferences and bulk operations',
    },
    {
      name: 'Tags',
      description: 'Tag management for organizing tasks and projects',
    },
    {
      name: 'Health',
      description: 'System health and monitoring endpoints',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session_token',
        description: 'Session-based authentication using HTTP-only cookies',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token authentication (future implementation)',
      },
    },
    schemas: {
      // Common schemas
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            description: 'Response data (varies by endpoint)',
          },
          error: {
            type: 'string',
            description: 'Error message if success is false',
          },
          message: {
            type: 'string', 
            description: 'Additional message or context',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO timestamp of the response',
          },
        },
        required: ['success', 'timestamp'],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Items per page',
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of items',
          },
          totalPages: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of pages',
          },
          hasNextPage: {
            type: 'boolean',
            description: 'Whether there are more pages',
          },
          hasPreviousPage: {
            type: 'boolean',
            description: 'Whether there are previous pages',
          },
        },
        required: ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
      },
      PaginatedResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {},
                description: 'Array of items for current page',
              },
              meta: {
                $ref: '#/components/schemas/PaginationMeta',
              },
            },
            required: ['data', 'meta'],
          },
        ],
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            enum: [false],
            description: 'Always false for error responses',
          },
          error: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code for programmatic handling',
          },
          details: {
            type: 'object',
            description: 'Additional error details (e.g., validation errors)',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'ISO timestamp of the error',
          },
        },
        required: ['success', 'error', 'timestamp'],
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            enum: [false],
          },
          error: {
            type: 'string',
            example: 'Validation failed',
          },
          details: {
            type: 'object',
            properties: {
              field: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Array of validation errors for this field',
              },
            },
            additionalProperties: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            description: 'Field-specific validation errors',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['success', 'error', 'details', 'timestamp'],
      },
      
      // Task schemas
      TaskStatus: {
        type: 'string',
        enum: ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'],
        description: 'Task status enumeration',
      },
      Priority: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
        description: 'Priority level enumeration',
      },
      Task: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique task identifier',
          },
          title: {
            type: 'string',
            maxLength: 255,
            description: 'Task title',
          },
          description: {
            type: 'string',
            maxLength: 5000,
            nullable: true,
            description: 'Task description',
          },
          status: {
            $ref: '#/components/schemas/TaskStatus',
          },
          priority: {
            $ref: '#/components/schemas/Priority',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Associated project ID',
          },
          assigneeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Assigned user ID',
          },
          parentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Parent task ID for task hierarchy',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Task due date',
          },
          estimatedHours: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            nullable: true,
            description: 'Estimated completion time in hours',
          },
          actualHours: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            nullable: true,
            description: 'Actual completion time in hours',
          },
          archivedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'When the task was archived (soft delete)',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Task creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
          createdBy: {
            type: 'string',
            format: 'uuid',
            description: 'ID of user who created the task',
          },
          updatedBy: {
            type: 'string',
            format: 'uuid',
            description: 'ID of user who last updated the task',
          },
          project: {
            $ref: '#/components/schemas/ProjectSummary',
            description: 'Associated project information',
          },
          assignee: {
            $ref: '#/components/schemas/UserSummary',
            description: 'Assigned user information',
          },
          creator: {
            $ref: '#/components/schemas/UserSummary',
            description: 'Creator user information',
          },
          tags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Tag',
            },
            description: 'Associated tags',
          },
          subtasks: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Subtask',
            },
            description: 'Child subtasks',
          },
        },
        required: ['id', 'title', 'status', 'priority', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
      },
      CreateTaskRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Task title',
          },
          description: {
            type: 'string',
            maxLength: 5000,
            description: 'Task description',
          },
          status: {
            $ref: '#/components/schemas/TaskStatus',
            default: 'TODO',
          },
          priority: {
            $ref: '#/components/schemas/Priority',
            default: 'MEDIUM',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Associated project ID',
          },
          assigneeId: {
            type: 'string',
            format: 'uuid',
            description: 'Assigned user ID',
          },
          parentId: {
            type: 'string',
            format: 'uuid',
            description: 'Parent task ID for task hierarchy',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Task due date',
          },
          estimatedHours: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            description: 'Estimated completion time in hours',
          },
          tagIds: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
            },
            maxItems: 20,
            description: 'Array of tag IDs to associate with the task',
          },
        },
        required: ['title'],
      },
      UpdateTaskRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Task title',
          },
          description: {
            type: 'string',
            maxLength: 5000,
            description: 'Task description',
          },
          status: {
            $ref: '#/components/schemas/TaskStatus',
          },
          priority: {
            $ref: '#/components/schemas/Priority',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Associated project ID',
          },
          assigneeId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Assigned user ID',
          },
          parentId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Parent task ID for task hierarchy',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Task due date',
          },
          estimatedHours: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            nullable: true,
            description: 'Estimated completion time in hours',
          },
          actualHours: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            nullable: true,
            description: 'Actual completion time in hours',
          },
          tagIds: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
            },
            maxItems: 20,
            description: 'Array of tag IDs to associate with the task',
          },
        },
        minProperties: 1,
      },
      
      // User schemas  
      UserSummary: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User ID',
          },
          profile: {
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                description: 'User display name',
              },
            },
          },
        },
        required: ['id'],
      },
      
      // Project schemas
      ProjectStatus: {
        type: 'string',
        enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
        description: 'Project status enumeration',
      },
      ProjectSummary: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Project ID',
          },
          name: {
            type: 'string',
            description: 'Project name',
          },
          color: {
            type: 'string',
            pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
            description: 'Project color in hex format',
          },
        },
        required: ['id', 'name', 'color'],
      },
      
      // Tag schemas
      Tag: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Tag ID',
          },
          name: {
            type: 'string',
            maxLength: 50,
            description: 'Tag name',
          },
          color: {
            type: 'string',
            pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
            description: 'Tag color in hex format',
          },
          usageCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of times this tag is used',
          },
        },
        required: ['id', 'name', 'color', 'usageCount'],
      },
      
      // Subtask schemas
      Subtask: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Subtask ID',
          },
          title: {
            type: 'string',
            maxLength: 255,
            description: 'Subtask title',
          },
          completed: {
            type: 'boolean',
            description: 'Whether the subtask is completed',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Subtask creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
        required: ['id', 'title', 'completed', 'createdAt', 'updatedAt'],
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
        },
      },
      SortFieldParam: {
        name: 'sortField',
        in: 'query',
        description: 'Field to sort by',
        required: false,
        schema: {
          type: 'string',
        },
      },
      SortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort order',
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Search query string',
        required: false,
        schema: {
          type: 'string',
          maxLength: 100,
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad Request - Invalid input parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFound: {
        description: 'Not Found - Resource does not exist',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Conflict: {
        description: 'Conflict - Resource already exists or constraint violation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      TooManyRequests: {
        description: 'Too Many Requests - Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal Server Error - Unexpected error occurred',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  security: [
    {
      sessionAuth: [],
    },
  ],
};

export const swaggerOptions: Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export default swaggerDefinition;