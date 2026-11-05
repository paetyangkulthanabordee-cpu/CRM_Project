import { AgingRuleView, CreateAgingRuleDto, UpdateAgingRuleDto } from './dto/aging-rule.dto.js';
import { AgingRulesService } from './aging-rules.service.js';
export declare class AgingRulesController {
    private readonly rulesService;
    constructor(rulesService: AgingRulesService);
    findAll(): Promise<AgingRuleView[]>;
    create(dto: CreateAgingRuleDto): Promise<AgingRuleView>;
    update(ruleId: number, dto: UpdateAgingRuleDto): Promise<AgingRuleView>;
    remove(ruleId: number): Promise<{
        ruleId: number;
        deleted: boolean;
    }>;
}
