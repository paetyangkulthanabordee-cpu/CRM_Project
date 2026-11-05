import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';
import type { WorkflowConditionType } from '../condition-types.js';
export declare class WorkflowRule {
    id: number;
    ruleName: string;
    fromStageId: number;
    fromStage?: OrderPipeline;
    toStageId: number;
    toStage?: OrderPipeline;
    conditionType: WorkflowConditionType;
    conditionConfig: Record<string, unknown>;
    documentTypeId: number | null;
    documentType?: DocumentType;
    isRequired: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
