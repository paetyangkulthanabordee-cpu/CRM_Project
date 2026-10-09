import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { ListCustomersDto } from './dto/list-customers.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(query: ListCustomersDto): Promise<import("./entities/customer.entity.js").Customer[]>;
    findOne(id: number): Promise<import("./entities/customer.entity.js").Customer>;
    create(dto: CreateCustomerDto, user: AuthUser): Promise<import("./entities/customer.entity.js").Customer>;
    update(id: number, dto: UpdateCustomerDto): Promise<import("./entities/customer.entity.js").Customer>;
    deactivate(id: number): Promise<{
        customerId: number;
        isActive: boolean;
        deactivated: boolean;
    }>;
    restore(id: number): Promise<{
        customerId: number;
        isActive: boolean;
        restored: boolean;
    }>;
}
