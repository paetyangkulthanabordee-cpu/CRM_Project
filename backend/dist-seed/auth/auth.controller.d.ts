import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        accessToken: string;
        user: {
            userId: number;
            name: string;
            email: string;
            role: import("../users/entities/user.entity.js").UserRole;
        };
        permissions: import("../permissions/permission-keys.js").RolePermissionSet;
    }>;
}
