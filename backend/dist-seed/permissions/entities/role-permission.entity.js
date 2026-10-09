var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
let RolePermission = class RolePermission {
    id;
    role;
    permissionKey;
    granted;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn({
        name: 'id',
    }),
    __metadata("design:type", Number)
], RolePermission.prototype, "id", void 0);
__decorate([
    Column({
        type: 'varchar',
        length: 20,
    }),
    __metadata("design:type", String)
], RolePermission.prototype, "role", void 0);
__decorate([
    Column({
        name: 'permission_key',
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], RolePermission.prototype, "permissionKey", void 0);
__decorate([
    Column({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], RolePermission.prototype, "granted", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], RolePermission.prototype, "updatedAt", void 0);
RolePermission = __decorate([
    Entity('role_permissions')
], RolePermission);
export { RolePermission };
//# sourceMappingURL=role-permission.entity.js.map