import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

import {
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_BYTES,
  UPLOAD_INVALID_TYPE_MESSAGE,
  IssueOrderAttachmentsService,
} from './issue-order-attachments.service.js';

import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { UploadFile } from './issue-order-attachments.service.js';

/*
 * ไฟล์แนบของใบสั่งซื้อ
 * ใช้ตอนตรวจ Workflow Rule ข้อ "ต้องแนบไฟล์" ก่อนย้ายขั้นตอน
 *
 * path ซ้อนใต้ issue-orders/:id/attachments เพื่อให้สิทธิ์
 * ได้สิทธิ์ชุดเดียวกับบอร์ด (orderPipeline) จาก decorator ที่ class
 */
@Controller('issue-orders/:id/attachments')
@RequirePermissions('orderPipeline')
export class IssueOrderAttachmentsController {
  constructor(
    private readonly attachmentsService: IssueOrderAttachmentsService,
  ) {}

  @Get()
  list(
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.attachmentsService.list(orderId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      /*
       * multer ตรวจขนาดก่อนเข้า memory (เกินกว่านี้ตอบ 413)
       * ส่วนชนิดไฟล์ตรวจเองใน service เพื่อได้ข้อความไทย
       */
      limits: { fileSize: UPLOAD_MAX_BYTES },
      fileFilter: (_req, file, callback) => {
        if (
          UPLOAD_ALLOWED_MIME_TYPES.includes(
            file.mimetype as (typeof UPLOAD_ALLOWED_MIME_TYPES)[number],
          )
        ) {
          callback(null, true);
          return;
        }

        callback(
          new BadRequestException(
            UPLOAD_INVALID_TYPE_MESSAGE,
          ),
          false,
        );
      },
    }),
  )
  upload(
    @Param('id', ParseIntPipe) orderId: number,
    @UploadedFile() file?: UploadFile,
    @CurrentUser() user?: AuthUser,
    /*
     * ประเภทเอกสารของไฟล์แนบ (form field ตอน multipart)
     * ไม่ส่งก็ได้ -> NULL
     */
    @Body('documentTypeId') documentTypeIdRaw?: string,
  ) {
    return this.attachmentsService.upload(
      orderId,
      file,
      user?.sub ?? null,
      parseDocumentTypeId(documentTypeIdRaw),
    );
  }

  /*
   * สตรีมไฟล์กลับผ่าน endpoint ที่มี JWT
   * จึงไม่ต้องเปิดโฟลเดอร์ uploads เป็น static สาธารณะ
   */
  @Get(':attachmentId/file')
  async download(
    @Param('id', ParseIntPipe) orderId: number,
    @Param('attachmentId', ParseIntPipe)
    attachmentId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.attachmentsService.getFile(
      orderId,
      attachmentId,
    );

    const asciiFallback = file.originalName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\]/g, '_');

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'Content-Length': String(file.buffer.length),
    });

    return new StreamableFile(file.buffer);
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  remove(
    @Param('id', ParseIntPipe) orderId: number,
    @Param('attachmentId', ParseIntPipe)
    attachmentId: number,
  ) {
    return this.attachmentsService.remove(
      orderId,
      attachmentId,
    );
  }
}

/*
 * form field จาก multipart มาเป็น string เสมอ
 * ค่าว่าง/ไม่ส่ง -> NULL, ค่าที่ไม่ใช่จำนวนเต็ม -> 400
 */
function parseDocumentTypeId(
  raw: string | undefined,
): number | null {
  if (raw === undefined || raw.trim() === '') {
    return null;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(
      'documentTypeId ต้องเป็นจำนวนเต็มบวก',
    );
  }

  return value;
}
