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
import { ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, QueryFailedError, Repository, } from 'typeorm';
import { DocumentType } from '../documents/entities/document-type.entity.js';
const EMPTY_USAGE = {
    ruleUsageCount: 0,
    attachmentUsageCount: 0,
};
const UNIQUE_VIOLATION = '23505';
function isUniqueViolation(error) {
    if (!(error instanceof QueryFailedError)) {
        return false;
    }
    const driverError = error.driverError;
    return driverError?.code === UNIQUE_VIOLATION;
}
let DocumentTypesService = class DocumentTypesService {
    documentTypesRepository;
    constructor(documentTypesRepository) {
        this.documentTypesRepository = documentTypesRepository;
    }
    async loadUsage(ids) {
        const usage = new Map();
        if (ids.length === 0) {
            return usage;
        }
        const rows = await this.documentTypesRepository.manager.query(`
        SELECT
          dt.id,
          (
            SELECT COUNT(*)
              FROM workflow_rules wr
             WHERE wr.document_type_id = dt.id
          ) AS rule_count,
          (
            SELECT COUNT(*)
              FROM issue_order_attachment ioa
             WHERE ioa.document_type_id = dt.id
          ) AS attachment_count
          FROM document_type dt
         WHERE dt.id = ANY($1::int[])
      `, [ids]);
        for (const row of rows) {
            usage.set(Number(row.id), {
                ruleUsageCount: Number(row.rule_count) || 0,
                attachmentUsageCount: Number(row.attachment_count) || 0,
            });
        }
        return usage;
    }
    async findAll() {
        const rows = await this.documentTypesRepository.find({
            order: { id: 'ASC' },
        });
        const usage = await this.loadUsage(rows.map((row) => row.id));
        return rows.map((row) => {
            const counts = usage.get(row.id) ?? EMPTY_USAGE;
            return {
                id: row.id,
                documentType: row.documentType,
                ...counts,
            };
        });
    }
    async findOne(id) {
        const documentType = await this.documentTypesRepository.findOne({
            where: { id },
        });
        if (!documentType) {
            throw new NotFoundException('ไม่พบประเภทเอกสารรายการนี้');
        }
        return documentType;
    }
    async assertNameNotTaken(documentType, exceptId) {
        const existing = await this.documentTypesRepository.findOne({
            where: { documentType: ILike(documentType) },
        });
        if (existing && existing.id !== exceptId) {
            throw new ConflictException(`มีประเภทเอกสารชื่อ "${documentType}" อยู่แล้ว`);
        }
    }
    async create(dto) {
        const name = dto.documentType.trim();
        await this.assertNameNotTaken(name);
        try {
            return await this.documentTypesRepository.save({
                documentType: name,
            });
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException(`มีประเภทเอกสารชื่อ "${name}" อยู่แล้ว`);
            }
            throw error;
        }
    }
    async update(id, dto) {
        const documentType = await this.findOne(id);
        if (dto.documentType !== undefined) {
            const name = dto.documentType.trim();
            await this.assertNameNotTaken(name, id);
            documentType.documentType = name;
        }
        try {
            return await this.documentTypesRepository.save(documentType);
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new ConflictException(`มีประเภทเอกสารชื่อ "${documentType.documentType}" อยู่แล้ว`);
            }
            throw error;
        }
    }
    async remove(id) {
        const documentType = await this.findOne(id);
        const usage = await this.loadUsage([id]);
        const counts = usage.get(id) ?? EMPTY_USAGE;
        if (counts.ruleUsageCount > 0 ||
            counts.attachmentUsageCount > 0) {
            throw new ConflictException(`ไม่สามารถลบประเภทเอกสาร "${documentType.documentType}" ได้ ` +
                `เพราะยังถูกใช้งานอยู่ใน Workflow Rule ${counts.ruleUsageCount} รายการ ` +
                `และไฟล์แนบใบสั่งซื้อ ${counts.attachmentUsageCount} รายการ`);
        }
        await this.documentTypesRepository.remove(documentType);
        return { id, deleted: true };
    }
};
DocumentTypesService = __decorate([
    Injectable(),
    __param(0, InjectRepository(DocumentType)),
    __metadata("design:paramtypes", [Repository])
], DocumentTypesService);
export { DocumentTypesService };
//# sourceMappingURL=document-types.service.js.map