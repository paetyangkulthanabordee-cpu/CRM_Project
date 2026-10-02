import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<
      boolean | undefined
    >(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'กรุณาเข้าสู่ระบบก่อนใช้งาน',
      );
    }

    try {
      request.user =
        await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException(
        'Token ไม่ถูกต้องหรือหมดอายุ',
      );
    }

    return true;
  }

  private extractToken(
    request: RequestWithUser,
  ): string | undefined {
    const authorization = request.headers[
      'authorization'
    ];

    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    return type === 'Bearer' ? token : undefined;
  }
}
