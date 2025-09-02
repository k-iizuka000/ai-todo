import * as express from 'express';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';
const router = express.Router();
const prisma = new PrismaClient();
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                error: 'All fields are required',
                code: 'MISSING_FIELDS',
                details: { email: !email, password: !password, name: !name }
            });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL_FORMAT'
            });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({
                error: 'Password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
            return;
        }
        if (name.trim().length < 1 || name.length > 100) {
            res.status(400).json({
                error: 'Name must be between 1 and 100 characters',
                code: 'INVALID_NAME_LENGTH'
            });
            return;
        }
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        if (existingUser) {
            res.status(400).json({
                error: 'User with this email already exists',
                code: 'EMAIL_ALREADY_EXISTS'
            });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                name: name.trim()
            }
        });
        const token = generateToken(user.id);
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Registration error:', error);
        }
        else {
            console.error('Registration error occurred');
        }
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            res.status(400).json({
                error: 'User with this email already exists',
                code: 'EMAIL_ALREADY_EXISTS'
            });
            return;
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                error: 'Invalid email format',
                code: 'INVALID_EMAIL_FORMAT'
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });
        if (!user) {
            res.status(400).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(400).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }
        const token = generateToken(user.id);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Login error:', error);
        }
        else {
            console.error('Login error occurred');
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.get('/me', async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Get user error:', error);
        }
        else {
            console.error('Get user error occurred');
        }
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});
router.post('/logout', (_req, res) => {
    res.json({
        message: 'Logout successful. Please remove the token from client storage.'
    });
});
router.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'auth',
        timestamp: new Date().toISOString()
    });
});
export { router as authRoutes };
