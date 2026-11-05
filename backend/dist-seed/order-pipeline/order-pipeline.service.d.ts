import { Repository } from 'typeorm';
import { OrderPipeline } from './entities/order-pipeline.entity.js';
import { CreateOrderPipelineDto, ReorderOrderPipelineDto, UpdateOrderPipelineDto } from './dto/order-pipeline.dto.js';
export interface OrderPipelineStageWithCount {
    stageId: number;
    stageKey: string;
    label: string;
    color: string;
    position: number;
    issueOrderCount: number;
}
export declare class OrderPipelineService {
    private readonly stagesRepository;
    constructor(stagesRepository: Repository<OrderPipeline>);
    findAll(): Promise<OrderPipelineStageWithCount[]>;
    findKeys(): Promise<string[]>;
    exists(stageKey: string): Promise<boolean>;
    issueOrderCount(stageId: number): Promise<number>;
    create(dto: CreateOrderPipelineDto): Promise<OrderPipelineStageWithCount>;
    update(stageId: number, dto: UpdateOrderPipelineDto): Promise<OrderPipelineStageWithCount>;
    reorder(dto: ReorderOrderPipelineDto): Promise<OrderPipelineStageWithCount[]>;
    remove(stageId: number): Promise<{
        stageId: number;
        deleted: boolean;
    }>;
    private findOne;
    private assertKeyAvailable;
}
