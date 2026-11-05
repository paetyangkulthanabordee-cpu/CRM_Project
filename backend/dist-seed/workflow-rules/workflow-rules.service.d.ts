import { Repository } from 'typeorm';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { WorkflowRule } from './entities/workflow-rule.entity.js';
import type { CreateWorkflowRuleDto, UpdateWorkflowRuleDto, WorkflowMoveCheckView, WorkflowRuleView } from './dto/workflow-rule.dto.js';
export declare class WorkflowRulesService {
    private readonly rulesRepository;
    private readonly stagesRepository;
    private readonly attachmentsRepository;
    private readonly documentTypesRepository;
    private readonly ordersRepository;
    constructor(rulesRepository: Repository<WorkflowRule>, stagesRepository: Repository<OrderPipeline>, attachmentsRepository: Repository<IssueOrderAttachment>, documentTypesRepository: Repository<DocumentType>, ordersRepository: Repository<IssueOrder>);
    findAll(): Promise<WorkflowRuleView[]>;
    create(dto: CreateWorkflowRuleDto): Promise<WorkflowRuleView>;
    update(ruleId: number, dto: UpdateWorkflowRuleDto): Promise<WorkflowRuleView>;
    remove(ruleId: number): Promise<{
        ruleId: number;
        deleted: boolean;
    }>;
    assertMoveAllowed(order: IssueOrder, fromStageId: number, toStageId: number): Promise<void>;
    checkMove(orderId: number, toStageId: number): Promise<WorkflowMoveCheckView>;
    private evaluateRules;
    private evaluateRule;
    private isFieldFilled;
    private describeRequirement;
    private normalizeConfig;
    private resolveDocumentType;
    private resolveDocumentTypeLabel;
    private resolveEffectiveDocumentTypeId;
    private resolveDocumentTypeIdByKind;
    private readMinFiles;
    private readConfigString;
    private assertStagesAvailable;
    private findOne;
    private loadView;
    private toView;
}
