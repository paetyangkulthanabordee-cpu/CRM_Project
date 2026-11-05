var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module, } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
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
import { AgingRulesModule } from '../aging-rules/aging-rules.module.js';
let IssueOrdersModule = class IssueOrdersModule {
};
IssueOrdersModule = __decorate([
    Module({
        imports: [
            AgingRulesModule,
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
        exports: [IssueOrdersService, IssueOrderAttachmentsService],
    })
], IssueOrdersModule);
export { IssueOrdersModule };
//# sourceMappingURL=issue-orders.module.js.map