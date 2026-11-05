import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../users/entities/user.entity.js';
import { WorkflowRulesService } from '../workflow-rules/workflow-rules.service.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';
import { IssueOrderAttachmentsService } from './issue-order-attachments.service.js';
import type { CreateIssueOrderDto, UpdateIssueOrderDto } from './dto/issue-order.dto.js';
import type { ListIssueOrdersDto } from './dto/list-issue-orders.dto.js';
export declare class IssueOrdersService {
    private readonly ordersRepository;
    private readonly detailsRepository;
    private readonly customersRepository;
    private readonly productsRepository;
    private readonly stagesRepository;
    private readonly usersRepository;
    private readonly workflowRulesService;
    private readonly agingRulesService;
    private readonly attachmentsService;
    constructor(ordersRepository: Repository<IssueOrder>, detailsRepository: Repository<IssueOrderDetail>, customersRepository: Repository<Customer>, productsRepository: Repository<Product>, stagesRepository: Repository<OrderPipeline>, usersRepository: Repository<User>, workflowRulesService: WorkflowRulesService, agingRulesService: AgingRulesService, attachmentsService: IssueOrderAttachmentsService);
    findAll(query?: ListIssueOrdersDto): Promise<IssueOrder[]>;
    findOne(id: number): Promise<IssueOrder>;
    findArchiveCandidateIds(archiveAfterDays: number, stageKey: string | null): Promise<number[]>;
    create(dto: CreateIssueOrderDto): Promise<IssueOrder>;
    update(id: number, dto: UpdateIssueOrderDto): Promise<IssueOrder>;
    moveStage(id: number, orderPipelineId: number): Promise<IssueOrder>;
    archive(id: number): Promise<{
        id: number;
        archived: boolean;
    }>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    private resolveDetails;
    private assertCustomerExists;
    private assertStageExists;
    private assertUserExists;
}
