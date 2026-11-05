var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
import { Customer } from './entities/customer.entity.js';
let CustomersService = class CustomersService {
    customersRepository;
    stagesService;
    agingRulesService;
    constructor(customersRepository, stagesService, agingRulesService) {
        this.customersRepository = customersRepository;
        this.stagesService = stagesService;
        this.agingRulesService = agingRulesService;
    }
    async findAll(query) {
        const builder = this.customersRepository
            .createQueryBuilder('customer')
            .leftJoinAndSelect('customer.assignedUser', 'assigned')
            .orderBy('customer.createdAt', 'DESC');
        if (query.onlyInactive) {
            builder.andWhere('customer.isActive = false');
        }
        else {
            builder.andWhere('customer.isActive = true');
        }
        if (query.status && query.status.length > 0) {
            builder.andWhere('customer.status IN (:...status)', { status: query.status });
        }
        if (query.search) {
            builder.andWhere('(customer.companyName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search OR assigned.name ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.dateFrom) {
            builder.andWhere('customer.createdAt >= :dateFrom', {
                dateFrom: query.dateFrom,
            });
        }
        if (query.dateTo) {
            if (query.dateTo.length === 10) {
                const nextDay = new Date(`${query.dateTo}T00:00:00Z`);
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                builder.andWhere('customer.createdAt < :dateTo', { dateTo: nextDay.toISOString() });
            }
            else {
                builder.andWhere('customer.createdAt <= :dateTo', { dateTo: query.dateTo });
            }
        }
        const assignedIds = query.assignedId ?? [];
        const includeUnassigned = query.unassigned === true;
        if (assignedIds.length > 0 && includeUnassigned) {
            builder.andWhere('(customer.assignedId IN (:...assignedIds) OR customer.assignedId IS NULL)', { assignedIds });
        }
        else if (assignedIds.length > 0) {
            builder.andWhere('customer.assignedId IN (:...assignedIds)', { assignedIds });
        }
        else if (includeUnassigned) {
            builder.andWhere('customer.assignedId IS NULL');
        }
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
        const [data, total] = await builder
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async countAll() {
        return this.customersRepository.count();
    }
    async findOne(customerId) {
        const customer = await this.customersRepository.findOne({
            where: { customerId },
            relations: { assignedUser: true },
        });
        if (!customer) {
            throw new NotFoundException('ไม่พบลูกค้ารายนี้');
        }
        return customer;
    }
    async firstStageKey() {
        const stages = await this.stagesService.findAll();
        if (stages.length === 0) {
            throw new NotFoundException('ยังไม่มีคอลัมน์ใน Sales Pipeline กรุณาเพิ่มคอลัมน์ก่อน');
        }
        return stages[0].stageKey;
    }
    async assertStageExists(stageKey) {
        const exists = await this.stagesService.exists(stageKey);
        if (!exists) {
            throw new NotFoundException(`ไม่พบคอลัมน์ "${stageKey}" ใน Sales Pipeline`);
        }
    }
    async recalcPurchaseCount(customerId, manager) {
        const executor = manager ?? this.customersRepository.manager;
        const rows = await executor.query(`UPDATE customers c
         SET purchase_count = (
           SELECT COUNT(*)::int
           FROM issue_order_attachment a
           INNER JOIN issue_order o ON o.id = a.issue_order_id
           INNER JOIN document_type dt ON dt.id = a.document_type_id
           WHERE o.customer_id = c.customer_id
             AND dt.document_type = 'receipt'
         )
         WHERE c.customer_id = $1
         RETURNING purchase_count`, [customerId]);
        return Number(rows[0]?.purchaseCount ?? 0);
    }
    async recalcPurchaseCountBatch(customerIds) {
        if (customerIds.length === 0) {
            return;
        }
        await this.customersRepository.query(`UPDATE customers c
       SET purchase_count = (
         SELECT COUNT(*)::int
         FROM issue_order_attachment a
         INNER JOIN issue_order o ON o.id = a.issue_order_id
         INNER JOIN document_type dt ON dt.id = a.document_type_id
         WHERE o.customer_id = c.customer_id
           AND dt.document_type = 'receipt'
       )
       WHERE c.customer_id = ANY($1::int[])`, [customerIds]);
    }
    async create(dto, assignedId) {
        const status = dto.status ??
            (await this.firstStageKey());
        await this.assertStageExists(status);
        const customer = this.customersRepository.create({
            companyName: dto.companyName,
            email: dto.email,
            phone: dto.phone,
            status,
            assignedId: dto.assignedId ?? assignedId ?? null,
        });
        return this.customersRepository.save(customer);
    }
    async update(customerId, dto) {
        const customer = await this.findOne(customerId);
        const isStatusOnlyMove = Object.entries(dto).every(([key, value]) => key === 'status' || value === undefined);
        if (!isStatusOnlyMove) {
            await this.agingRulesService.assertNotEditLocked('customers', customer.status);
        }
        if (dto.status !== undefined) {
            await this.assertStageExists(dto.status);
        }
        const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(customer, changes);
        return this.customersRepository.save(customer);
    }
    async deactivate(customerId) {
        const customer = await this.findOne(customerId);
        await this.agingRulesService.assertNotEditLocked('customers', customer.status);
        customer.isActive = false;
        const saved = await this.customersRepository.save(customer);
        return {
            customerId: saved.customerId,
            isActive: saved.isActive,
            deactivated: true,
        };
    }
    async restore(customerId) {
        const customer = await this.findOne(customerId);
        customer.isActive = true;
        const saved = await this.customersRepository.save(customer);
        return {
            customerId: saved.customerId,
            isActive: saved.isActive,
            restored: true,
        };
    }
};
CustomersService = __decorate([
    Injectable(),
    __param(0, InjectRepository(Customer)),
    __metadata("design:paramtypes", [Repository,
        PipelineStagesService,
        AgingRulesService])
], CustomersService);
export { CustomersService };
//# sourceMappingURL=customers.service.js.map