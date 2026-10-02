import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export interface AuthUser {
  sub: number;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthUser => {
    const request = context
      .switchToHttp()
      .getRequest();

    return request.user;
  },
);
