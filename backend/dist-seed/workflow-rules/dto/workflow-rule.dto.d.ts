import { WORKFLOW_CONDITION_TYPES } from '../condition-types.js';
import type { WorkflowConditionType } from '../condition-types.js';
export declare class CreateWorkflowRuleDto {
    ruleName: string;
    fromStageId: number;
    toStageId: number;
    conditionType: (typeof WORKFLOW_CONDITION_TYPES)[number];
    conditionConfig?: Record<string, unknown>;
    documentTypeId?: number;
    isRequired?: boolean;
    isActive?: boolean;
}
export declare class UpdateWorkflowRuleDto {
    ruleName?: string;
    fromStageId?: number;
    toStageId?: number;
    conditionType?: (typeof WORKFLOW_CONDITION_TYPES)[number];
    conditionConfig?: Record<string, unknown>;
    documentTypeId?: number;
    isRequired?: boolean;
    isActive?: boolean;
}
export interface WorkflowRuleView {
    ruleId: number;
    ruleName: string;
    fromStageId: number;
    fromStageKey: string;
    fromStageLabel: string;
    fromStageColor: string;
    toStageId: number;
    toStageKey: string;
    toStageLabel: string;
    toStageColor: string;
    conditionType: string;
    conditionConfig: Record<string, unknown>;
    documentTypeId: number | null;
    isRequired: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkflowRuleEvaluation {
    ruleId: number;
    ruleName: string;
    conditionType: WorkflowConditionType;
    fieldKey: string | null;
    met: boolean;
    requirementText: string;
    documentTypeId: number | null;
    documentTypeLabel: string | null;
    currentCount: number;
    requiredCount: number;
}
export interface WorkflowMoveCheckView {
    orderId: number;
    fromStageId: number;
    toStageId: number;
    toStageLabel: string;
    allowed: boolean;
    rules: WorkflowRuleEvaluation[];
}
