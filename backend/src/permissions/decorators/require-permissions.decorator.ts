import { SetMetadata } from '@nestjs/common';

import type { PermissionKey } from '../permission-keys.js';

export const REQUIRE_PERMISSIONS_KEY =
  'require_permissions';

export const RequirePermissions = (
  ...keys: PermissionKey[]
) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, keys);