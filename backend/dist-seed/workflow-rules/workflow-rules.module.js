var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Global, Module, } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { WorkflowRule } from './entities/workflow-rule.entity.js';
import { WorkflowRulesController } from './workflow-rules.controller.js';
import { WorkflowRulesService } from './workflow-rules.service.js';
let WorkflowRulesModule = class WorkflowRulesModule {
};
WorkflowRulesModule = __decorate([
    Global(),
    Module({
        imports: [
            TypeOrmModule.forFeature([
                WorkflowRule,
                OrderPipeline,
                IssueOrder,
                IssueOrderAttachment,
                DocumentType,
            ]),
        ],
        controllers: [WorkflowRulesController],
        providers: [WorkflowRulesService],
        exports: [WorkflowRulesService],
    })
], WorkflowRulesModule);
export { WorkflowRulesModule };
//# sourceMappingURL=workflow-rules.module.js.map