import { CreateWorkflowRuleDto, UpdateWorkflowRuleDto, WorkflowMoveCheckView, WorkflowRuleView } from './dto/workflow-rule.dto.js';
import { WorkflowRulesService } from './workflow-rules.service.js';
export declare class WorkflowRulesController {
    private readonly rulesService;
    constructor(rulesService: WorkflowRulesService);
    findAll(): Promise<WorkflowRuleView[]>;
    check(orderId: number, toStageId: number): Promise<WorkflowMoveCheckView>;
    create(dto: CreateWorkflowRuleDto): Promise<WorkflowRuleView>;
    update(ruleId: number, dto: UpdateWorkflowRuleDto): Promise<WorkflowRuleView>;
    remove(ruleId: number): Promise<{
        ruleId: number;
        deleted: boolean;
    }>;
}
