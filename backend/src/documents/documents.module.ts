import { Module } from '@nestjs/common';

import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

/*
 * เดิม register DocumentRecord/DocumentSequence + CustomersModule
 * หลัง migration 024 (drop ตาราง documents) service ไม่ query ตารางเหล่านั้นแล้ว
 * จึงเหลือแค่ controller + service ตัว stub ให้หน้าเดิมไม่พัง
 */
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
