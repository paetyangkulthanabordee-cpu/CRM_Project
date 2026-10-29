import {
  Global,
  Module,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';

import { WorkflowRule } from './entities/workflow-rule.entity.js';
import { WorkflowRulesController } from './workflow-rules.controller.js';
import { WorkflowRulesService } from './workflow-rules.service.js';

/*
 * @Global เพื่อให้ IssueOrdersModule ฉีด WorkflowRulesService
 * เข้าไปตรวจกฎตอนย้ายขั้นตอนได้โดยไม่ต้อง import โมดูลนี้ซ้ำ
 * (ป้องกันการวนกลับกันของ module import)
 */
@Global()
@Module({
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
export class WorkflowRulesModule {}
