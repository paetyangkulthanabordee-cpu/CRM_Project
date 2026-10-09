import { CreatePipelineStageDto, ReorderStagesDto, UpdatePipelineStageDto } from './dto/pipeline-stage.dto.js';
import { PipelineStagesService, StageWithCount } from './pipeline-stages.service.js';
export declare class PipelineStagesController {
    private readonly stagesService;
    constructor(stagesService: PipelineStagesService);
    findAll(): Promise<StageWithCount[]>;
    create(dto: CreatePipelineStageDto): Promise<StageWithCount>;
    reorder(dto: ReorderStagesDto): Promise<StageWithCount[]>;
    update(stageId: number, dto: UpdatePipelineStageDto): Promise<StageWithCount>;
    remove(stageId: number): Promise<{
        stageId: number;
        deleted: boolean;
    }>;
}
