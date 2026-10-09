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
import { Customer } from './entities/customer.entity.js';
let CustomersService = class CustomersService {
    customersRepository;
    stagesService;
    constructor(customersRepository, stagesService) {
        this.customersRepository = customersRepository;
        this.stagesService = stagesService;
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
        if (query.status) {
            builder.andWhere('customer.status = :status', {
                status: query.status,
            });
        }
        if (query.search) {
            builder.andWhere('(customer.companyName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)', { search: `%${query.search}%` });
        }
        return builder.getMany();
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
           FROM documents d
           WHERE d.customer_id = c.customer_id
             AND d.doc_type = 'receipt'
             AND d.status = 'completed'
         )
         WHERE c.customer_id = $1
         RETURNING purchase_count`, [customerId]);
        return Number(rows[0]?.purchaseCount ?? 0);
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
        if (dto.status !== undefined) {
            await this.assertStageExists(dto.status);
        }
        const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(customer, changes);
        return this.customersRepository.save(customer);
    }
    async deactivate(customerId) {
        const customer = await this.findOne(customerId);
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
        PipelineStagesService])
], CustomersService);
export { CustomersService };
//# sourceMappingURL=customers.service.js.map