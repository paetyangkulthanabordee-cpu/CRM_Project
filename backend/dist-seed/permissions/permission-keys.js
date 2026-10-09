import { UserRole } from '../users/entities/user.entity.js';
export const PERMISSION_KEYS = [
    'dashboard',
    'customers',
    'salesPipeline',
    'documents',
    'reports',
    'administration',
];
export const EDITABLE_ROLES = [
    UserRole.MANAGER,
    UserRole.SALES,
];
export const ADMIN_PERMISSIONS = {
    dashboard: true,
    customers: true,
    salesPipeline: true,
    documents: true,
    reports: true,
    administration: true,
    permissions: true,
    auditLogs: true,
};
export const DEFAULT_ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: { ...ADMIN_PERMISSIONS },
    [UserRole.MANAGER]: {
        dashboard: true,
        customers: true,
        salesPipeline: true,
        documents: true,
        reports: true,
        administration: false,
        permissions: false,
        auditLogs: false,
    },
    [UserRole.SALES]: {
        dashboard: true,
        customers: true,
        salesPipeline: true,
        documents: true,
        reports: false,
        administration: false,
        permissions: false,
        auditLogs: false,
    },
};
export function toPermissionSet(granted) {
    const administration = granted.administration === true;
    return {
        dashboard: granted.dashboard === true,
        customers: granted.customers === true,
        salesPipeline: granted.salesPipeline === true,
        documents: granted.documents === true,
        reports: granted.reports === true,
        administration,
        permissions: administration,
        auditLogs: administration,
    };
}
//# sourceMappingURL=permission-keys.js.map