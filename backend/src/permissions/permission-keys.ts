import { UserRole } from '../users/entities/user.entity.js';

export const PERMISSION_KEYS = [
  'dashboard',
  'customers',
  'salesPipeline',
  'orderPipeline',
  'documents',
  'products',
  'productManagement',
  'reports',
  'administration',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface RolePermissionSet {
  dashboard: boolean;
  customers: boolean;
  salesPipeline: boolean;
  orderPipeline: boolean;
  documents: boolean;
  products: boolean;
  productManagement: boolean;
  reports: boolean;
  administration: boolean;
  permissions: boolean;
  auditLogs: boolean;
}

export const EDITABLE_ROLES = [
  UserRole.MANAGER,
  UserRole.SALES,
] as const;

export const ADMIN_PERMISSIONS: RolePermissionSet = {
  dashboard: true,
  customers: true,
  salesPipeline: true,
  orderPipeline: true,
  documents: true,
  products: true,
  productManagement: true,
  reports: true,
  administration: true,
  permissions: true,
  auditLogs: true,
};

/*
 * ค่าเริ่มต้น ใช้ตอนยังไม่มีข้อมูลในตาราง role_permissions
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  UserRole,
  RolePermissionSet
> = {
  [UserRole.ADMIN]: { ...ADMIN_PERMISSIONS },
  [UserRole.MANAGER]: {
    dashboard: true,
    customers: true,
    salesPipeline: true,
    orderPipeline: true,
    documents: true,
    products: true,
    productManagement: true,
    reports: true,
    administration: false,
    permissions: false,
    auditLogs: false,
  },
  [UserRole.SALES]: {
    dashboard: true,
    customers: true,
    salesPipeline: true,
    orderPipeline: true,
    documents: true,
    products: true,
    productManagement: false,
    reports: false,
    administration: false,
    permissions: false,
    auditLogs: false,
  },
};

export function toPermissionSet(
  granted: Partial<Record<PermissionKey, boolean>>,
): RolePermissionSet {
  const administration = granted.administration === true;

  return {
    dashboard: granted.dashboard === true,
    customers: granted.customers === true,
    salesPipeline: granted.salesPipeline === true,
    orderPipeline: granted.orderPipeline === true,
    documents: granted.documents === true,
    products: granted.products === true,
    productManagement:
      granted.productManagement === true,
    reports: granted.reports === true,
    administration,
    permissions: administration,
    auditLogs: administration,
  };
}