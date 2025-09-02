import { ApiClient } from './client.js';
import { AuthError, ValidationError, ServerError, NetworkError } from './errors.js';
export class AuthAPI {
    client;
    constructor() {
        this.client = new ApiClient(process.env.VITE_API_URL || 'http://localhost:3010');
    }
    async login(credentials) {
        try {
            this.validateLoginCredentials(credentials);
            const response = await this.client.post('/api/auth/login', credentials);
            this.validateAuthResponse(response);
            return response;
        }
        catch (error) {
            this.handleAuthError(error, 'login');
            throw error;
        }
    }
    async register(data) {
        try {
            this.validateRegisterData(data);
            const response = await this.client.post('/api/auth/register', data);
            this.validateAuthResponse(response);
            return response;
        }
        catch (error) {
            this.handleAuthError(error, 'register');
            throw error;
        }
    }
    async logout() {
        try {
            console.log('Logout successful - JWT token should be cleared from client storage');
        }
        catch (error) {
            console.warn('Logout warning:', error);
        }
    }
    validateLoginCredentials(credentials) {
        if (!credentials.email || typeof credentials.email !== 'string') {
            throw new ValidationError('Email is required and must be a string');
        }
        if (!credentials.password || typeof credentials.password !== 'string') {
            throw new ValidationError('Password is required and must be a string');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(credentials.email)) {
            throw new ValidationError('Invalid email format');
        }
    }
    validateRegisterData(data) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            throw new ValidationError('Name is required and must be a non-empty string');
        }
        if (!data.email || typeof data.email !== 'string') {
            throw new ValidationError('Email is required and must be a string');
        }
        if (!data.password || typeof data.password !== 'string') {
            throw new ValidationError('Password is required and must be a string');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new ValidationError('Invalid email format');
        }
        if (data.password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters long');
        }
    }
    validateAuthResponse(response) {
        if (!response.token || typeof response.token !== 'string') {
            throw new ServerError('Invalid server response: missing or invalid token');
        }
        if (!response.user || typeof response.user !== 'object') {
            throw new ServerError('Invalid server response: missing or invalid user data');
        }
        if (!response.user.id || !response.user.email || !response.user.name) {
            throw new ServerError('Invalid server response: incomplete user data');
        }
    }
    handleAuthError(error, operation) {
        console.error(`Auth ${operation} error:`, {
            name: error.name,
            message: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
        });
        if (error instanceof ValidationError) {
            return;
        }
        else if (error instanceof AuthError) {
            return;
        }
        else if (error instanceof NetworkError) {
            return;
        }
    }
}
export const authAPI = new AuthAPI();
