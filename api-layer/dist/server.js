import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { taskApiRoutes } from './routes/tasks';
import { projectApiRoutes } from './routes/projects';
import { tagApiRoutes } from './routes/tags';
const app = express();
const PORT = process.env.API_PORT || 3003;
const prisma = new PrismaClient();
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            service: 'ai-todo-api-layer',
            database: 'connected',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            service: 'ai-todo-api-layer',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    }
});
app.use((req, res, next) => {
    req.userId = process.env.DEFAULT_USER_ID || 'dev-user-001';
    next();
});
app.use('/api/v1/tasks', taskApiRoutes);
app.use('/api/v1/projects', projectApiRoutes);
app.use('/api/v1/tags', tagApiRoutes);
app.use('*', (_req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested endpoint does not exist.',
        availableEndpoints: [
            '/health',
            '/api/v1/tasks',
            '/api/v1/projects',
            '/api/v1/tags'
        ]
    });
});
app.use((err, _req, res, _next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});
const server = app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       AI Todo API Layer - Database Mode      ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║ 🚀 Server running on port ${PORT}              ║`);
    console.log(`║ 📊 Health: http://localhost:${PORT}/health     ║`);
    console.log(`║ 🗄️  Database: PostgreSQL (Prisma ORM)         ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║ API Endpoints:                               ║');
    console.log(`║ 📝 Tasks:    /api/v1/tasks                   ║`);
    console.log(`║ 📁 Projects: /api/v1/projects                ║`);
    console.log(`║ 🏷️  Tags:     /api/v1/tags                    ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('\n⚠️  Note: Mock mode has been completely removed.');
    console.log('All data is now persisted in the database.\n');
});
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} signal received: closing HTTP server`);
    server.close(() => {
        console.log('HTTP server closed');
    });
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
