export declare const AGING_BOARDS: readonly ["order_pipeline", "customers"];
export type AgingBoard = (typeof AGING_BOARDS)[number];
export declare const AGING_ACTIONS: readonly ["none", "auto_archive", "edit_lock"];
export type AgingAction = (typeof AGING_ACTIONS)[number];
export declare class CreateAgingRuleDto {
    ruleName: string;
    warningAfterDays: number;
    criticalAfterDays: number;
    isActive?: boolean;
    boardType?: AgingBoard;
    stageKey?: string | null;
    actionType?: AgingAction;
    archiveAfterDays?: number;
}
export declare class UpdateAgingRuleDto {
    ruleName?: string;
    warningAfterDays?: number;
    criticalAfterDays?: number;
    isActive?: boolean;
    boardType?: AgingBoard;
    stageKey?: string | null;
    actionType?: AgingAction;
    archiveAfterDays?: number;
}
export interface AgingRuleView {
    ruleId: number;
    ruleName: string;
    warningAfterDays: number;
    criticalAfterDays: number;
    isActive: boolean;
    boardType: AgingBoard;
    stageKey: string | null;
    actionType: AgingAction;
    archiveAfterDays: number | null;
    stageLabel?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
