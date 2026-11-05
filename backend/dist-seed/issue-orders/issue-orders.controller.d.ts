import { IssueOrdersService } from './issue-orders.service.js';
import { CreateIssueOrderDto, MoveIssueOrderStageDto, UpdateIssueOrderDto } from './dto/issue-order.dto.js';
import { ListIssueOrdersDto } from './dto/list-issue-orders.dto.js';
export declare class IssueOrdersController {
    private readonly ordersService;
    constructor(ordersService: IssueOrdersService);
    findAll(query: ListIssueOrdersDto): Promise<import("./entities/issue-order.entity.js").IssueOrder[]>;
    findOne(id: number): Promise<import("./entities/issue-order.entity.js").IssueOrder>;
    create(dto: CreateIssueOrderDto): Promise<import("./entities/issue-order.entity.js").IssueOrder>;
    update(id: number, dto: UpdateIssueOrderDto): Promise<import("./entities/issue-order.entity.js").IssueOrder>;
    moveStage(id: number, dto: MoveIssueOrderStageDto): Promise<import("./entities/issue-order.entity.js").IssueOrder>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
}
