export class ApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}
export class AuthError extends ApiError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthError';
    }
}
export class ValidationError extends ApiError {
    details;
    constructor(message = 'Validation failed', details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.details = details;
    }
}
export class ServerError extends ApiError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'SERVER_ERROR');
        this.name = 'ServerError';
    }
}
export class NetworkError extends ApiError {
    constructor(message = 'Network error') {
        super(message, 503, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }
}
export function isNetworkError(error) {
    if (!error) {
        return false;
    }
    return error instanceof TypeError ||
        error.name === 'TypeError' ||
        error.code === 'NETWORK_ERROR' ||
        error.message?.includes('fetch');
}
