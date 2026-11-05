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
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgingRule } from './entities/aging-rule.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';
let AgingRulesService = class AgingRulesService {
    rulesRepository;
    orderStagesRepository;
    customerStagesRepository;
    constructor(rulesRepository, orderStagesRepository, customerStagesRepository) {
        this.rulesRepository = rulesRepository;
        this.orderStagesRepository = orderStagesRepository;
        this.customerStagesRepository = customerStagesRepository;
    }
    async findAll() {
        const rules = await this.rulesRepository.find({
            order: { isActive: 'DESC', id: 'ASC' },
        });
        const labels = await this.loadStageLabels();
        return rules.map((rule) => this.toView(rule, labels));
    }
    async create(dto) {
        this.assertThresholdsValid(dto.warningAfterDays, dto.criticalAfterDays);
        const boardType = dto.boardType ?? 'order_pipeline';
        const stageKey = dto.stageKey ?? null;
        const actionType = dto.actionType ?? 'none';
        this.assertActionValid(boardType, actionType);
        this.assertActionStageKeyValid(actionType, stageKey);
        const archiveAfterDays = this.resolveArchiveAfterDays(actionType, dto.archiveAfterDays);
        await this.assertStageExists(boardType, stageKey);
        const saved = await this.rulesRepository.save(this.rulesRepository.create({
            ruleName: dto.ruleName.trim(),
            warningAfterDays: dto.warningAfterDays,
            criticalAfterDays: dto.criticalAfterDays,
            isActive: dto.isActive ?? true,
            boardType,
            stageKey,
            actionType,
            archiveAfterDays,
        }));
        const labels = await this.loadStageLabels();
        return this.toView(saved, labels);
    }
    async update(ruleId, dto) {
        const rule = await this.findOne(ruleId);
        const nextWarning = dto.warningAfterDays ?? rule.warningAfterDays;
        const nextCritical = dto.criticalAfterDays ?? rule.criticalAfterDays;
        this.assertThresholdsValid(nextWarning, nextCritical);
        const nextBoard = dto.boardType ?? rule.boardType;
        const boardChanged = dto.boardType !== undefined && dto.boardType !== rule.boardType;
        const nextAction = dto.actionType !== undefined
            ? dto.actionType
            : rule.actionType;
        this.assertActionValid(nextBoard, nextAction);
        let nextStageKey;
        if (dto.stageKey !== undefined) {
            nextStageKey = dto.stageKey;
        }
        else if (boardChanged) {
            nextStageKey = null;
        }
        else {
            nextStageKey = rule.stageKey;
        }
        this.assertActionStageKeyValid(nextAction, nextStageKey);
        await this.assertStageExists(nextBoard, nextStageKey);
        const nextArchiveAfterDays = this.resolveArchiveAfterDays(nextAction, dto.archiveAfterDays ?? rule.archiveAfterDays);
        rule.ruleName = dto.ruleName?.trim() ?? rule.ruleName;
        rule.warningAfterDays = nextWarning;
        rule.criticalAfterDays = nextCritical;
        rule.boardType = nextBoard;
        rule.stageKey = nextStageKey;
        rule.actionType = nextAction;
        rule.archiveAfterDays = nextArchiveAfterDays;
        if (dto.isActive !== undefined) {
            rule.isActive = dto.isActive;
        }
        await this.rulesRepository.save(rule);
        const labels = await this.loadStageLabels();
        return this.toView(rule, labels);
    }
    async remove(ruleId) {
        const rule = await this.findOne(ruleId);
        await this.rulesRepository.remove(rule);
        return {
            ruleId,
            deleted: true,
        };
    }
    assertActionValid(boardType, actionType) {
        if (actionType === 'auto_archive' && boardType !== 'order_pipeline') {
            throw new BadRequestException('Auto Archive ใช้ได้เฉพาะบอร์ด Order Pipeline เท่านั้น — เปลี่ยน Action เป็น "Color mark" หรือ "ล็อกแก้ไข" ถ้าต้องการใช้กับบอร์ด Customers');
        }
    }
    assertActionStageKeyValid(actionType, stageKey) {
        if (actionType === 'edit_lock' && stageKey === null) {
            throw new BadRequestException('Rule แบบ "ล็อกแก้ไข" ต้องเลือกคอลัมน์ที่จะล็อก (ไม่รองรับ "ทุกคอลัมน์")');
        }
    }
    resolveArchiveAfterDays(actionType, value) {
        if (actionType !== 'auto_archive') {
            return null;
        }
        if (value === undefined || value === null) {
            throw new BadRequestException('Rule แบบ "Auto Archive" ต้องกำหนดจำนวนวัน (ซ่อนการ์ดเมื่อไม่มีกิจกรรมครบกำหนด)');
        }
        return value;
    }
    async assertNotEditLocked(boardType, stageKey) {
        if (stageKey === null) {
            return;
        }
        const rules = await this.rulesRepository.find({
            where: {
                isActive: true,
                actionType: 'edit_lock',
                boardType,
            },
        });
        const lockingRule = rules.find((rule) => rule.stageKey === null || rule.stageKey === stageKey);
        if (!lockingRule) {
            return;
        }
        throw new ForbiddenException({
            errorCode: 'EDIT_LOCKED',
            message: `คอลัมน์นี้ถูกล็อกไม่ให้แก้ไขข้อมูลตาม Rule "${lockingRule.ruleName}" — ย้ายการ์ดออกนอกคอลัมน์นี้ก่อนจึงจะแก้ไขได้`,
        });
    }
    assertThresholdsValid(warningAfterDays, criticalAfterDays) {
        if (criticalAfterDays <= warningAfterDays) {
            throw new BadRequestException('Critical after ต้องมากกว่า Warning after เสมอ (เช่น Warning 3 วัน / Critical 7 วัน)');
        }
    }
    async assertStageExists(boardType, stageKey) {
        if (stageKey === null) {
            return;
        }
        const repository = boardType === 'customers'
            ? this.customerStagesRepository
            : this.orderStagesRepository;
        const exists = await repository.exists({
            where: { stageKey },
        });
        if (!exists) {
            const boardLabel = boardType === 'customers' ? 'Customers' : 'Order Pipeline';
            throw new BadRequestException(`ไม่พบคอลัมน์ "${stageKey}" ในบอร์ด ${boardLabel}`);
        }
    }
    async loadStageLabels() {
        const [orderStages, customerStages] = await Promise.all([
            this.orderStagesRepository.find(),
            this.customerStagesRepository.find(),
        ]);
        const labels = new Map();
        for (const stage of orderStages) {
            labels.set(`order_pipeline:${stage.stageKey}`, stage.label);
        }
        for (const stage of customerStages) {
            labels.set(`customers:${stage.stageKey}`, stage.label);
        }
        return labels;
    }
    async findOne(ruleId) {
        const rule = await this.rulesRepository.findOne({
            where: { id: ruleId },
        });
        if (!rule) {
            throw new NotFoundException('ไม่พบ Aging Rule นี้');
        }
        return rule;
    }
    toView(rule, labels) {
        const stageLabel = rule.stageKey === null
            ? null
            : (labels.get(`${rule.boardType}:${rule.stageKey}`) ?? null);
        return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            warningAfterDays: rule.warningAfterDays,
            criticalAfterDays: rule.criticalAfterDays,
            isActive: rule.isActive,
            boardType: rule.boardType,
            stageKey: rule.stageKey,
            actionType: rule.actionType,
            archiveAfterDays: rule.archiveAfterDays,
            stageLabel,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
        };
    }
};
AgingRulesService = __decorate([
    Injectable(),
    __param(0, InjectRepository(AgingRule)),
    __param(1, InjectRepository(OrderPipeline)),
    __param(2, InjectRepository(PipelineStage)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository])
], AgingRulesService);
export { AgingRulesService };
//# sourceMappingURL=aging-rules.service.js.map