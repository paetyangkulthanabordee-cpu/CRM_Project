import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ILike,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';

import { DocumentType } from '../documents/entities/document-type.entity.js';

/*
 * แถว document_type + จำนวนการใช้งาน
 * ตารางมีแค่ id + document_type (ไม่มีคอลัมน์คำอธิบาย)
 * จึง extends entity แล้วแนบตัวนับมาด้วย
 */
export interface DocumentTypeWithUsage
  extends DocumentType {
  ruleUsageCount: number;
  attachmentUsageCount: number;
}

/* COUNT(*) จาก pg คืนเป็น string ต้องแปลงเป็น number เอง */
interface UsageRow {
  id: number;
  rule_count: string | number;
  attachment_count: string | number;
}

interface UsageCounts {
  ruleUsageCount: number;
  attachmentUsageCount: number;
}

const EMPTY_USAGE: UsageCounts = {
  ruleUsageCount: 0,
  attachmentUsageCount: 0,
};

/* ค่า PostgreSQL error code สำหรับ unique violation */
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: string;
  };

  return driverError?.code === UNIQUE_VIOLATION;
}

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly documentTypesRepository: Repository<DocumentType>,
  ) {}

  /*
   * จำนวน rule/ไฟล์แนบที่ชี้มายังแต่ละ document_type
   * ยิงทีเดียวทั้งตาราง (ตาราง lookup เล็ก) ด้วย subquery ต่อ row
   */
  private async loadUsage(
    ids: number[],
  ): Promise<Map<number, UsageCounts>> {
    const usage = new Map<number, UsageCounts>();

    if (ids.length === 0) {
      return usage;
    }

    const rows = await this.documentTypesRepository.manager.query<UsageRow[]>(
      `
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
      `,
      [ids],
    );

    for (const row of rows) {
      usage.set(Number(row.id), {
        ruleUsageCount: Number(row.rule_count) || 0,
        attachmentUsageCount:
          Number(row.attachment_count) || 0,
      });
    }

    return usage;
  }

  /*
   * รายการประเภทเอกสารทั้งหมด (lookup สำหรับ dropdown ฝั่ง UI)
   * เรียงตาม id = ลำดับที่ seed ไว้ในตาราง
   *
   * ⚠️ คงรูป response เป็น array ตรง ๆ
   *   หน้า /workflow-rules รอค่าเป็น DocumentTypeItem[] อยู่
   */
  async findAll(): Promise<DocumentTypeWithUsage[]> {
    const rows = await this.documentTypesRepository.find({
      order: { id: 'ASC' },
    });

    const usage = await this.loadUsage(
      rows.map((row) => row.id),
    );

    /*
     * ประกอบ object ใหม่ (ไม่ spread entity)
     * เพราะการ spread class instance จะทำ prototype หาย
     */
    return rows.map((row) => {
      const counts = usage.get(row.id) ?? EMPTY_USAGE;

      return {
        id: row.id,
        documentType: row.documentType,
        ...counts,
      };
    });
  }

  async findOne(id: number): Promise<DocumentType> {
    const documentType =
      await this.documentTypesRepository.findOne({
        where: { id },
      });

    if (!documentType) {
      throw new NotFoundException(
        'ไม่พบประเภทเอกสารรายการนี้',
      );
    }

    return documentType;
  }

  /*
   * ชื่อซ้ำถือว่าผิดแม้คนละตัวพิมพ์ (ตาราง DB บังคับแค่ตรงตัว)
   * กันสร้าง "Quotation" คู่กับ "quotation" ที่อ่านแล้วสับสน
   */
  private async assertNameNotTaken(
    documentType: string,
    exceptId?: number,
  ): Promise<void> {
    const existing =
      await this.documentTypesRepository.findOne({
        where: { documentType: ILike(documentType) },
      });

    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        `มีประเภทเอกสารชื่อ "${documentType}" อยู่แล้ว`,
      );
    }
  }

  async create(
    dto: CreateDocumentTypeDto,
  ): Promise<DocumentType> {
    const name = dto.documentType.trim();

    await this.assertNameNotTaken(name);

    try {
      return await this.documentTypesRepository.save({
        documentType: name,
      });
    } catch (error) {
      /* ชน unique constraint ระหว่าง race -> ตอบ 409 แทน 500 */
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `มีประเภทเอกสารชื่อ "${name}" อยู่แล้ว`,
        );
      }

      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateDocumentTypeDto,
  ): Promise<DocumentType> {
    const documentType = await this.findOne(id);

    if (dto.documentType !== undefined) {
      const name = dto.documentType.trim();

      await this.assertNameNotTaken(name, id);

      documentType.documentType = name;
    }

    try {
      return await this.documentTypesRepository.save(
        documentType,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `มีประเภทเอกสารชื่อ "${documentType.documentType}" อยู่แล้ว`,
        );
      }

      throw error;
    }
  }

  /*
   * บล็อกการลบเมื่อยังมีคนใช้อยู่
   * เพราะ FK ทั้งสองฝั่งเป็น ON DELETE SET NULL
   * ถ้าปล่อยลบ rule/ไฟล์แนบจะเสียค่าเงียบ ๆ
   */
  async remove(
    id: number,
  ): Promise<{ id: number; deleted: true }> {
    const documentType = await this.findOne(id);

    const usage = await this.loadUsage([id]);
    const counts = usage.get(id) ?? EMPTY_USAGE;

    if (
      counts.ruleUsageCount > 0 ||
      counts.attachmentUsageCount > 0
    ) {
      throw new ConflictException(
        `ไม่สามารถลบประเภทเอกสาร "${documentType.documentType}" ได้ ` +
          `เพราะยังถูกใช้งานอยู่ใน Workflow Rule ${counts.ruleUsageCount} รายการ ` +
          `และไฟล์แนบใบสั่งซื้อ ${counts.attachmentUsageCount} รายการ`,
      );
    }

    await this.documentTypesRepository.remove(
      documentType,
    );

    return { id, deleted: true };
  }
}
