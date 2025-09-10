import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
export const createAuthMiddleware = (prismaClient) => async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET environment variable is not set');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        const decoded = jwt.verify(token, jwtSecret);
        const user = await prismaClient.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, status: true }
        });
        if (!user) {
            res.status(401).json({ error: 'Invalid token. User not found.' });
            return;
        }
        if (user.status !== 'ACTIVE') {
            res.status(401).json({ error: 'Account is inactive.' });
            return;
        }
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token.' });
        }
        else if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired.' });
        }
        else {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Authentication failed.' });
        }
    }
};
let defaultPrisma = null;
const getDefaultPrisma = () => {
    if (!defaultPrisma) {
        if (process.env.NODE_ENV === 'test') {
            throw new Error('Default PrismaClient should not be used in test environment. Use createAuthMiddleware with mocked client instead.');
        }
        defaultPrisma = new PrismaClient();
    }
    return defaultPrisma;
};
export const authMiddleware = process.env.NODE_ENV === 'test'
    ? (() => { throw new Error('Use createAuthMiddleware in tests'); })
    : createAuthMiddleware(getDefaultPrisma());
export const generateToken = (userId) => {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new Error('Valid userId is required');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign({ userId: userId.trim() }, jwtSecret, { expiresIn: '24h' });
};
export const verifyToken = (token) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Valid token is required');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    try {
        const decoded = jwt.verify(token.trim(), jwtSecret);
        if (!decoded.userId || typeof decoded.userId !== 'string') {
            throw new Error('Invalid token payload');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        else if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        }
        else if (error instanceof Error && error.message.includes('payload')) {
            throw error;
        }
        else {
            throw new Error('Token verification failed');
        }
    }
};
export const createOptionalAuth = (prismaClient) => async (req, _res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (token && process.env.JWT_SECRET) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prismaClient.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, status: true }
            });
            if (user && user.status === 'ACTIVE') {
                req.userId = decoded.userId;
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
export const optionalAuth = process.env.NODE_ENV === 'test'
    ? (() => { throw new Error('Use createOptionalAuth in tests'); })
    : createOptionalAuth(getDefaultPrisma());
