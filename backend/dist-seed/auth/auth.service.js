var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException, } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PermissionsService } from '../permissions/permissions.service.js';
import { UsersService } from '../users/users.service.js';
let AuthService = class AuthService {
    usersService;
    permissionsService;
    jwtService;
    constructor(usersService, permissionsService, jwtService) {
        this.usersService = usersService;
        this.permissionsService = permissionsService;
        this.jwtService = jwtService;
    }
    async login(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');
        }
        if (!(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');
        }
        const accessToken = this.jwtService.sign({
            sub: user.userId,
            email: user.email,
            role: user.role,
        });
        return {
            accessToken,
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            permissions: await this.permissionsService.getForRole(user.role),
        };
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UsersService,
        PermissionsService,
        JwtService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map