import { Repository } from 'typeorm';
import { AgingRule } from './entities/aging-rule.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';
import type { AgingBoard, AgingRuleView, CreateAgingRuleDto, UpdateAgingRuleDto } from './dto/aging-rule.dto.js';
export declare class AgingRulesService {
    private readonly rulesRepository;
    private readonly orderStagesRepository;
    private readonly customerStagesRepository;
    constructor(rulesRepository: Repository<AgingRule>, orderStagesRepository: Repository<OrderPipeline>, customerStagesRepository: Repository<PipelineStage>);
    findAll(): Promise<AgingRuleView[]>;
    create(dto: CreateAgingRuleDto): Promise<AgingRuleView>;
    update(ruleId: number, dto: UpdateAgingRuleDto): Promise<AgingRuleView>;
    remove(ruleId: number): Promise<{
        ruleId: number;
        deleted: boolean;
    }>;
    private assertActionValid;
    private assertActionStageKeyValid;
    private resolveArchiveAfterDays;
    assertNotEditLocked(boardType: AgingBoard, stageKey: string | null): Promise<void>;
    private assertThresholdsValid;
    private assertStageExists;
    private loadStageLabels;
    private findOne;
    private toView;
}
