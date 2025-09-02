import { ApiError, AuthError, ValidationError, ServerError, NetworkError, isNetworkError } from './errors';
export class ApiClient {
    baseURL;
    maxRetries = 3;
    constructor(baseURL) {
        this.baseURL = baseURL;
    }
    getAuthHeaders() {
        const token = process.env.TEST_JWT_TOKEN;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async request(endpoint, options = {}) {
        let retries = 0;
        const url = `${this.baseURL}${endpoint}`;
        while (retries < this.maxRetries) {
            try {
                const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeaders(),
                        ...options.headers,
                    },
                    ...options,
                };
                const response = await fetch(url, config);
                if (!response.ok) {
                    await this.handleErrorResponse(response, retries);
                }
                if (response.status === 204) {
                    return undefined;
                }
                return await response.json();
            }
            catch (error) {
                if (error instanceof AuthError || error instanceof ValidationError || error instanceof ServerError) {
                    console.error('API request failed:', error);
                    throw error;
                }
                if ((isNetworkError(error) || error instanceof NetworkError) && retries < this.maxRetries - 1) {
                    retries++;
                    await this.delay(1000 * retries);
                    continue;
                }
                if (isNetworkError(error) || error instanceof NetworkError) {
                    throw new NetworkError('Maximum retry attempts exceeded');
                }
                console.error('API request failed:', error);
                throw error;
            }
        }
        throw new NetworkError('Unexpected error: Maximum retry attempts exceeded');
    }
    async handleErrorResponse(response, _retries) {
        let errorData = {};
        try {
            errorData = await response.json();
        }
        catch {
        }
        switch (response.status) {
            case 401:
                console.warn('Authentication failed - automatic logout should be triggered');
                throw new AuthError(errorData.error || 'Authentication failed');
            case 400:
                throw new ValidationError(errorData.error || 'Validation failed', errorData);
            case 500:
                throw new ServerError(errorData.error || 'Internal server error');
            case 503:
                throw new NetworkError(errorData.error || 'Service unavailable');
            default:
                throw new ApiError(errorData.error || `HTTP ${response.status}`, response.status);
        }
    }
    async get(endpoint, options) {
        return this.request(endpoint, { method: 'GET', ...options });
    }
    async post(endpoint, data, options) {
        return this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
    }
    async put(endpoint, data, options) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
    }
    async delete(endpoint, options) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
    async patch(endpoint, data, options) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        });
    }
}
export const apiClient = new ApiClient(process.env.VITE_API_URL || 'http://localhost:3010');
