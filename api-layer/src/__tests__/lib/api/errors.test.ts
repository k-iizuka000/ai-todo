import {
  ApiError,
  AuthError,
  ValidationError,
  ServerError,
  NetworkError,
  isNetworkError,
} from '../../../lib/api/errors';

describe('Error Classes', () => {
  describe('ApiError', () => {
    it('should create ApiError with message and status', () => {
      const error = new ApiError('Test error', 400);
      
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.name).toBe('ApiError');
      expect(error.code).toBeUndefined();
    });

    it('should create ApiError with message, status and code', () => {
      const error = new ApiError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
    });
  });

  describe('AuthError', () => {
    it('should create AuthError with default message', () => {
      const error = new AuthError();
      
      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Authentication failed');
      expect(error.status).toBe(401);
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('should create AuthError with custom message', () => {
      const error = new AuthError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
      expect(error.status).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with default message', () => {
      const error = new ValidationError();
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toBeUndefined();
    });

    it('should create ValidationError with custom message and details', () => {
      const details = { field: 'email', rule: 'required' };
      const error = new ValidationError('Email is required', details);
      
      expect(error.message).toBe('Email is required');
      expect(error.details).toEqual(details);
    });
  });

  describe('ServerError', () => {
    it('should create ServerError with default message', () => {
      const error = new ServerError();
      
      expect(error).toBeInstanceOf(ServerError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Internal server error');
      expect(error.status).toBe(500);
      expect(error.name).toBe('ServerError');
      expect(error.code).toBe('SERVER_ERROR');
    });

    it('should create ServerError with custom message', () => {
      const error = new ServerError('Database connection failed');
      
      expect(error.message).toBe('Database connection failed');
      expect(error.status).toBe(500);
    });
  });

  describe('NetworkError', () => {
    it('should create NetworkError with default message', () => {
      const error = new NetworkError();
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Network error');
      expect(error.status).toBe(503);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should create NetworkError with custom message', () => {
      const error = new NetworkError('Connection timeout');
      
      expect(error.message).toBe('Connection timeout');
      expect(error.status).toBe(503);
    });
  });
});

describe('isNetworkError', () => {
  it('should return true for TypeError', () => {
    const error = new TypeError('Failed to fetch');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for error with TypeError name', () => {
    const error = { name: 'TypeError', message: 'Network error' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for error with NETWORK_ERROR code', () => {
    const error = { code: 'NETWORK_ERROR', message: 'Network error' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for error with fetch in message', () => {
    const error = { message: 'Failed to fetch resource' };
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for non-network errors', () => {
    const error = { message: 'Validation error' };
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for AuthError', () => {
    const error = new AuthError();
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});