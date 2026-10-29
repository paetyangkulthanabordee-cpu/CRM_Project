import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { DocumentTypesService } from './document-types.service.js';

import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';

import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';

import type { DocumentType } from '../documents/entities/document-type.entity.js';
import type { DocumentTypeWithUsage } from './document-types.service.js';

/*
 * ประเภทเอกสาร (ตาราง document_type)
 * ใช้ตอนเลือกประเภทเอกสารใน Workflow Rule / ไฟล์แนบใบสั่งซื้อ
 *
 * GET อ่านได้ทุกคนที่ login (ตรงกับ GET /workflow-rules)
 *   — หน้า workflow-rules รอ response เป็น array ตรง ๆ
 * ส่วนเพิ่ม/แก้/ลบ จำกัด Administration เท่านั้น
 */
@Controller('document-types')
export class DocumentTypesController {
  constructor(
    private readonly documentTypesService: DocumentTypesService,
  ) {}

  @Get()
  findAll(): Promise<DocumentTypeWithUsage[]> {
    return this.documentTypesService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentType> {
    return this.documentTypesService.findOne(id);
  }

  @Post()
  @RequirePermissions('administration')
  create(
    @Body() dto: CreateDocumentTypeDto,
  ): Promise<DocumentType> {
    return this.documentTypesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('administration')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentTypeDto,
  ): Promise<DocumentType> {
    return this.documentTypesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('administration')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; deleted: true }> {
    return this.documentTypesService.remove(id);
  }
}
