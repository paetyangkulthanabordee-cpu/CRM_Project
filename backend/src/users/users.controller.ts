import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';
import type { UserListItem } from './users.service.js';

@Controller('users')
@RequirePermissions('administration')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(): Promise<UserListItem[]> {
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateUserDto,
  ): Promise<UserListItem> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserListItem> {
    return this.usersService.update(
      id,
      dto,
      user.sub,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.remove(
      id,
      user.sub,
    );
  }
}
