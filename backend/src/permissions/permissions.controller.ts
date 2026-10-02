import { Body, Controller, Get, Patch } from '@nestjs/common';

import { RequirePermissions } from './decorators/require-permissions.decorator.js';
import { PermissionsService } from './permissions.service.js';
import type { RoleMatrix } from './permissions.service.js';

@Controller('permissions')
@RequirePermissions('administration')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  async findAll(): Promise<RoleMatrix> {
    return this.permissionsService.getMatrix();
  }

  @Patch()
  async update(
    @Body() body: RoleMatrix,
  ): Promise<RoleMatrix> {
    return this.permissionsService.updateMatrix(body);
  }
}