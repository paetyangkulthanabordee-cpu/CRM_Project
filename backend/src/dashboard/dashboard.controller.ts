import { Controller, Get } from '@nestjs/common';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
@RequirePermissions('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
