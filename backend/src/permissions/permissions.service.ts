import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../users/entities/user.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  EDITABLE_ROLES,
  PERMISSION_KEYS,
  toPermissionSet,
} from './permission-keys.js';
import type {
  PermissionKey,
  RolePermissionSet,
} from './permission-keys.js';

export interface RoleMatrix {
  [key: string]: Record<string, boolean>;
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly repository: Repository<RolePermission>,
  ) {}

  async getMatrix(): Promise<RoleMatrix> {
    const rows = await this.repository.find();

    const matrix: RoleMatrix = {};

    for (const role of [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES,
    ]) {
      const set: Record<string, boolean> = {};

      for (const key of PERMISSION_KEYS) {
        const row = rows.find(
          (item) =>
            item.role === role &&
            item.permissionKey === key,
        );

        set[key] = row ? row.granted : false;
      }

      matrix[role] = set;
    }

    return matrix;
  }

  async getForRole(
    role: UserRole,
  ): Promise<RolePermissionSet> {
    if (role === UserRole.ADMIN) {
      return { ...ADMIN_PERMISSIONS };
    }

    const fallback =
      DEFAULT_ROLE_PERMISSIONS[role] ??
      DEFAULT_ROLE_PERMISSIONS[UserRole.SALES];

    const rows = await this.repository.find({
      where: { role },
    });

    if (rows.length === 0) {
      return { ...fallback };
    }

    const granted: Partial<Record<PermissionKey, boolean>> = {};

    for (const key of PERMISSION_KEYS) {
      const row = rows.find(
        (item) => item.permissionKey === key,
      );

      granted[key] = row ? row.granted : false;
    }

    return toPermissionSet(granted);
  }

  async updateMatrix(
    matrix: Record<string, Record<string, boolean>>,
  ): Promise<RoleMatrix> {
    for (const role of EDITABLE_ROLES) {
      const requested = matrix[role];

      if (!requested) {
        continue;
      }

      for (const key of PERMISSION_KEYS) {
        if (typeof requested[key] !== 'boolean') {
          continue;
        }

        await this.repository.upsert(
          {
            role,
            permissionKey: key,
            granted: requested[key],
          },
          {
            conflictPaths: ['role', 'permissionKey'],
          },
        );
      }
    }

    return this.getMatrix();
  }
}