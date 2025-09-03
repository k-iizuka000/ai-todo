export declare class ApiError extends Error {
    readonly status: number;
    readonly code?: string;
    constructor(message: string, status: number, code?: string);
}
export declare class AuthError extends ApiError {
    constructor(message?: string);
}
export declare class ValidationError extends ApiError {
    readonly details?: any;
    constructor(message?: string, details?: any);
}
export declare class ServerError extends ApiError {
    constructor(message?: string);
}
export declare class NetworkError extends ApiError {
    constructor(message?: string);
}
export declare function isNetworkError(error: any): boolean;
