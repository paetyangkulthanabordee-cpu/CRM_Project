import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../../users/entities/user.entity.js';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { PermissionsService } from '../permissions.service.js';
import type { PermissionKey } from '../permission-keys.js';

interface RequestWithUser {
  user?: { sub: number; email: string; role: string };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      PermissionKey[] | undefined
    >(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    const role = request.user?.role as UserRole | undefined;

    if (!role) {
      throw new ForbiddenException(
        'ไม่สามารถตรวจสอบสิทธิ์การใช้งานได้',
      );
    }

    if (role === UserRole.ADMIN) {
      return true;
    }

    const permissions =
      await this.permissionsService.getForRole(role);

    const allowed = required.every(
      (key) => permissions[key] === true,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ (Admin)',
      );
    }

    return true;
  }
}