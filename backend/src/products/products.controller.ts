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
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListCatalogDto } from './dto/list-catalog.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateCategoryDto } from './dto/category.dto.js';
import { UpdateCategoryDto } from './dto/category.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';

@Controller('products')
@RequirePermissions('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  /* =====================================================
     PRODUCTS
  ===================================================== */

  @Get('stats')
  stats() {
    return this.productsService.stats();
  }

  @Get()
  findAll(@Query() query: ListProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('groups')
  findAllGroups(@Query() query: ListCatalogDto) {
    return this.productsService.findAllGroups(query);
  }

  @Get('units')
  findAllUnits(@Query() query: ListCatalogDto) {
    return this.productsService.findAllUnits(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(id);
  }

  /* =====================================================
     CATEGORIES / หมวดหมู่สินค้า (จัดการเฉพาะ Admin/Manager)
  ===================================================== */

  @Post('groups')
  @RequirePermissions('products', 'productManagement')
  createGroup(
    @Body() dto: CreateCategoryDto,
  ) {
    return this.productsService.createGroup(dto);
  }

  @Patch('groups/:id')
  @RequirePermissions('products', 'productManagement')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productsService.updateGroup(
      id,
      dto,
    );
  }

  @Delete('groups/:id')
  @RequirePermissions('products', 'productManagement')
  removeGroup(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.removeGroup(id);
  }

  /* =====================================================
     PRODUCT UNITS (จัดการเฉพาะ Admin/Manager)
  ===================================================== */

  @Post('units')
  @RequirePermissions('products', 'productManagement')
  createUnit(
    @Body() dto: CreateProductUnitDto,
  ) {
    return this.productsService.createUnit(dto);
  }

  @Patch('units/:id')
  @RequirePermissions('products', 'productManagement')
  updateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductUnitDto,
  ) {
    return this.productsService.updateUnit(
      id,
      dto,
    );
  }

  @Delete('units/:id')
  @RequirePermissions('products', 'productManagement')
  removeUnit(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.removeUnit(id);
  }
}
