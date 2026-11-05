var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { BadRequestException, Injectable, NotFoundException, } from '@nestjs/common';
const RETIRED_MESSAGE = 'ระบบเอกสารเดิม (ตาราง documents) ถูกถอดออกแล้ว — ใช้ไฟล์แนบใบสั่งซื้อแทน (ดูที่หน้ารายละเอียดใบสั่งซื้อ)';
let DocumentsService = class DocumentsService {
    async findAll(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
        return {
            data: [],
            total: 0,
            page,
            limit,
        };
    }
    async findOne(_docId) {
        throw new NotFoundException('ไม่พบเอกสารนี้');
    }
    async stats() {
        return {
            quotation: { count: 0, total: 0 },
            invoice: { count: 0, total: 0 },
            receipt: { count: 0, total: 0 },
            purchase_order: { count: 0, total: 0 },
        };
    }
    async create(_dto, _userId) {
        throw new BadRequestException(RETIRED_MESSAGE);
    }
    async update(_docId, _dto) {
        throw new BadRequestException(RETIRED_MESSAGE);
    }
    async remove(_docId) {
        throw new BadRequestException(RETIRED_MESSAGE);
    }
};
DocumentsService = __decorate([
    Injectable()
], DocumentsService);
export { DocumentsService };
//# sourceMappingURL=documents.service.js.map