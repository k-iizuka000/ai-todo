import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './routes/auth.js';
import { taskApiRoutes } from './routes/tasks.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.API_PORT || 3010;

// セキュリティミドルウェア設定
app.use(helmet());

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// レート制限設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエスト/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// JSONパーサー設定
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント（認証不要）
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ai-todo-api-layer',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 認証不要エンドポイント
app.use('/api/auth', authRoutes);

// 認証必要エンドポイント
app.use('/api/tasks', authMiddleware, taskApiRoutes);

// 404エラーハンドラー
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist.'
  });
});

// エラーハンドリングミドルウェア（最後に配置）
app.use(errorHandler);

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔐 API Layer running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📝 Task endpoints: http://localhost:${PORT}/api/tasks/*`);
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