import { Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { Customer } from './entities/customer.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { ListCustomersDto } from './dto/list-customers.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
export declare class CustomersService {
    private readonly customersRepository;
    private readonly stagesService;
    constructor(customersRepository: Repository<Customer>, stagesService: PipelineStagesService);
    findAll(query: ListCustomersDto): Promise<{
        data: Customer[];
        total: number;
        page: number;
        limit: number;
    }>;
    countAll(): Promise<number>;
    findOne(customerId: number): Promise<Customer>;
    private firstStageKey;
    private assertStageExists;
    recalcPurchaseCount(customerId: number, manager?: EntityManager): Promise<number>;
    recalcPurchaseCountBatch(customerIds: number[]): Promise<void>;
    create(dto: CreateCustomerDto, assignedId?: number): Promise<Customer>;
    update(customerId: number, dto: UpdateCustomerDto): Promise<Customer>;
    deactivate(customerId: number): Promise<{
        customerId: number;
        isActive: boolean;
        deactivated: boolean;
    }>;
    restore(customerId: number): Promise<{
        customerId: number;
        isActive: boolean;
        restored: boolean;
    }>;
}
