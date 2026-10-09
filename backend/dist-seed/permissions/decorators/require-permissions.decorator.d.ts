import type { PermissionKey } from '../permission-keys.js';
export declare const REQUIRE_PERMISSIONS_KEY = "require_permissions";
export declare const RequirePermissions: (...keys: PermissionKey[]) => import("@nestjs/common").CustomDecorator<string>;
