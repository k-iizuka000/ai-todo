import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';
import { createAuthMiddleware, createOptionalAuth, generateToken, verifyToken } from '../../middleware/auth';

// PrismaClient のモック
const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;

// モックの定義
const mockRequest = () => {
  const req = {} as Request & { userId?: string };
  req.header = vi.fn();
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res;
};

const mockNext = vi.fn() as NextFunction;

// 環境変数のモック
const originalEnv = process.env;

describe('createAuthMiddleware', () => {
  let authMiddleware: (req: Request & { userId?: string }, res: Response, next: NextFunction) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
    
    authMiddleware = createAuthMiddleware(mockPrismaClient);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系', () => {
    test('有効なJWTトークンで認証が成功する', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);
      (mockPrismaClient.user.findUnique as any).mockResolvedValue({
        id: userId,
        status: 'ACTIVE',
      });

      await authMiddleware(req, res, next);

      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, status: true }
      });
    });
  });

  describe('異常系 - Authorizationヘッダー関連', () => {
    test('Authorizationヘッダーが存在しない場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue(undefined);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Bearerプレフィックスがない場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue('invalid-header');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('トークンが空文字の場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue('Bearer ');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('トークンが空白のみの場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue('Bearer   ');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('異常系 - JWT_SECRET関連', () => {
    test('JWT_SECRETが設定されていない場合は500エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      delete process.env.JWT_SECRET;
      req.header = vi.fn().mockReturnValue('Bearer some-token');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('異常系 - JWT検証関連', () => {
    test('無効なトークンの場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue('Bearer invalid-token');

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('期限切れトークンの場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      // 期限切れトークンを作成（より確実に期限切れにする）
      const expiredToken = jwt.sign(
        { userId: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 }, 
        'test-secret-key'
      );
      req.header = vi.fn().mockReturnValue(`Bearer ${expiredToken}`);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('ユーザーが存在しない場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'nonexistent-user';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);

      (mockPrismaClient.user.findUnique as any).mockResolvedValue(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token. User not found.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('ユーザーがINACTIVE状態の場合は401エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);

      (mockPrismaClient.user.findUnique as any).mockResolvedValue({
        id: userId,
        status: 'INACTIVE',
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account is inactive.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('データベースエラーの場合は500エラー', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);

      (mockPrismaClient.user.findUnique as any).mockRejectedValue(new Error('Database error'));

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('generateToken', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系', () => {
    test('有効なuserIdでJWTトークンが生成される', () => {
      const userId = 'user123';
      const token = generateToken(userId);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // トークンが正しく検証できることを確認
      const decoded = jwt.verify(token, 'test-secret-key') as { userId: string };
      expect(decoded.userId).toBe(userId);
    });

    test('前後の空白があるuserIdでも正常にトークンが生成される', () => {
      const userId = '  user123  ';
      const token = generateToken(userId);

      const decoded = jwt.verify(token, 'test-secret-key') as { userId: string };
      expect(decoded.userId).toBe('user123'); // トリムされていることを確認
    });
  });

  describe('異常系', () => {
    test('JWT_SECRETが設定されていない場合はエラー', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateToken('user123')).toThrow('JWT_SECRET environment variable is not set');
    });

    test('userIdが空文字の場合はエラー', () => {
      expect(() => generateToken('')).toThrow('Valid userId is required');
    });

    test('userIdがundefinedの場合はエラー', () => {
      expect(() => generateToken(undefined as any)).toThrow('Valid userId is required');
    });

    test('userIdがnullの場合はエラー', () => {
      expect(() => generateToken(null as any)).toThrow('Valid userId is required');
    });

    test('userIdが空白のみの場合はエラー', () => {
      expect(() => generateToken('   ')).toThrow('Valid userId is required');
    });

    test('userIdが文字列以外の場合はエラー', () => {
      expect(() => generateToken(123 as any)).toThrow('Valid userId is required');
    });
  });
});

describe('verifyToken', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系', () => {
    test('有効なトークンでペイロードが返される', () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });

      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userId);
    });

    test('前後の空白があるトークンでも正常に処理される', () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      const tokenWithSpaces = `  ${token}  `;

      const decoded = verifyToken(tokenWithSpaces);

      expect(decoded.userId).toBe(userId);
    });
  });

  describe('異常系', () => {
    test('JWT_SECRETが設定されていない場合はエラー', () => {
      delete process.env.JWT_SECRET;
      const token = 'some-token';

      expect(() => verifyToken(token)).toThrow('JWT_SECRET environment variable is not set');
    });

    test('トークンが空文字の場合はエラー', () => {
      expect(() => verifyToken('')).toThrow('Valid token is required');
    });

    test('トークンがundefinedの場合はエラー', () => {
      expect(() => verifyToken(undefined as any)).toThrow('Valid token is required');
    });

    test('トークンが空白のみの場合はエラー', () => {
      expect(() => verifyToken('   ')).toThrow('Valid token is required');
    });

    test('無効なトークンの場合はエラー', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    test('期限切れトークンの場合はエラー', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 }, 
        'test-secret-key'
      );

      expect(() => verifyToken(expiredToken)).toThrow('Invalid token');
    });

    test('userIdがないペイロードの場合はエラー', () => {
      const invalidToken = jwt.sign({ otherField: 'value' }, 'test-secret-key', { expiresIn: '1h' });

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token payload');
    });
  });
});

describe('createOptionalAuth', () => {
  let optionalAuth: (req: Request & { userId?: string }, res: Response, next: NextFunction) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
    
    optionalAuth = createOptionalAuth(mockPrismaClient);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系', () => {
    test('有効なトークンがある場合はuserIdが設定される', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);
      (mockPrismaClient.user.findUnique as any).mockResolvedValue({
        id: userId,
        status: 'ACTIVE',
      });

      await optionalAuth(req, res, next);

      expect(req.userId).toBe(userId);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('トークンがない場合でも処理が継続される', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue(undefined);

      await optionalAuth(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('無効なトークンでも処理が継続される', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      req.header = vi.fn().mockReturnValue('Bearer invalid-token');

      await optionalAuth(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('ユーザーがINACTIVEでも処理が継続される', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext;

      const userId = 'user123';
      const token = jwt.sign({ userId }, 'test-secret-key', { expiresIn: '1h' });
      
      req.header = vi.fn().mockReturnValue(`Bearer ${token}`);
      (mockPrismaClient.user.findUnique as any).mockResolvedValue({
        id: userId,
        status: 'INACTIVE',
      });

      await optionalAuth(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});