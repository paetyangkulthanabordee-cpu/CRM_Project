import {
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import { Customer } from '../customers/entities/customer.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';

import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';
import { IssueOrderAttachment } from './entities/issue-order-attachment.entity.js';

import { IssueOrdersController } from './issue-orders.controller.js';
import { IssueOrdersService } from './issue-orders.service.js';
import { IssueOrderAttachmentsController } from './issue-order-attachments.controller.js';
import { IssueOrderAttachmentsService } from './issue-order-attachments.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssueOrder,
      IssueOrderDetail,
      IssueOrderAttachment,
      Customer,
      Product,
      OrderPipeline,
      User,
      DocumentType,
    ]),
  ],
  controllers: [
    IssueOrdersController,
    IssueOrderAttachmentsController,
  ],
  providers: [
    IssueOrdersService,
    IssueOrderAttachmentsService,
  ],
  exports: [IssueOrdersService],
})
export class IssueOrdersModule {}
