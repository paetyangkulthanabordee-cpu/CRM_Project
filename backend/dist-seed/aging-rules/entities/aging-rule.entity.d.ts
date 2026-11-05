export declare class AgingRule {
    id: number;
    ruleName: string;
    warningAfterDays: number;
    criticalAfterDays: number;
    isActive: boolean;
    boardType: 'order_pipeline' | 'customers';
    stageKey: string | null;
    actionType: 'none' | 'auto_archive' | 'edit_lock';
    archiveAfterDays: number | null;
    createdAt: Date;
    updatedAt: Date;
}
