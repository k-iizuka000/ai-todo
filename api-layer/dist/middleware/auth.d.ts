import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
interface AuthRequest extends Request {
    userId?: string;
}
export declare const createAuthMiddleware: (prismaClient: PrismaClient) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (userId: string) => string;
export declare const verifyToken: (token: string) => {
    userId: string;
};
export declare const createOptionalAuth: (prismaClient: PrismaClient) => (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export {};
