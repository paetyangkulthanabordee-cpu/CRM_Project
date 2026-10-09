import { Repository } from 'typeorm';
import { PipelineStage } from './entities/pipeline-stage.entity.js';
import { CreatePipelineStageDto, ReorderStagesDto, UpdatePipelineStageDto } from './dto/pipeline-stage.dto.js';
export interface StageWithCount {
    stageId: number;
    stageKey: string;
    label: string;
    color: string;
    position: number;
    customerCount: number;
}
export declare class PipelineStagesService {
    private readonly stagesRepository;
    constructor(stagesRepository: Repository<PipelineStage>);
    findAll(): Promise<StageWithCount[]>;
    findKeys(): Promise<string[]>;
    exists(stageKey: string): Promise<boolean>;
    customerCount(stageKey: string): Promise<number>;
    create(dto: CreatePipelineStageDto): Promise<StageWithCount>;
    update(stageId: number, dto: UpdatePipelineStageDto): Promise<StageWithCount>;
    reorder(dto: ReorderStagesDto): Promise<StageWithCount[]>;
    remove(stageId: number): Promise<{
        stageId: number;
        deleted: boolean;
    }>;
    private findOne;
    private assertKeyAvailable;
}
