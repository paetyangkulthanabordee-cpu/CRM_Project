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
  CreatePipelineStageDto,
  ReorderStagesDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-stage.dto.js';
import {
  PipelineStagesService,
  StageWithCount,
} from './pipeline-stages.service.js';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

@Controller('pipeline-stages')
export class PipelineStagesController {
  /*
   * อ่านคอลัมน์ได้ทุกคนที่เข้าถึง Sales Pipeline
   * (บอร์ดต้องแสดงคอลัมน์ตรงกับที่แอดมินตั้งค่าไว้)
   * ส่วนเพิ่ม/แก้/ลบ/จัดลำดับ ปิดไว้ให้ Administration เท่านั้น
   */
  constructor(
    private readonly stagesService: PipelineStagesService,
  ) {}

  @Get()
  findAll(): Promise<StageWithCount[]> {
    return this.stagesService.findAll();
  }

  @Post()
  @RequirePermissions('administration')
  create(
    @Body() dto: CreatePipelineStageDto,
  ): Promise<StageWithCount> {
    return this.stagesService.create(dto);
  }

  @Patch('order')
  @HttpCode(200)
  @RequirePermissions('administration')
  reorder(
    @Body() dto: ReorderStagesDto,
  ): Promise<StageWithCount[]> {
    return this.stagesService.reorder(dto);
  }

  @Patch(':stageId')
  @RequirePermissions('administration')
  update(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: UpdatePipelineStageDto,
  ): Promise<StageWithCount> {
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