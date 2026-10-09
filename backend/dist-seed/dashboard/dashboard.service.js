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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { Customer } from '../customers/entities/customer.entity.js';
let DashboardService = class DashboardService {
    customersRepository;
    stagesService;
    constructor(customersRepository, stagesService) {
        this.customersRepository = customersRepository;
        this.stagesService = stagesService;
    }
    async getSummary() {
        const [customers, stages] = await Promise.all([
            this.customersRepository.find({
                where: { isActive: true },
            }),
            this.stagesService.findAll(),
        ]);
        const countByStatus = (statuses) => customers.filter((customer) => statuses.includes(customer.status)).length;
        const keys = stages.map((stage) => stage.stageKey);
        const lostKeys = keys.filter((key) => /not_interested|lost|reject/i.test(key));
        const newKeys = keys.filter((key) => /lead|new/i.test(key));
        const dealKeys = keys.filter((key) => /payment|contract|deal|won/i.test(key));
        const totalCustomers = customers.length;
        const newCustomers = countByStatus(newKeys);
        const activeCustomers = customers.filter((customer) => !lostKeys.includes(customer.status)).length;
        const dealCustomers = countByStatus(dealKeys);
        const wonCustomers = countByStatus(dealKeys);
        const closed = wonCustomers + countByStatus(lostKeys);
        const recentCustomers = [...customers]
            .sort((a, b) => b.createdAt.getTime() -
            a.createdAt.getTime())
            .slice(0, 5);
        return {
            kpis: {
                totalCustomers,
                newCustomers,
                activeCustomers,
                dealCustomers,
                conversionRate: closed === 0
                    ? 0
                    : Math.round((wonCustomers / closed) * 100),
            },
            statuses: stages.map((stage) => ({
                status: stage.stageKey,
                count: countByStatus([stage.stageKey]),
            })),
            stages: stages.map((stage, index) => ({
                stage: `${String(index + 1).padStart(2, '0')}. ${stage.label.toUpperCase()}`,
                status: stage.stageKey,
                count: countByStatus([stage.stageKey]),
            })),
            recentCustomers,
        };
    }
};
DashboardService = __decorate([
    Injectable(),
    __param(0, InjectRepository(Customer)),
    __metadata("design:paramtypes", [Repository,
        PipelineStagesService])
], DashboardService);
export { DashboardService };
//# sourceMappingURL=dashboard.service.js.map