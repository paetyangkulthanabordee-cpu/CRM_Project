import { JwtService } from '@nestjs/jwt';
import { PermissionsService } from '../permissions/permissions.service.js';
import { UsersService } from '../users/users.service.js';
export declare class AuthService {
    private readonly usersService;
    private readonly permissionsService;
    private readonly jwtService;
    constructor(usersService: UsersService, permissionsService: PermissionsService, jwtService: JwtService);
    login(email: string, password: string): Promise<{
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
