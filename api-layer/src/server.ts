import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.API_PORT || 3003;

// セキュリティミドルウェア設定
app.use(helmet());

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSONパーサー設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-todo-api-layer',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// モックタスクデータ（一時的）
let mockTasks: any[] = [
  {
    id: '1',
    title: 'Sample Task',
    description: 'This is a sample task',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    assigneeId: null,
    tags: [],
    subtasks: [],
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  },
  {
    id: '2',
    title: 'プロジェクト連携テストタスク',
    description: 'プロジェクトとの連携をテストするためのタスク',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    assigneeId: null,
    tags: [],
    subtasks: [],
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  },
  {
    id: '3',
    title: '修正後テストタスク',
    description: '修正が正常に動作するかテストするタスク',
    status: 'todo',
    priority: 'medium',
    projectId: null,
    assigneeId: null,
    tags: [],
    subtasks: [],
    dueDate: null,
    estimatedHours: null,
    actualHours: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  }
];

// 既存タスクのデータ修正機能（デバッグ用）
const fixExistingTasks = () => {
  mockTasks = mockTasks.map(task => {
    if (!task.status) task.status = 'todo';
    if (!task.priority) task.priority = 'medium';
    if (task.projectId === undefined) task.projectId = null;
    if (task.assigneeId === undefined) task.assigneeId = null;
    if (!task.tags) task.tags = [];
    if (!task.subtasks) task.subtasks = [];
    if (task.dueDate === undefined) task.dueDate = null;
    if (task.estimatedHours === undefined) task.estimatedHours = null;
    if (task.actualHours === undefined) task.actualHours = 0;
    if (!task.createdBy) task.createdBy = 'mock-user';
    if (!task.updatedBy) task.updatedBy = 'mock-user';
    return task;
  });
};

// タスクAPIエンドポイント（シンプル実装）
app.get('/api/v1/tasks', (_req, res) => {
  // 既存タスクデータの修正を自動実行
  fixExistingTasks();
  res.json(mockTasks);
});

app.post('/api/v1/tasks', (req, res) => {
  // バリデーション: titleは必須
  if (!req.body.title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const task = {
    id: Date.now().toString(),
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status || 'todo', // デフォルトでtodo
    priority: req.body.priority || 'medium', // デフォルトでmedium
    projectId: req.body.projectId || null,
    assigneeId: req.body.assigneeId || null,
    tags: req.body.tags || [],
    subtasks: req.body.subtasks || [],
    dueDate: req.body.dueDate || null,
    estimatedHours: req.body.estimatedHours || null,
    actualHours: req.body.actualHours || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  };
  mockTasks.push(task);
  res.status(201).json(task);
});

app.put('/api/v1/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = mockTasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  mockTasks[taskIndex] = {
    ...mockTasks[taskIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  return res.json(mockTasks[taskIndex]);
});

app.delete('/api/v1/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = mockTasks.findIndex(task => task.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  mockTasks.splice(taskIndex, 1);
  return res.status(204).send();
});

// モックプロジェクトデータ
let mockProjects: any[] = [
  {
    id: 'project-1',
    name: 'Sample Project',
    description: 'This is a sample project for testing',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    budget: 100000,
    ownerId: 'mock-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  }
];

// プロジェクトAPIエンドポイント
app.get('/api/v1/projects', (req, res) => {
  console.log('GET /api/v1/projects - Query params:', req.query);
  
  // クエリパラメータを処理（フロントエンドとの互換性のため）
  const {
    includeStats = false,
    includeMembers = false,
    includeTags = false,
    page = 1,
    limit = 10
  } = req.query;

  // 統計情報を含めたプロジェクトデータを作成
  const enhancedProjects = mockProjects.map(project => ({
    ...project,
    ...(includeStats === 'true' && {
      stats: {
        totalTasks: 5,
        completedTasks: 2,
        inProgressTasks: 2,
        todoTasks: 1,
        completionRate: 40
      }
    }),
    ...(includeMembers === 'true' && {
      members: [
        { id: 'mock-user', name: 'Mock User', role: 'owner' }
      ]
    }),
    ...(includeTags === 'true' && {
      tags: [
        { id: '1', name: 'Important', color: '#ff0000' },
        { id: '2', name: 'Development', color: '#00ff00' }
      ]
    })
  }));

  res.json({
    success: true,
    message: 'Projects retrieved successfully',
    data: enhancedProjects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: mockProjects.length,
      totalPages: Math.ceil(mockProjects.length / parseInt(limit))
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = mockProjects.find(p => p.id === id);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Project retrieved successfully',
    data: project,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/v1/projects', (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ 
      success: false,
      message: 'Project name is required',
      timestamp: new Date().toISOString()
    });
  }

  const project = {
    id: Date.now().toString(),
    name: req.body.name,
    description: req.body.description || '',
    status: req.body.status || 'ACTIVE',
    priority: req.body.priority || 'MEDIUM',
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    budget: req.body.budget || null,
    ownerId: 'mock-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  };

  mockProjects.push(project);
  
  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project,
    timestamp: new Date().toISOString()
  });
});

