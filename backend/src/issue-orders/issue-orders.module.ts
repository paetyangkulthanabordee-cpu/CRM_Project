import {
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import { Customer } from '../customers/entities/customer.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';

import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';

import { IssueOrdersController } from './issue-orders.controller.js';
import { IssueOrdersService } from './issue-orders.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssueOrder,
      IssueOrderDetail,
      Customer,
      Product,
      OrderPipeline,
    ]),
  ],
  controllers: [IssueOrdersController],
  providers: [IssueOrdersService],
  exports: [IssueOrdersService],
})
export class IssueOrdersModule {}
