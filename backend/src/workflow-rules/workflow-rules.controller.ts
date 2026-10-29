import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
  WorkflowMoveCheckView,
  WorkflowRuleView,
} from './dto/workflow-rule.dto.js';
import { WorkflowRulesService } from './workflow-rules.service.js';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

/*
 * Workflow Rules คือกฎที่ควบคุมการย้ายการ์ดบนบอร์ด Order Pipeline
 * อ่านได้ทุกคนที่ login (บอร์ดอาจต้องใช้แสดงเงื่อนไข)
 * ส่วนเพิ่ม/แก้/ลบ ปิดไว้ให้ Administration เท่านั้น
 */
@Controller('workflow-rules')
export class WorkflowRulesController {
  constructor(
    private readonly rulesService: WorkflowRulesService,
  ) {}

  @Get()
  findAll(): Promise<WorkflowRuleView[]> {
    return this.rulesService.findAll();
  }

  /*
   * ตรวจ rule ของใบสั่งซื้อหนึ่งใบแบบไม่บังคับ
   * ใช้ตอนหน้ารายละเอียดเปิดแถบ mark "ต้องแนบไฟล์อะไร"
   * และตอนอัปโหลดไฟล์เสร็จแล้วต้องเช็กใหม่ว่าผ่านหรือยัง
   *
   * จำกัดสิทธิ์ชุดเดียวกับบอร์ด (orderPipeline)
   * เพราะคืนผลตรวจที่ผูกกับใบสั่งซื้อ
   */
  @Get('check')
  @RequirePermissions('orderPipeline')
  check(
    @Query('orderId', ParseIntPipe) orderId: number,
    @Query('toStageId', ParseIntPipe) toStageId: number,
  ): Promise<WorkflowMoveCheckView> {
    return this.rulesService.checkMove(
      orderId,
      toStageId,
    );
  }

  @Post()
  @RequirePermissions('administration')
  create(
    @Body() dto: CreateWorkflowRuleDto,
  ): Promise<WorkflowRuleView> {
    return this.rulesService.create(dto);
  }

  @Patch(':ruleId')
  @RequirePermissions('administration')
  update(
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() dto: UpdateWorkflowRuleDto,
  ): Promise<WorkflowRuleView> {
    return this.rulesService.update(ruleId, dto);
  }

  @Delete(':ruleId')
  @RequirePermissions('administration')
  remove(
    @Param('ruleId', ParseIntPipe) ruleId: number,
  ) {
    return this.rulesService.remove(ruleId);
  }
}
