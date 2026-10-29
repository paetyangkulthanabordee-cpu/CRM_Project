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

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { ProductGroupsService } from './product-groups.service.js';
import { CreateProductGroupDto } from './dto/create-product-group.dto.js';
import { ListProductGroupsDto } from './dto/list-product-groups.dto.js';
import { UpdateProductGroupDto } from './dto/update-product-group.dto.js';

/*
 * ตาราง product_group = กลุ่มสินค้า (master: ชื่อกลุ่ม + คำอธิบาย)
 * หมวดหมู่ผูกกลุ่มผ่านคอลัมน์ category.product_group_id
 * แยกคนละ controller กับ /products/groups (ที่จริงคือ category)
 */
@Controller('product-groups')
@RequirePermissions('products')
export class ProductGroupsController {
  constructor(
    private readonly productGroupsService: ProductGroupsService,
  ) {}

  @Get()
  findAll(@Query() query: ListProductGroupsDto) {
    return this.productGroupsService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productGroupsService.findOne(id);
  }

  @Post()
  @RequirePermissions('products', 'productManagement')
  create(@Body() dto: CreateProductGroupDto) {
    return this.productGroupsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('products', 'productManagement')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductGroupDto,
  ) {
    return this.productGroupsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('products', 'productManagement')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productGroupsService.remove(id);
  }
}
