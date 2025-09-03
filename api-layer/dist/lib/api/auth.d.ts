export interface LoginCredentials {
    email: string;
    password: string;
}
export interface RegisterData {
    email: string;
    password: string;
    name: string;
}
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}
export declare class AuthAPI {
    private client;
    constructor();
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(data: RegisterData): Promise<AuthResponse>;
    logout(): Promise<void>;
    private validateLoginCredentials;
    private validateRegisterData;
    private validateAuthResponse;
    private handleAuthError;
}
export declare const authAPI: AuthAPI;
