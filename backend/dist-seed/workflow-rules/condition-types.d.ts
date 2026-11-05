export declare const WORKFLOW_CONDITION_TYPES: readonly ["attachment", "field", "document", "payment"];
export type WorkflowConditionType = (typeof WORKFLOW_CONDITION_TYPES)[number];
export declare const WORKFLOW_FIELD_KEYS: readonly ["note", "details", "amount"];
export type WorkflowFieldKey = (typeof WORKFLOW_FIELD_KEYS)[number];
