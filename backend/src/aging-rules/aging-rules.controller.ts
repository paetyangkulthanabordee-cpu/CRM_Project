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

import {
  AgingRuleView,
  CreateAgingRuleDto,
  UpdateAgingRuleDto,
} from './dto/aging-rule.dto.js';
import { AgingRulesService } from './aging-rules.service.js';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

/*
 * Time-based Workflow Rules (Aging Rules)
 *
 * - GET อ่านได้ทุกคนที่ login เพราะบอร์ด Order Pipeline ต้องใช้ Threshold
 *   ไปคิดสีการ์ด (ไม่ได้ผูกกับข้อมูลส่วนตัว anyone)
 * - เพิ่ม/แก้/ลบ/สลิตช์ เปิด-ปิด จำกัดให้ Administration เท่านั้น
 *   (ชุดเดียวกับ workflow_rules)
 */
@Controller('aging-rules')
export class AgingRulesController {
  constructor(private readonly rulesService: AgingRulesService) {}

  @Get()
  findAll(): Promise<AgingRuleView[]> {
    return this.rulesService.findAll();
  }

  @Post()
  @RequirePermissions('administration')
  create(@Body() dto: CreateAgingRuleDto): Promise<AgingRuleView> {
    return this.rulesService.create(dto);
  }

  @Patch(':ruleId')
  @RequirePermissions('administration')
  update(
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() dto: UpdateAgingRuleDto,
  ): Promise<AgingRuleView> {
    return this.rulesService.update(ruleId, dto);
  }

  @Delete(':ruleId')
  @RequirePermissions('administration')
  remove(@Param('ruleId', ParseIntPipe) ruleId: number) {
    return this.rulesService.remove(ruleId);
  }
}
