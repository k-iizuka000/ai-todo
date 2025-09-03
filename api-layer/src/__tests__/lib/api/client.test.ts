import { ApiClient } from '../../../lib/api/client';
import { AuthError, ValidationError, ServerError, NetworkError } from '../../../lib/api/errors';

// fetchのモック
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ApiClient', () => {
  let client: ApiClient;
  const baseURL = 'http://localhost:3010';

  beforeEach(() => {
    client = new ApiClient(baseURL);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with baseURL', () => {
      expect(client).toBeInstanceOf(ApiClient);
    });
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await client.get<typeof mockData>('/test');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });

    it('should handle 204 No Content response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.delete('/test');

      expect(result).toBeUndefined();
    });

    it('should include auth headers when token is available', async () => {
      process.env.TEST_JWT_TOKEN = 'test-token';
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await client.get('/test');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      delete process.env.TEST_JWT_TOKEN;
    });
  });

  describe('error handling', () => {
    it('should throw AuthError for 401 responses', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(client.get('/test')).rejects.toThrow(AuthError);
      await expect(client.get('/test')).rejects.toThrow('Unauthorized');
    });

    it('should throw ValidationError for 400 responses', async () => {
      const errorDetails = { field: 'email', message: 'Invalid email' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Validation failed', ...errorDetails }),
      });

      await expect(client.post('/test', {})).rejects.toThrow(ValidationError);
    });

    it('should throw ServerError for 500 responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal error' }),
      });

      await expect(client.get('/test')).rejects.toThrow(ServerError);
    });

    it('should handle JSON parse errors in error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on network errors', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await client.get('/test');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should throw NetworkError after max retries', async () => {
      (fetch as jest.Mock).mockRejectedValue(new TypeError('Network error'));

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 503 Service Unavailable', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Service unavailable' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await client.get('/test');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should throw NetworkError for 503 after max retries', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' }),
      });

      await expect(client.get('/test')).rejects.toThrow(NetworkError);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('HTTP methods', () => {
    it('should make POST request with data', async () => {
      const postData = { name: 'test', value: 123 };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, ...postData }),
      });

      const result = await client.post('/test', postData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual({ id: 1, ...postData });
    });

    it('should make PUT request with data', async () => {
      const putData = { id: 1, name: 'updated' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => putData,
      });

      const result = await client.put('/test/1', putData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putData),
      });
      expect(result).toEqual(putData);
    });

    it('should make DELETE request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await client.delete('/test/1');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toBeUndefined();
    });

    it('should make PATCH request with data', async () => {
      const patchData = { name: 'patched' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, ...patchData }),
      });

      const result = await client.patch('/test/1', patchData);

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchData),
      });
      expect(result).toEqual({ id: 1, ...patchData });
    });

    it('should handle requests without data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await client.post('/test');

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: undefined,
      });
    });
  });

  describe('custom headers', () => {
    it('should merge custom headers with default headers', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await client.get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'application/xml', // Should override default
        },
      });

      expect(fetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/xml',
          'X-Custom-Header': 'custom-value',
        },
      });
    });
  });
});

describe('apiClient default instance', () => {
  it('should create default instance with environment URL', () => {
    // デフォルトインスタンスがエクスポートされていることを確認
    const { apiClient } = require('../../../lib/api/client');
    expect(apiClient).toBeInstanceOf(ApiClient);
  });
});