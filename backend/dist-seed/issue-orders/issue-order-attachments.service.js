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
import { BadRequestException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, } from 'node:fs';
import { extname, join } from 'node:path';
import { Repository } from 'typeorm';
import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderAttachment } from './entities/issue-order-attachment.entity.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
export const UPLOAD_ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_INVALID_TYPE_MESSAGE = 'ไฟล์ประเภทนี้ไม่รองรับ (รองรับ PDF, รูปภาพ, Excel และ Word เท่านั้น)';
const EXT_BY_MIME = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
let IssueOrderAttachmentsService = class IssueOrderAttachmentsService {
    attachmentsRepository;
    ordersRepository;
    documentTypesRepository;
    agingRulesService;
    uploadDir;
    constructor(attachmentsRepository, ordersRepository, documentTypesRepository, agingRulesService) {
        this.attachmentsRepository = attachmentsRepository;
        this.ordersRepository = ordersRepository;
        this.documentTypesRepository = documentTypesRepository;
        this.agingRulesService = agingRulesService;
        this.uploadDir =
            process.env.UPLOAD_DIR?.trim() ||
                join(process.cwd(), 'uploads', 'attachments');
        mkdirSync(this.uploadDir, { recursive: true });
    }
    async list(orderId) {
        await this.assertOrderExists(orderId);
        const rows = await this.attachmentsRepository.find({
            where: { issueOrderId: orderId },
            order: { createdAt: 'DESC', id: 'DESC' },
        });
        return rows.map((row) => this.toView(row));
    }
    async upload(orderId, file, userId, documentTypeId = null) {
        await this.assertOrderExists(orderId);
        await this.assertNotEditLocked(orderId);
        if (documentTypeId !== null) {
            await this.assertDocumentTypeExists(documentTypeId);
        }
        if (!file) {
            throw new BadRequestException('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด');
        }
        if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(UPLOAD_INVALID_TYPE_MESSAGE);
        }
        if (file.size <= 0) {
            throw new BadRequestException('ไฟล์ที่อัปโหลดว่างเปล่า');
        }
        if (file.size > UPLOAD_MAX_BYTES) {
            throw new BadRequestException('ขนาดไฟล์ต้องไม่เกิน 10 MB');
        }
        const storedName = `${randomUUID()}${this.resolveExtension(file)}`;
        writeFileSync(join(this.uploadDir, storedName), file.buffer);
        try {
            const saved = await this.attachmentsRepository.save(this.attachmentsRepository.create({
                issueOrderId: orderId,
                originalName: decodeOriginalName(file.originalname),
                storedName,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                uploadedBy: userId,
                documentTypeId,
            }));
            await this.ordersRepository.update({ id: orderId }, { updatedAt: new Date() });
            return this.toView(saved);
        }
        catch (error) {
            removeQuietly(join(this.uploadDir, storedName));
            throw error;
        }
    }
    async getFile(orderId, attachmentId) {
        const row = await this.findOne(orderId, attachmentId);
        const filePath = join(this.uploadDir, row.storedName);
        if (!existsSync(filePath)) {
            throw new NotFoundException('ไม่พบไฟล์นี้ในระบบ (อาจถูกลบไปแล้ว)');
        }
        return {
            buffer: readFileSync(filePath),
            originalName: row.originalName,
            mimeType: row.mimeType,
        };
    }
    async remove(orderId, attachmentId) {
        const row = await this.findOne(orderId, attachmentId);
        await this.assertNotEditLocked(orderId);
        removeQuietly(join(this.uploadDir, row.storedName));
        await this.attachmentsRepository.remove(row);
        return {
            attachmentId,
            deleted: true,
        };
    }
    async deleteFilesByOrderId(orderId) {
        const rows = await this.attachmentsRepository.find({
            where: { issueOrderId: orderId },
            select: { storedName: true },
        });
        let removed = 0;
        for (const row of rows) {
            const filePath = join(this.uploadDir, row.storedName);
            if (existsSync(filePath)) {
                removeQuietly(filePath);
                removed += 1;
            }
        }
        return removed;
    }
    async assertNotEditLocked(orderId) {
        const order = await this.ordersRepository.findOne({
            where: { id: orderId },
            relations: { orderPipeline: true },
        });
        if (!order) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
        await this.agingRulesService.assertNotEditLocked('order_pipeline', order.orderPipeline?.stageKey ?? null);
    }
    async findOne(orderId, attachmentId) {
        const row = await this.attachmentsRepository.findOne({
            where: {
                id: attachmentId,
                issueOrderId: orderId,
            },
        });
        if (!row) {
            throw new NotFoundException('ไม่พบไฟล์แนบนี้');
        }
        return row;
    }
    async assertOrderExists(orderId) {
        const exists = await this.ordersRepository.exists({
            where: { id: orderId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
    }
    async assertDocumentTypeExists(documentTypeId) {
        const exists = await this.documentTypesRepository.exists({
            where: { id: documentTypeId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบประเภทเอกสารนี้');
        }
    }
    resolveExtension(file) {
        const mapped = EXT_BY_MIME[file.mimetype] ?? '';
        if (mapped) {
            return mapped;
        }
        const fallback = extname(file.originalname).toLowerCase();
        return /^[.a-z0-9]{1,10}$/.test(fallback)
            ? fallback
            : '';
    }
    toView(row) {
        return {
            attachmentId: row.id,
            originalName: row.originalName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            uploadedBy: row.uploadedBy ?? null,
            documentTypeId: row.documentTypeId ?? null,
            createdAt: row.createdAt,
        };
    }
};
IssueOrderAttachmentsService = __decorate([
    Injectable(),
    __param(0, InjectRepository(IssueOrderAttachment)),
    __param(1, InjectRepository(IssueOrder)),
    __param(2, InjectRepository(DocumentType)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository,
        AgingRulesService])
], IssueOrderAttachmentsService);
export { IssueOrderAttachmentsService };
function decodeOriginalName(name) {
    const asUtf8 = Buffer.from(name, 'latin1').toString('utf8');
    const roundTrip = Buffer.from(asUtf8, 'utf8').toString('latin1');
    return roundTrip === name ? asUtf8 : name;
}
function removeQuietly(filePath) {
    try {
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
    catch {
    }
}
//# sourceMappingURL=issue-order-attachments.service.js.map