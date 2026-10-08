import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PermissionsService } from '../permissions/permissions.service.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'Email หรือ Password ไม่ถูกต้อง',
      );
    }

    if (
      !(await bcrypt.compare(
        password,
        user.password,
      ))
    ) {
      throw new UnauthorizedException(
        'Email หรือ Password ไม่ถูกต้อง',
      );
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
      permissions: await this.permissionsService.getForRole(
        user.role,
      ),
    };
  }
}