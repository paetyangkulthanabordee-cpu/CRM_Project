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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DEFAULT_STATUS, DOC_PREFIXES, DOCUMENT_STATUSES, REF_TYPE, } from './document-types.js';
import { DocumentRecord } from './entities/document.entity.js';
import { DocumentSequence } from './entities/document-sequence.entity.js';
let DocumentsService = class DocumentsService {
    documentsRepository;
    customersRepository;
    customersService;
    constructor(documentsRepository, customersRepository, customersService) {
        this.documentsRepository = documentsRepository;
        this.customersRepository = customersRepository;
        this.customersService = customersService;
    }
    async findAll(query) {
        const builder = this.documentsRepository
            .createQueryBuilder('doc')
            .leftJoin(Customer, 'c', 'c.customerId = doc.customerId')
            .leftJoin(User, 'u', 'u.userId = doc.createdBy')
            .addSelect('c.companyName', 'customerName')
            .addSelect('u.name', 'creatorName')
            .orderBy('doc.issueDate', 'DESC')
            .addOrderBy('doc.docId', 'DESC');
        if (query.type) {
            builder.andWhere('doc.docType = :type', {
                type: query.type,
            });
        }
        if (query.status) {
            builder.andWhere('doc.status = :status', {
                status: query.status,
            });
        }
        if (query.from) {
            builder.andWhere('doc.issueDate >= :from', {
                from: query.from,
            });
        }
        if (query.to) {
            builder.andWhere('doc.issueDate <= :to', {
                to: query.to,
            });
        }
        if (query.search) {
            builder.andWhere('(doc.docNo ILIKE :search OR doc.refDocNo ILIKE :search OR c.companyName ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.customerId) {
            builder.andWhere('doc.customerId = :customerId', {
                customerId: query.customerId,
            });
        }
        const { entities, raw } = await builder.getRawAndEntities();
        return entities.map((doc, index) => Object.assign({}, doc, {
            customerName: raw[index]?.customerName ?? null,
            creatorName: raw[index]?.creatorName ?? null,
        }));
    }
    async findOne(docId) {
        const { entities, raw } = await this.documentsRepository
            .createQueryBuilder('doc')
            .leftJoin(Customer, 'c', 'c.customerId = doc.customerId')
            .leftJoin(User, 'u', 'u.userId = doc.createdBy')
            .addSelect('c.companyName', 'customerName')
            .addSelect('u.name', 'creatorName')
            .where('doc.docId = :docId', { docId })
            .getRawAndEntities();
        const doc = entities[0];
        if (!doc) {
            throw new NotFoundException('ไม่พบเอกสารนี้');
        }
        return Object.assign({}, doc, {
            customerName: raw[0]?.customerName ?? null,
            creatorName: raw[0]?.creatorName ?? null,
        });
    }
    async stats() {
        const rows = await this.documentsRepository
            .createQueryBuilder('doc')
            .select('doc.docType', 'docType')
            .addSelect('COUNT(*)::int', 'count')
            .addSelect(`COALESCE(SUM(doc.amount) FILTER (WHERE doc.status NOT IN ('cancelled', 'void')), 0)`, 'total')
            .addSelect(`COALESCE(SUM(doc.amount) FILTER (WHERE doc.status = 'pending'), 0)`, 'pendingAmount')
            .groupBy('doc.docType')
            .getRawMany();
        const result = {
            quotation: {
                count: 0,
                total: 0,
                pendingAmount: 0,
            },
            invoice: {
                count: 0,
                total: 0,
                pendingAmount: 0,
            },
            receipt: {
                count: 0,
                total: 0,
                pendingAmount: 0,
            },
        };
        for (const row of rows) {
            result[row.docType] = {
                count: Number(row.count),
                total: Number(row.total),
                pendingAmount: Number(row.pendingAmount),
            };
        }
        return result;
    }
    async create(dto, userId) {
        const docType = dto.docType;
        this.assertStatus(docType, dto.status);
        await this.assertCustomer(dto.customerId);
        const ref = await this.resolveRef(docType, dto.refDocId);
        const issueDate = dto.issueDate ??
            new Date().toISOString().slice(0, 10);
        const saved = await this.documentsRepository.manager.transaction(async (manager) => {
            const docNo = await this.nextDocNo(docType, issueDate, manager);
            const doc = manager.create(DocumentRecord, {
                docType,
                docNo,
                customerId: dto.customerId,
                issueDate,
                dueDate: dto.dueDate ?? null,
                refDocId: ref?.docId ?? null,
                refDocNo: ref?.docNo ?? null,
                amount: dto.amount,
                status: dto.status ?? DEFAULT_STATUS[docType],
                note: dto.note ?? null,
                createdBy: userId,
            });
            const created = await manager.save(doc);
            if (docType === 'receipt' &&
                ref &&
                ref.docType === 'invoice') {
                await manager.update(DocumentRecord, ref.docId, { status: 'paid' });
            }
            await this.customersService.recalcPurchaseCount(dto.customerId, manager);
            return created;
        });
        return this.findOne(saved.docId);
    }
    async update(docId, dto) {
        const doc = await this.documentsRepository.findOne({ where: { docId } });
        if (!doc) {
            throw new NotFoundException('ไม่พบเอกสารนี้');
        }
        this.assertStatus(doc.docType, dto.status);
        if (dto.customerId !== undefined) {
            await this.assertCustomer(dto.customerId);
        }
        const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        const previousCustomerId = doc.customerId;
        Object.assign(doc, changes);
        const saved = await this.documentsRepository.save(doc);
        const affectedCustomerIds = new Set();
        if (previousCustomerId !== null) {
            affectedCustomerIds.add(previousCustomerId);
        }
        if (doc.customerId !== null) {
            affectedCustomerIds.add(doc.customerId);
        }
        for (const customerId of affectedCustomerIds) {
            await this.customersService.recalcPurchaseCount(customerId);
        }
        return this.findOne(saved.docId);
    }
    async remove(docId) {
        const doc = await this.documentsRepository.findOne({ where: { docId } });
        if (!doc) {
            throw new NotFoundException('ไม่พบเอกสารนี้');
        }
        const customerId = doc.customerId;
        await this.documentsRepository.remove(doc);
        if (customerId !== null) {
            await this.customersService.recalcPurchaseCount(customerId);
        }
        return { docId, deleted: true };
    }
    assertStatus(docType, status) {
        if (status &&
            !DOCUMENT_STATUSES[docType].includes(status)) {
            throw new BadRequestException('สถานะไม่ถูกต้องสำหรับเอกสารชนิดนี้');
        }
    }
    async assertCustomer(customerId) {
        const exists = await this.customersRepository.exists({
            where: { customerId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบลูกค้ารายนี้');
        }
    }
    async resolveRef(docType, refDocId) {
        const expected = REF_TYPE[docType];
        if (!refDocId) {
            return null;
        }
        if (!expected) {
            throw new BadRequestException('ใบเสนอราคาไม่มีเอกสารอ้างอิง');
        }
        const ref = await this.documentsRepository.findOne({
            where: { docId: refDocId },
        });
        if (!ref) {
            throw new NotFoundException('ไม่พบเอกสารอ้างอิง');
        }
        if (ref.docType !== expected) {
            throw new BadRequestException('เอกสารอ้างอิงชนิดไม่ถูกต้อง');
        }
        if (ref.status === 'cancelled' ||
            ref.status === 'void') {
            throw new BadRequestException('เอกสารอ้างอิงถูกยกเลิกแล้ว');
        }
        return ref;
    }
    async nextDocNo(docType, issueDate, manager) {
        const year = Number(issueDate.slice(0, 4));
        await manager.query(`INSERT INTO document_sequences (doc_type, year, last_no)
       VALUES ($1, $2, 0)
       ON CONFLICT (doc_type, year) DO NOTHING`, [docType, year]);
        const sequence = await manager.findOne(DocumentSequence, {
            where: { docType, year },
            lock: { mode: 'pessimistic_write' },
        });
        if (!sequence) {
            throw new BadRequestException('ไม่สามารถออกเลขที่เอกสารได้');
        }
        sequence.lastNo += 1;
        await manager.save(sequence);
        return `${DOC_PREFIXES[docType]}-${year}-${String(sequence.lastNo).padStart(3, '0')}`;
    }
};
DocumentsService = __decorate([
    Injectable(),
    __param(0, InjectRepository(DocumentRecord)),
    __param(1, InjectRepository(Customer)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        CustomersService])
], DocumentsService);
export { DocumentsService };
//# sourceMappingURL=documents.service.js.map