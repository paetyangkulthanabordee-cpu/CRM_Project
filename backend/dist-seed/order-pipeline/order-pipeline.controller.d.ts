import { CreateOrderPipelineDto, ReorderOrderPipelineDto, UpdateOrderPipelineDto } from './dto/order-pipeline.dto.js';
import { OrderPipelineService, OrderPipelineStageWithCount } from './order-pipeline.service.js';
export declare class OrderPipelineController {
    private readonly stagesService;
    constructor(stagesService: OrderPipelineService);
    findAll(): Promise<OrderPipelineStageWithCount[]>;
    create(dto: CreateOrderPipelineDto): Promise<OrderPipelineStageWithCount>;
    reorder(dto: ReorderOrderPipelineDto): Promise<OrderPipelineStageWithCount[]>;
    update(stageId: number, dto: UpdateOrderPipelineDto): Promise<OrderPipelineStageWithCount>;
    remove(stageId: number): Promise<{
        stageId: number;
        deleted: boolean;
    }>;
}
