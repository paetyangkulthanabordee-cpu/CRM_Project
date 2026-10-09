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
import { PipelineStage } from './entities/pipeline-stage.entity.js';
let PipelineStagesService = class PipelineStagesService {
    stagesRepository;
    constructor(stagesRepository) {
        this.stagesRepository = stagesRepository;
    }
    async findAll() {
        const stages = await this.stagesRepository.find({
            order: { position: 'ASC', stageId: 'ASC' },
        });
        const rows = await this.stagesRepository.manager.query(`SELECT status AS "stageKey", COUNT(*)::int AS count
       FROM customers
       WHERE is_active = true
       GROUP BY status`);
        const counts = new Map(rows.map((row) => [
            row.stageKey,
            Number(row.count),
        ]));
        return stages.map((stage) => ({
            stageId: stage.stageId,
            stageKey: stage.stageKey,
            label: stage.label,
            color: stage.color,
            position: stage.position,
            customerCount: counts.get(stage.stageKey) ?? 0,
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
    async customerCount(stageKey) {
        const rows = await this.stagesRepository.manager.query(`SELECT COUNT(*)::int AS count
         FROM customers
         WHERE status = $1 AND is_active = true`, [stageKey]);
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
            stageId: stage.stageId,
            stageKey: stage.stageKey,
            label: stage.label,
            color: stage.color,
            position: stage.position,
            customerCount: 0,
        };
    }
    async update(stageId, dto) {
        const stage = await this.findOne(stageId);
        if (dto.stageKey && dto.stageKey !== stage.stageKey) {
            await this.assertKeyAvailable(dto.stageKey, stageId);
        }
        const previousStageKey = stage.stageKey;
        const renaming = dto.stageKey !== undefined &&
            dto.stageKey !== previousStageKey;
        const nextStageKey = dto.stageKey ?? previousStageKey;
        Object.assign(stage, {
            ...(dto.stageKey
                ? { stageKey: dto.stageKey }
                : {}),
            ...(dto.label ? { label: dto.label } : {}),
            ...(dto.color ? { color: dto.color } : {}),
        });
        await this.stagesRepository.manager.transaction(async (manager) => {
            await manager.save(PipelineStage, stage);
            if (renaming) {
                await manager.query(`UPDATE customers
             SET status = $1, updated_at = NOW()
             WHERE status = $2`, [nextStageKey, previousStageKey]);
            }
        });
        const saved = stage;
        return {
            stageId: saved.stageId,
            stageKey: saved.stageKey,
            label: saved.label,
            color: saved.color,
            position: saved.position,
            customerCount: await this.customerCount(saved.stageKey),
        };
    }
    async reorder(dto) {
        const stages = await this.stagesRepository.find();
        const existing = new Set(stages.map((stage) => stage.stageId));
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
                await manager.query(`UPDATE pipeline_stages
             SET position = $1, updated_at = NOW()
             WHERE stage_id = $2`, [index + 1, stageId]);
            }
        });
        return this.findAll();
    }
    async remove(stageId) {
        const stage = await this.findOne(stageId);
        const count = await this.customerCount(stage.stageKey);
        if (count > 0) {
            throw new ConflictException(`ลบไม่ได้ เพราะคอลัมน์ "${stage.label}" ยังมีลูกค้าอยู่ ${count} ราย กรุณาย้ายลูกค้าออกให้หมดก่อน`);
        }
        const total = await this.stagesRepository.count();
        if (total <= 1) {
            throw new BadRequestException('ต้องมีคอลัมน์อย่างน้อย 1 คอลัมน์');
        }
        await this.stagesRepository.remove(stage);
        const stages = await this.stagesRepository.find({
            order: { position: 'ASC', stageId: 'ASC' },
        });
        await this.stagesRepository.manager.transaction(async (manager) => {
            for (const [index, item] of stages.entries()) {
                await manager.query(`UPDATE pipeline_stages
             SET position = $1
             WHERE stage_id = $2`, [index + 1, item.stageId]);
            }
        });
        return {
            stageId,
            deleted: true,
        };
    }
    async findOne(stageId) {
        const stage = await this.stagesRepository.findOne({
            where: { stageId },
        });
        if (!stage) {
            throw new NotFoundException('ไม่พบคอลัมน์นี้');
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
            query.andWhere('stage.stageId != :ignoreStageId', { ignoreStageId });
        }
        const clash = await query.getOne();
        if (clash) {
            throw new ConflictException(`รหัสคอลัมน์ "${stageKey}" ถูกใช้ไปแล้ว`);
        }
    }
};
PipelineStagesService = __decorate([
    Injectable(),
    __param(0, InjectRepository(PipelineStage)),
    __metadata("design:paramtypes", [Repository])
], PipelineStagesService);
export { PipelineStagesService };
//# sourceMappingURL=pipeline-stages.service.js.map