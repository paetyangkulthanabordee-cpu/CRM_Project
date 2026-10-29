import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { extname, join } from 'node:path';
import { Repository } from 'typeorm';

import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderAttachment } from './entities/issue-order-attachment.entity.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';

/*
 * ชนิดไฟล์ที่รับอัปโหลดได้ (เอกสาร/รูปภาพที่ใช้ในงานขาย)
 */
export const UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const UPLOAD_INVALID_TYPE_MESSAGE =
  'ไฟล์ประเภทนี้ไม่รองรับ (รองรับ PDF, รูปภาพ, Excel และ Word เท่านั้น)';

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

/*
 * รูปทรงของไฟล์ที่ multer ส่งมา (MemoryStorage)
 * ไม่ใช้ Express.Multer.File เพราะเครื่องนี้ไม่ได้ติดตั้ง @types/multer
 */
export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface AttachmentView {
  attachmentId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /*
   * ใครเป็นคนอัปโหลดไฟล์แนบนี้ (uploaded_by) — ดูว่าคนไหนแนบไฟล์
   */
  uploadedBy: number | null;
  /*
   * ประเภทเอกสารของไฟล์แนบ (FK -> document_type.id)
   */
  documentTypeId: number | null;
  createdAt: Date;
}

@Injectable()
export class IssueOrderAttachmentsService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(IssueOrderAttachment)
    private readonly attachmentsRepository: Repository<IssueOrderAttachment>,
    @InjectRepository(IssueOrder)
    private readonly ordersRepository: Repository<IssueOrder>,
    @InjectRepository(DocumentType)
    private readonly documentTypesRepository: Repository<DocumentType>,
  ) {
    this.uploadDir =
      process.env.UPLOAD_DIR?.trim() ||
      join(process.cwd(), 'uploads', 'attachments');

    mkdirSync(this.uploadDir, { recursive: true });
  }

  async list(
    orderId: number,
  ): Promise<AttachmentView[]> {
    await this.assertOrderExists(orderId);

    const rows = await this.attachmentsRepository.find(
      {
        where: { issueOrderId: orderId },
        order: { createdAt: 'DESC', id: 'DESC' },
      },
    );

    return rows.map((row) => this.toView(row));
  }

  async upload(
    orderId: number,
    file: UploadFile | undefined,
    userId: number | null,
    documentTypeId: number | null = null,
  ): Promise<AttachmentView> {
    await this.assertOrderExists(orderId);

    if (documentTypeId !== null) {
      await this.assertDocumentTypeExists(
        documentTypeId,
      );
    }

    if (!file) {
      throw new BadRequestException(
        'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด',
      );
    }

    if (
      !UPLOAD_ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof UPLOAD_ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        UPLOAD_INVALID_TYPE_MESSAGE,
      );
    }

    if (file.size <= 0) {
      throw new BadRequestException(
        'ไฟล์ที่อัปโหลดว่างเปล่า',
      );
    }

    /*
     * ขนาดไฟล์ถูกจำกัดด้วย multer limits อยู่แล้ว (ได้ 413)
     * ค่าตรงนี้กันซ้ำอีกชั้นเผื่อถูกเรียกจากทางอื่น
     */
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        'ขนาดไฟล์ต้องไม่เกิน 10 MB',
      );
    }

    const storedName =
      `${randomUUID()}${this.resolveExtension(file)}`;

    /*
     * เก็บไฟล์ก่อน ถ้าเขียนไม่สำเร็จจะได้ไม่มีแถวค้างในตาราง
     */
    writeFileSync(
      join(this.uploadDir, storedName),
      file.buffer,
    );

    try {
      const saved = await this.attachmentsRepository.save(
        this.attachmentsRepository.create({
          issueOrderId: orderId,
          originalName: decodeOriginalName(
            file.originalname,
          ),
          storedName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedBy: userId,
          documentTypeId,
        }),
      );

      return this.toView(saved);
    } catch (error) {
      /*
       * ตารางบันทึกไม่สำเร็จ -> ลบไฟล์ทิ้ง
       * ไม่งั้นจะมีไฟล์กำพร้าบนดิสก์
       */
      removeQuietly(join(this.uploadDir, storedName));
      throw error;
    }
  }

  async getFile(
    orderId: number,
    attachmentId: number,
  ): Promise<{
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }> {
    const row = await this.findOne(
      orderId,
      attachmentId,
    );

    const filePath = join(
      this.uploadDir,
      row.storedName,
    );

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        'ไม่พบไฟล์นี้ในระบบ (อาจถูกลบไปแล้ว)',
      );
    }

    return {
      buffer: readFileSync(filePath),
      originalName: row.originalName,
      mimeType: row.mimeType,
    };
  }

  async remove(orderId: number, attachmentId: number) {
    const row = await this.findOne(
      orderId,
      attachmentId,
    );

    removeQuietly(join(this.uploadDir, row.storedName));

    await this.attachmentsRepository.remove(row);

    return {
      attachmentId,
      deleted: true,
    };
  }

  private async findOne(
    orderId: number,
    attachmentId: number,
  ): Promise<IssueOrderAttachment> {
    const row =
      await this.attachmentsRepository.findOne({
        where: {
          id: attachmentId,
          issueOrderId: orderId,
        },
      });

    if (!row) {
      throw new NotFoundException(
        'ไม่พบไฟล์แนบนี้',
      );
    }

    return row;
  }

  private async assertOrderExists(orderId: number) {
    const exists =
      await this.ordersRepository.exists({
        where: { id: orderId },
      });

    if (!exists) {
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }
  }

  private async assertDocumentTypeExists(
    documentTypeId: number,
  ) {
    const exists =
      await this.documentTypesRepository.exists({
        where: { id: documentTypeId },
      });

    if (!exists) {
      throw new NotFoundException(
        'ไม่พบประเภทเอกสารนี้',
      );
    }
  }

  /*
   * ใช้ extension จากตาราง mime ที่อนุญาต
   * กันชื่อไฟล์แปลก ๆ อย่าง .php หรือ path traversal
   */
  private resolveExtension(file: UploadFile): string {
    const mapped =
      EXT_BY_MIME[file.mimetype] ?? '';

    if (mapped) {
      return mapped;
    }

    const fallback = extname(
      file.originalname,
    ).toLowerCase();

    return /^[.a-z0-9]{1,10}$/.test(fallback)
      ? fallback
      : '';
  }

  private toView(
    row: IssueOrderAttachment,
  ): AttachmentView {
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
}

/*
 * multer อ่าน filename ใน multipart เป็น latin1
 * ทำให้ชื่อไฟล์ไทยกลายเป็น mojibake
 *
 * แปลง latin1 -> utf8 เฉพาะตอนที่แปลงกลับแล้วได้ค่าเดิมพอดี
 * (ชื่อ ASCII ได้ค่าเดิม ส่วนชื่อไทยที่ถูกถอดผิดจะกลับมาถูก)
 * ถ้าชื่อถูกถอดเป็น utf8 ถูกต้องอยู่แล้ว ค่าจะไม่ round-trip จึงคืนค่าเดิม
 */
function decodeOriginalName(name: string): string {
  const asUtf8 = Buffer.from(
    name,
    'latin1',
  ).toString('utf8');

  const roundTrip = Buffer.from(
    asUtf8,
    'utf8',
  ).toString('latin1');

  return roundTrip === name ? asUtf8 : name;
}

function removeQuietly(filePath: string) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // ไฟล์ลบไม่ได้ไม่กระทบข้อมูลในตาราง ปล่อยผ่าน
  }
}
