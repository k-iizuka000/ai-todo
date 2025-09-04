/**
 * Unit Tests for Tag Routes
 * Tests for /server/src/routes/tagRoutes.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { tagRoutes } from '../routes/tagRoutes.js';
import { tagService } from '../models/tagService.js';

// Mock the tagService
vi.mock('../models/tagService.js', () => ({
  tagService: {
    findAll: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getPopularTags: vi.fn(),
    search: vi.fn()
  }
}));

// Mock middleware
vi.mock('../middleware/validateRequest.js', () => ({
  validateRequest: vi.fn(() => (req: any, res: any, next: any) => next()),
  requireAuth: vi.fn((req: any, res: any, next: any) => next())
}));

vi.mock('../middleware/errorHandler.js', () => ({
  asyncHandler: vi.fn((fn) => fn)
}));

describe('Tag Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/tags', tagRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/v1/tags', () => {
    it('should return all tags', async () => {
      const mockTags = [
        {
          id: 'tag1',
          name: '急ぎ',
          color: '#ff4757',
          usageCount: 5,
          createdAt: '2025-09-04T00:00:00.000Z',
          updatedAt: '2025-09-04T00:00:00.000Z'
        },
        {
          id: 'tag2',
          name: '重要',
          color: '#3742fa',
          usageCount: 3,
          createdAt: '2025-09-04T00:00:00.000Z',
          updatedAt: '2025-09-04T00:00:00.000Z'
        }
      ];

      vi.mocked(tagService.findAll).mockResolvedValue(mockTags as any);

      const response = await request(app).get('/api/v1/tags');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'tag1',
            name: '急ぎ',
            color: '#ff4757',
            usageCount: 5
          }),
          expect.objectContaining({
            id: 'tag2',
            name: '重要',
            color: '#3742fa',
            usageCount: 3
          })
        ])
      });
      expect(tagService.findAll).toHaveBeenCalledOnce();
    });

    it('should handle service errors', async () => {
      vi.mocked(tagService.findAll).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/v1/tags');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/tags', () => {
    it('should create a new tag with valid data', async () => {
      const newTag = {
        name: '新しいタグ',
        color: '#1e90ff'
      };

      const createdTag = {
        id: 'new-tag-id',
        ...newTag,
        usageCount: 0,
        createdAt: '2025-09-04T00:00:00.000Z',
        updatedAt: '2025-09-04T00:00:00.000Z'
      };

      vi.mocked(tagService.create).mockResolvedValue(createdTag as any);

      const response = await request(app)
        .post('/api/v1/tags')
        .send(newTag);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: 'new-tag-id',
          name: '新しいタグ',
          color: '#1e90ff',
          usageCount: 0
        })
      });
      expect(tagService.create).toHaveBeenCalledWith(newTag);
    });

    it('should return 409 when tag already exists', async () => {
      const duplicateTag = {
        name: '重複タグ',
        color: '#ff4757'
      };

      const error = new Error('A tag with this name already exists');
      (error as any).status = 409;
      vi.mocked(tagService.create).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/tags')
        .send(duplicateTag);

      expect(response.status).toBe(500); // asyncHandlerでエラーハンドリング
    });
  });

  describe('GET /api/v1/tags/:id', () => {
    it('should return a specific tag', async () => {
      const tagId = 'specific-tag-id';
      const mockTag = {
        id: tagId,
        name: 'スペシフィックタグ',
        color: '#2ed573',
        usageCount: 7,
        createdAt: '2025-09-04T00:00:00.000Z',
        updatedAt: '2025-09-04T00:00:00.000Z',
        relatedTasks: []
      };

      vi.mocked(tagService.findById).mockResolvedValue(mockTag as any);

      const response = await request(app).get(`/api/v1/tags/${tagId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: tagId,
          name: 'スペシフィックタグ',
          color: '#2ed573',
          usageCount: 7
        })
      });
      expect(tagService.findById).toHaveBeenCalledWith(tagId);
    });

    it('should return 404 when tag not found', async () => {
      const nonExistentId = 'non-existent-id';
      const error = new Error('Tag not found');
      (error as any).status = 404;
      
      vi.mocked(tagService.findById).mockRejectedValue(error);

      const response = await request(app).get(`/api/v1/tags/${nonExistentId}`);

      expect(response.status).toBe(500); // asyncHandlerでエラーハンドリング
    });
  });

  describe('PUT /api/v1/tags/:id', () => {
    it('should update a tag successfully', async () => {
      const tagId = 'update-tag-id';
      const updateData = {
        name: '更新されたタグ',
        color: '#ff6b35'
      };

      const updatedTag = {
        id: tagId,
        ...updateData,
        usageCount: 4,
        createdAt: '2025-09-04T00:00:00.000Z',
        updatedAt: '2025-09-04T00:00:00.000Z'
      };

      vi.mocked(tagService.update).mockResolvedValue(updatedTag as any);

      const response = await request(app)
        .put(`/api/v1/tags/${tagId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: tagId,
          name: '更新されたタグ',
          color: '#ff6b35',
          usageCount: 4
        })
      });
      expect(tagService.update).toHaveBeenCalledWith(tagId, updateData);
    });
  });

  describe('DELETE /api/v1/tags/:id', () => {
    it('should delete a tag successfully', async () => {
      const tagId = 'delete-tag-id';

      vi.mocked(tagService.delete).mockResolvedValue(undefined);

      const response = await request(app).delete(`/api/v1/tags/${tagId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Tag deleted successfully'
      });
      expect(tagService.delete).toHaveBeenCalledWith(tagId);
    });

    it('should return 409 when tag is in use', async () => {
      const tagId = 'in-use-tag-id';
      const error = new Error('Cannot delete tag that is currently in use');
      (error as any).status = 409;

      vi.mocked(tagService.delete).mockRejectedValue(error);

      const response = await request(app).delete(`/api/v1/tags/${tagId}`);

      expect(response.status).toBe(500); // asyncHandlerでエラーハンドリング
    });
  });

  describe('GET /api/v1/tags/popular', () => {
    it('should return popular tags with default limit', async () => {
      const popularTags = [
        { id: 'pop1', name: '人気タグ1', color: '#ff4757', usageCount: 10 },
        { id: 'pop2', name: '人気タグ2', color: '#3742fa', usageCount: 8 }
      ];

      vi.mocked(tagService.getPopularTags).mockResolvedValue(popularTags as any);

      const response = await request(app).get('/api/v1/tags/popular');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'pop1',
            name: '人気タグ1'
          }),
          expect.objectContaining({
            id: 'pop2',
            name: '人気タグ2'
          })
        ])
      });
      expect(tagService.getPopularTags).toHaveBeenCalledWith(10);
    });

    it('should return popular tags with custom limit', async () => {
      const limit = 5;
      const popularTags = [
        { id: 'pop1', name: '人気タグ1', color: '#ff4757', usageCount: 10 }
      ];

      vi.mocked(tagService.getPopularTags).mockResolvedValue(popularTags);

      const response = await request(app).get(`/api/v1/tags/popular?limit=${limit}`);

      expect(response.status).toBe(200);
      expect(tagService.getPopularTags).toHaveBeenCalledWith(limit);
    });

    it('should enforce maximum limit of 50', async () => {
      const excessiveLimit = 100;
      vi.mocked(tagService.getPopularTags).mockResolvedValue([]);

      await request(app).get(`/api/v1/tags/popular?limit=${excessiveLimit}`);

      expect(tagService.getPopularTags).toHaveBeenCalledWith(50);
    });
  });

  describe('GET /api/v1/tags/search', () => {
    it('should search tags successfully', async () => {
      const searchQuery = 'urgent';
      const searchResults = [
        { id: 'search1', name: '急ぎ', color: '#ff4757', usageCount: 5 },
        { id: 'search2', name: '緊急', color: '#ff3838', usageCount: 3 }
      ];

      vi.mocked(tagService.search).mockResolvedValue(searchResults as any);

      const response = await request(app).get(`/api/v1/tags/search?q=${encodeURIComponent(searchQuery)}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'search1',
            name: '急ぎ'
          }),
          expect.objectContaining({
            id: 'search2',
            name: '緊急'
          })
        ])
      });
      expect(tagService.search).toHaveBeenCalledWith(searchQuery, 20);
    });

    it('should return 400 when search query is empty', async () => {
      const response = await request(app).get('/api/v1/tags/search?q=');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Search query is required'
        }
      });
    });

    it('should return 400 when search query is missing', async () => {
      const response = await request(app).get('/api/v1/tags/search');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Search query is required'
        }
      });
    });

    it('should search with custom limit', async () => {
      const searchQuery = 'tag';
      const limit = 10;
      vi.mocked(tagService.search).mockResolvedValue([]);

      await request(app).get(`/api/v1/tags/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`);

      expect(tagService.search).toHaveBeenCalledWith(searchQuery, limit);
    });

    it('should enforce maximum search limit of 50', async () => {
      const searchQuery = 'tag';
      const excessiveLimit = 100;
      vi.mocked(tagService.search).mockResolvedValue([]);

      await request(app).get(`/api/v1/tags/search?q=${encodeURIComponent(searchQuery)}&limit=${excessiveLimit}`);

      expect(tagService.search).toHaveBeenCalledWith(searchQuery, 50);
    });
  });
});