import { beforeEach } from '@jest/globals';
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => ({
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        task: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        project: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    })),
}));
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn(() => ({ userId: 'test-user-id' })),
    JsonWebTokenError: Error,
    TokenExpiredError: Error,
}));
jest.mock('bcryptjs', () => ({
    hash: jest.fn(() => Promise.resolve('hashed-password')),
    compare: jest.fn(() => Promise.resolve(true)),
}));
beforeEach(() => {
    jest.clearAllMocks();
});
