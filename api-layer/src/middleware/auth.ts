import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthRequest extends Request {
  userId?: string;
}

export const createAuthMiddleware = (prismaClient: PrismaClient) => 
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    // JWT_SECRET が設定されているか確認
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // トークン検証
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    
    // ユーザーが存在し、アクティブかチェック
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
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token.' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired.' });
    } else {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed.' });
    }
  }
};

// 後方互換性のために、デフォルトのPrismaClientインスタンスを使用するミドルウェアも提供
// テスト環境では初期化しない
let defaultPrisma: PrismaClient | null = null;
const getDefaultPrisma = (): PrismaClient => {
  if (!defaultPrisma) {
    // テスト環境では初期化をスキップ
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Default PrismaClient should not be used in test environment. Use createAuthMiddleware with mocked client instead.');
    }
    defaultPrisma = new PrismaClient();
  }
  return defaultPrisma;
};

// テスト環境では初期化されないように条件付きでエクスポート
export const authMiddleware = process.env.NODE_ENV === 'test' 
  ? (() => { throw new Error('Use createAuthMiddleware in tests'); }) as any
  : createAuthMiddleware(getDefaultPrisma());

export const generateToken = (userId: string): string => {
  // バリデーション
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('Valid userId is required');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    { userId: userId.trim() },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): { userId: string } => {
  // バリデーション
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Valid token is required');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const decoded = jwt.verify(token.trim(), jwtSecret) as { userId: string };
    
    // userIdの存在チェック
    if (!decoded.userId || typeof decoded.userId !== 'string') {
      throw new Error('Invalid token payload');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof Error && error.message.includes('payload')) {
      throw error; // カスタムエラーをそのまま再スロー
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// オプショナル認証（ログインしていなくても通すが、ログインしていればユーザー情報を設定）
export const createOptionalAuth = (prismaClient: PrismaClient) =>
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
      
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, status: true }
      });

      if (user && user.status === 'ACTIVE') {
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // オプショナル認証なので、エラーでも処理を継続
    next();
  }
};

// 後方互換性のために、デフォルトのPrismaClientインスタンスを使用するオプショナル認証も提供
export const optionalAuth = process.env.NODE_ENV === 'test' 
  ? (() => { throw new Error('Use createOptionalAuth in tests'); }) as any
  : createOptionalAuth(getDefaultPrisma());