app.put('/api/v1/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectIndex = mockProjects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Project not found',
      timestamp: new Date().toISOString()
    });
  }

  mockProjects[projectIndex] = {
    ...mockProjects[projectIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: 'mock-user'
  };

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: mockProjects[projectIndex],
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/v1/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectIndex = mockProjects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or cannot be deleted',
      timestamp: new Date().toISOString()
    });
  }

  mockProjects.splice(projectIndex, 1);
  
  res.json({
    success: true,
    message: 'Project deleted successfully',
    timestamp: new Date().toISOString()
  });
});

// モックタグデータ
let mockTags: any[] = [
  {
    id: '1',
    name: 'Urgent',
    color: '#ff4757',
    description: 'High priority tasks',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  },
  {
    id: '2',
    name: 'Development',
    color: '#3742fa',
    description: 'Development related tasks',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  }
];

// タグAPIエンドポイント
app.get('/api/v1/tags', (_req, res) => {
  console.log('GET /api/v1/tags - Returning tags:', mockTags.length);
  res.json({
    success: true,
    message: 'Tags retrieved successfully',
    data: mockTags,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/tags/:id', (req, res) => {
  const { id } = req.params;
  const tag = mockTags.find(t => t.id === id);
  
  if (!tag) {
    return res.status(404).json({
      success: false,
      message: 'Tag not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Tag retrieved successfully',
    data: tag,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/v1/tags', (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({
      success: false,
      message: 'Tag name is required',
      timestamp: new Date().toISOString()
    });
  }

  // 重複チェック
  const existingTag = mockTags.find(t => t.name.toLowerCase() === req.body.name.toLowerCase());
  if (existingTag) {
    return res.status(409).json({
      success: false,
      message: 'Tag with this name already exists',
      timestamp: new Date().toISOString()
    });
  }

  const tag = {
    id: Date.now().toString(),
    name: req.body.name,
    color: req.body.color || '#6c5ce7',
    description: req.body.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
    updatedBy: 'mock-user'
  };

  mockTags.push(tag);
  
  res.status(201).json({
    success: true,
    message: 'Tag created successfully',
    data: tag,
    timestamp: new Date().toISOString()
  });
});

app.put('/api/v1/tags/:id', (req, res) => {
  const { id } = req.params;
  const tagIndex = mockTags.findIndex(t => t.id === id);
  
  if (tagIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tag not found',
      timestamp: new Date().toISOString()
    });
  }

  // 重複チェック（更新時）
  if (req.body.name) {
    const existingTag = mockTags.find(t => t.id !== id && t.name.toLowerCase() === req.body.name.toLowerCase());
    if (existingTag) {
      return res.status(409).json({
        success: false,
        message: 'Tag with this name already exists',
        timestamp: new Date().toISOString()
      });
    }
  }

  mockTags[tagIndex] = {
    ...mockTags[tagIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
    updatedBy: 'mock-user'
  };

  res.json({
    success: true,
    message: 'Tag updated successfully',
    data: mockTags[tagIndex],
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/v1/tags/:id', (req, res) => {
  const { id } = req.params;
  const tagIndex = mockTags.findIndex(t => t.id === id);
  
  if (tagIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tag not found',
      timestamp: new Date().toISOString()
    });
  }

  mockTags.splice(tagIndex, 1);
  
  res.json({
    success: true,
    message: 'Tag deleted successfully',
    timestamp: new Date().toISOString()
  });
});

// 404エラーハンドラー
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist.'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔐 API Layer running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📝 Task endpoints (v1): http://localhost:${PORT}/api/v1/tasks/*`);
  console.log(`📝 Task endpoints (legacy): http://localhost:${PORT}/api/tasks/*`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});