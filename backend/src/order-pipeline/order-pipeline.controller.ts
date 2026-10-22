import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  CreateOrderPipelineDto,
  ReorderOrderPipelineDto,
  UpdateOrderPipelineDto,
} from './dto/order-pipeline.dto.js';
import {
  OrderPipelineService,
  OrderPipelineStageWithCount,
} from './order-pipeline.service.js';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

@Controller('order-pipeline')
export class OrderPipelineController {
  /*
   * อ่านคอลัมน์ได้ทุกคนที่เข้าถึง Order Pipeline
   * (บอร์ดต้องแสดงคอลัมน์ตรงกับที่แอดมินตั้งค่าไว้)
   * ส่วนเพิ่ม/แก้/ลบ/จัดลำดับ ปิดไว้ให้ Administration เท่านั้น
   */
  constructor(
    private readonly stagesService: OrderPipelineService,
  ) {}

  @Get()
  findAll(): Promise<OrderPipelineStageWithCount[]> {
    return this.stagesService.findAll();
  }

  @Post()
  @RequirePermissions('administration')
  create(
    @Body() dto: CreateOrderPipelineDto,
  ): Promise<OrderPipelineStageWithCount> {
    return this.stagesService.create(dto);
  }

  @Patch('order')
  @HttpCode(200)
  @RequirePermissions('administration')
  reorder(
    @Body() dto: ReorderOrderPipelineDto,
  ): Promise<OrderPipelineStageWithCount[]> {
    return this.stagesService.reorder(dto);
  }

  @Patch(':stageId')
  @RequirePermissions('administration')
  update(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: UpdateOrderPipelineDto,
  ): Promise<OrderPipelineStageWithCount> {
    return this.stagesService.update(
      stageId,
      dto,
    );
  }

  @Delete(':stageId')
  @RequirePermissions('administration')
  remove(
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.stagesService.remove(stageId);
  }
}
