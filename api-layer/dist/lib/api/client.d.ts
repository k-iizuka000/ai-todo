export declare class ApiClient {
    private baseURL;
    private maxRetries;
    constructor(baseURL: string);
    private getAuthHeaders;
    private delay;
    request<T>(endpoint: string, options?: RequestInit): Promise<T>;
    private handleErrorResponse;
    get<T>(endpoint: string, options?: RequestInit): Promise<T>;
    post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T>;
    put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T>;
    delete<T>(endpoint: string, options?: RequestInit): Promise<T>;
    patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T>;
}
export declare const apiClient: ApiClient;
