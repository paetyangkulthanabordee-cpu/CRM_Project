var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { ADMIN_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, EDITABLE_ROLES, PERMISSION_KEYS, toPermissionSet, } from './permission-keys.js';
let PermissionsService = class PermissionsService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async getMatrix() {
        const rows = await this.repository.find();
        const matrix = {};
        for (const role of [
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.SALES,
        ]) {
            const set = {};
            for (const key of PERMISSION_KEYS) {
                const row = rows.find((item) => item.role === role &&
                    item.permissionKey === key);
                set[key] = row ? row.granted : false;
            }
            matrix[role] = set;
        }
        return matrix;
    }
    async getForRole(role) {
        if (role === UserRole.ADMIN) {
            return { ...ADMIN_PERMISSIONS };
        }
        const fallback = DEFAULT_ROLE_PERMISSIONS[role] ??
            DEFAULT_ROLE_PERMISSIONS[UserRole.SALES];
        const rows = await this.repository.find({
            where: { role },
        });
        if (rows.length === 0) {
            return { ...fallback };
        }
        const granted = {};
        for (const key of PERMISSION_KEYS) {
            const row = rows.find((item) => item.permissionKey === key);
            granted[key] = row ? row.granted : false;
        }
        return toPermissionSet(granted);
    }
    async updateMatrix(matrix) {
        for (const role of EDITABLE_ROLES) {
            const requested = matrix[role];
            if (!requested) {
                continue;
            }
            for (const key of PERMISSION_KEYS) {
                if (typeof requested[key] !== 'boolean') {
                    continue;
                }
                await this.repository.upsert({
                    role,
                    permissionKey: key,
                    granted: requested[key],
                }, {
                    conflictPaths: ['role', 'permissionKey'],
                });
            }
        }
        return this.getMatrix();
    }
};
PermissionsService = __decorate([
    Injectable(),
    __param(0, InjectRepository(RolePermission)),
    __metadata("design:paramtypes", [Repository])
], PermissionsService);
export { PermissionsService };
//# sourceMappingURL=permissions.service.js.map