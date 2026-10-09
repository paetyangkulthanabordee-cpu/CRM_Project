import { UserRole } from '../users/entities/user.entity.js';
export declare const PERMISSION_KEYS: readonly ["dashboard", "customers", "salesPipeline", "documents", "reports", "administration"];
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export interface RolePermissionSet {
    dashboard: boolean;
    customers: boolean;
    salesPipeline: boolean;
    documents: boolean;
    reports: boolean;
    administration: boolean;
    permissions: boolean;
    auditLogs: boolean;
}
export declare const EDITABLE_ROLES: readonly [UserRole.MANAGER, UserRole.SALES];
export declare const ADMIN_PERMISSIONS: RolePermissionSet;
export declare const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissionSet>;
export declare function toPermissionSet(granted: Partial<Record<PermissionKey, boolean>>): RolePermissionSet;
