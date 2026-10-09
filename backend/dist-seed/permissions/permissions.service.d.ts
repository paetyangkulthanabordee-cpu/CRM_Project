import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import type { RolePermissionSet } from './permission-keys.js';
export interface RoleMatrix {
    [key: string]: Record<string, boolean>;
}
export declare class PermissionsService {
    private readonly repository;
    constructor(repository: Repository<RolePermission>);
    getMatrix(): Promise<RoleMatrix>;
    getForRole(role: UserRole): Promise<RolePermissionSet>;
    updateMatrix(matrix: Record<string, Record<string, boolean>>): Promise<RoleMatrix>;
}
