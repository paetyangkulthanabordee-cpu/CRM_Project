import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  CreateDocumentDto,
} from './dto/create-document.dto.js';
import type {
  ListDocumentsDto,
} from './dto/list-documents.dto.js';
import type {
  UpdateDocumentDto,
} from './dto/update-document.dto.js';

/*
 * ระบบเอกสารเดิม (ตาราง documents + document_sequences)
 * ถูกถอดออกตาม migration 024_drop_documents_and_create_document_type
 *
 * แทนที่จะให้ทุก request พังด้วย QueryFailedError ให้ service ชุดนี้
 * คืนค่าว่าง + ข้อความไทยชัดเจน เพื่อให้หน้า customers /
 * CustomerDetailDialog ที่ยังเรียก /api/documents อยู่แสดงผลว่างได้
 * และบอกทางไป "ไฟล์แนบใบสั่งซื้อ" ซึ่งเป็นที่เก็บเอกสารแทน
 */
const RETIRED_MESSAGE =
  'ระบบเอกสารเดิม (ตาราง documents) ถูกถอดออกแล้ว — ใช้ไฟล์แนบใบสั่งซื้อแทน (ดูที่หน้ารายละเอียดใบสั่งซื้อ)';

@Injectable()
export class DocumentsService {
  async findAll(query: ListDocumentsDto) {
    const page = Math.max(
      1,
      Number(query.page) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(query.limit) || 50),
    );

    return {
      data: [],
      total: 0,
      page,
      limit,
    };
  }

  async findOne(_docId: number) {
    throw new NotFoundException(
      'ไม่พบเอกสารนี้',
    );
  }

  async stats() {
    return {
      quotation: { count: 0, total: 0 },
      invoice: { count: 0, total: 0 },
      receipt: { count: 0, total: 0 },
      purchase_order: { count: 0, total: 0 },
    };
  }

  async create(
    _dto: CreateDocumentDto,
    _userId: number,
  ) {
    throw new BadRequestException(RETIRED_MESSAGE);
  }

  async update(
    _docId: number,
    _dto: UpdateDocumentDto,
  ) {
    throw new BadRequestException(RETIRED_MESSAGE);
  }

  async remove(_docId: number) {
    throw new BadRequestException(RETIRED_MESSAGE);
  }
}
