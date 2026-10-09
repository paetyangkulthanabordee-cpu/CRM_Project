import { Repository } from 'typeorm';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { Customer } from '../customers/entities/customer.entity.js';
export declare class DashboardService {
    private readonly customersRepository;
    private readonly stagesService;
    constructor(customersRepository: Repository<Customer>, stagesService: PipelineStagesService);
    getSummary(): Promise<{
        kpis: {
            totalCustomers: number;
            newCustomers: number;
            activeCustomers: number;
            dealCustomers: number;
            conversionRate: number;
        };
        statuses: {
            status: string;
            count: number;
        }[];
        stages: {
            stage: string;
            status: string;
            count: number;
        }[];
        recentCustomers: Customer[];
    }>;
}
