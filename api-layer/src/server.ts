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