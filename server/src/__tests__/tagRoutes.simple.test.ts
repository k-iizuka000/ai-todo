/**
 * Simple Test for Tag Routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { tagRoutes } from '../routes/tagRoutes.js';

describe('Tag Routes Simple Test', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/tags', tagRoutes);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const response = await request(app).get('/api/v1/tags');
    expect(response.status).toBe(401);
  });
});