import { AdminLoginInput, AdminChangePasswordInput } from './adminAuth.schema.js';
export declare class AdminAuthService {
    static login(input: AdminLoginInput, ipAddress?: string): Promise<{
        token: string;
        expiresAt: string;
        admin: {
            id: string;
            email: string;
            username: string;
            role: string;
        };
    }>;
    static logout(adminId: string, ipAddress?: string): Promise<{
        message: string;
    }>;
    static getProfile(adminId: string): Promise<{
        id: string;
        email: string;
        username: string;
        role: string;
        isActive: boolean;
        createdAt: Date;
    }>;
    static changePassword(adminId: string, input: AdminChangePasswordInput, ipAddress?: string): Promise<{
        message: string;
    }>;
}
