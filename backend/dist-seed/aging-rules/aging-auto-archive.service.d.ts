import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IssueOrdersService } from '../issue-orders/issue-orders.service.js';
import { AgingRulesService } from './aging-rules.service.js';
export declare class AgingAutoArchiveService implements OnModuleInit, OnModuleDestroy {
    private readonly agingRulesService;
    private readonly issueOrdersService;
    private readonly logger;
    private intervalTimer;
    private bootTimer;
    private running;
    constructor(agingRulesService: AgingRulesService, issueOrdersService: IssueOrdersService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    runOnce(): Promise<number>;
    private loadAutoArchiveRules;
}
