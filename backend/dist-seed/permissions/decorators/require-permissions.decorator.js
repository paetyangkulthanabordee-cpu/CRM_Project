import { SetMetadata } from '@nestjs/common';
export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';
export const RequirePermissions = (...keys) => SetMetadata(REQUIRE_PERMISSIONS_KEY, keys);
//# sourceMappingURL=require-permissions.decorator.js.map