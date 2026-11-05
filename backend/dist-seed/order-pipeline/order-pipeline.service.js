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
import { BadRequestException, ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderPipeline } from './entities/order-pipeline.entity.js';
let OrderPipelineService = class OrderPipelineService {
    stagesRepository;
    constructor(stagesRepository) {
        this.stagesRepository = stagesRepository;
    }
    async findAll() {
        const stages = await this.stagesRepository.find({
            order: { position: 'ASC', id: 'ASC' },
        });
        const rows = await this.stagesRepository.manager.query(`SELECT order_pipeline_id AS "orderPipelineId",
              COUNT(*)::int AS count
       FROM issue_order
       WHERE is_archived = false
       GROUP BY order_pipeline_id`);
        const counts = new Map(rows.map((row) => [
            row.orderPipelineId,
            Number(row.count),
        ]));
        return stages.map((stage) => ({
            stageId: stage.id,
            stageKey: stage.stageKey,
            label: stage.label,
            color: stage.color,
            position: stage.position,
            issueOrderCount: counts.get(stage.id) ?? 0,
        }));
    }
    async findKeys() {
        const stages = await this.stagesRepository.find({
            select: { stageKey: true },
        });
        return stages.map((stage) => stage.stageKey);
    }
    async exists(stageKey) {
        const count = await this.stagesRepository.count({
            where: { stageKey },
        });
        return count > 0;
    }
    async issueOrderCount(stageId) {
        const rows = await this.stagesRepository.manager.query(`SELECT COUNT(*)::int AS count
         FROM issue_order
         WHERE order_pipeline_id = $1`, [stageId]);
        return Number(rows[0]?.count ?? 0);
    }
    async create(dto) {
        await this.assertKeyAvailable(dto.stageKey);
        const max = await this.stagesRepository
            .createQueryBuilder('stage')
            .select('MAX(stage.position)', 'max')
            .getRawOne();
        const position = Number(max?.max ?? 0) + 1;
        const stage = await this.stagesRepository.save(this.stagesRepository.create({
            stageKey: dto.stageKey,
            label: dto.label,
            color: dto.color ?? '#64748b',
            position,
        }));
        return {
            stageId: stage.id,
            stageKey: stage.stageKey,
            label: stage.label,
            color: stage.color,
            position: stage.position,
            issueOrderCount: 0,
        };
    }
    async update(stageId, dto) {
        const stage = await this.findOne(stageId);
        if (dto.stageKey &&
            dto.stageKey !== stage.stageKey) {
            await this.assertKeyAvailable(dto.stageKey, stageId);
        }
        Object.assign(stage, {
            ...(dto.stageKey
                ? { stageKey: dto.stageKey }
                : {}),
            ...(dto.label ? { label: dto.label } : {}),
            ...(dto.color ? { color: dto.color } : {}),
        });
        const saved = await this.stagesRepository.save(stage);
        return {
            stageId: saved.id,
            stageKey: saved.stageKey,
            label: saved.label,
            color: saved.color,
            position: saved.position,
            issueOrderCount: await this.issueOrderCount(saved.id),
        };
    }
    async reorder(dto) {
        const stages = await this.stagesRepository.find();
        const existing = new Set(stages.map((stage) => stage.id));
        const ids = dto.stageIds ?? [];
        if (ids.length !== stages.length) {
            throw new BadRequestException('ลำดับคอลัมน์ไม่ครบทุกคอลัมน์ที่มีอยู่');
        }
        const hasUnknown = ids.some((id) => !existing.has(id));
        if (hasUnknown) {
            throw new BadRequestException('พบคอลัมน์ที่ไม่มีอยู่จริงในระบบ');
        }
        await this.stagesRepository.manager.transaction(async (manager) => {
            for (const [index, stageId] of ids.entries()) {
                await manager.query(`UPDATE order_pipeline
             SET position = $1, updated_at = NOW()
             WHERE id = $2`, [index + 1, stageId]);
            }
        });
        return this.findAll();
    }
    async remove(stageId) {
        const stage = await this.findOne(stageId);
        const count = await this.issueOrderCount(stage.id);
        if (count > 0) {
            throw new ConflictException(`ลบไม่ได้ เพราะขั้นตอน "${stage.label}" ยังมีใบสั่งซื้ออยู่ ${count} ใบ กรุณาย้ายใบสั่งซื้อออกให้หมดก่อน`);
        }
        const total = await this.stagesRepository.count();
        if (total <= 1) {
            throw new BadRequestException('ต้องมีคอลัมน์อย่างน้อย 1 คอลัมน์');
        }
        await this.stagesRepository.remove(stage);
        const stages = await this.stagesRepository.find({
            order: { position: 'ASC', id: 'ASC' },
        });
        await this.stagesRepository.manager.transaction(async (manager) => {
            for (const [index, item] of stages.entries()) {
                await manager.query(`UPDATE order_pipeline
             SET position = $1
             WHERE id = $2`, [index + 1, item.id]);
            }
        });
        return {
            stageId,
            deleted: true,
        };
    }
    async findOne(stageId) {
        const stage = await this.stagesRepository.findOne({
            where: { id: stageId },
        });
        if (!stage) {
            throw new NotFoundException('ไม่พบขั้นตอนนี้');
        }
        return stage;
    }
    async assertKeyAvailable(stageKey, ignoreStageId) {
        const query = this.stagesRepository
            .createQueryBuilder('stage')
            .where('stage.stageKey = :stageKey', {
            stageKey,
        });
        if (ignoreStageId !== undefined) {
            query.andWhere('stage.id != :ignoreStageId', { ignoreStageId });
        }
        const clash = await query.getOne();
        if (clash) {
            throw new ConflictException(`รหัสขั้นตอน "${stageKey}" ถูกใช้ไปแล้ว`);
        }
    }
};
OrderPipelineService = __decorate([
    Injectable(),
    __param(0, InjectRepository(OrderPipeline)),
    __metadata("design:paramtypes", [Repository])
], OrderPipelineService);
export { OrderPipelineService };
//# sourceMappingURL=order-pipeline.service.js.map