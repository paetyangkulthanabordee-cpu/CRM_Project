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
  Query,
} from '@nestjs/common';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

import { IssueOrdersService } from './issue-orders.service.js';

import {
  CreateIssueOrderDto,
  MoveIssueOrderStageDto,
  UpdateIssueOrderDto,
} from './dto/issue-order.dto.js';

import { ListIssueOrdersDto } from './dto/list-issue-orders.dto.js';

@Controller('issue-orders')
@RequirePermissions('orderPipeline')
export class IssueOrdersController {
  constructor(
    private readonly ordersService: IssueOrdersService,
  ) {}

  @Get()
  findAll(@Query() query: ListIssueOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateIssueOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueOrderDto,
  ) {
    return this.ordersService.update(id, dto);
  }

  /*
   * ย้ายใบสั่งซื้อไปขั้นตอนอื่น (ใช้ตอนลากการ์ดบนบอร์ด)
   */
  @Patch(':id/stage')
  @HttpCode(200)
  moveStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveIssueOrderStageDto,
  ) {
    return this.ordersService.moveStage(
      id,
      dto.orderPipelineId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.remove(id);
  }
}
