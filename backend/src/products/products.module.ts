import { Module } from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import { Product } from './entities/product.entity.js';
import { Category } from './entities/category.entity.js';
import { ProductGroup } from './entities/product-group.entity.js';
import { ProductUnit } from './entities/product-unit.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { ProductGroupsController } from './product-groups.controller.js';
import { ProductGroupsService } from './product-groups.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      ProductGroup,
      ProductUnit,
    ]),
  ],
  controllers: [
    ProductsController,
    ProductGroupsController,
  ],
  providers: [
    ProductsService,
    ProductGroupsService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
