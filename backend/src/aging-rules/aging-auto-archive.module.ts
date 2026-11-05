import { Module } from '@nestjs/common';

import { IssueOrdersModule } from '../issue-orders/issue-orders.module.js';
import { AgingRulesModule } from './aging-rules.module.js';
import { AgingAutoArchiveService } from './aging-auto-archive.service.js';

/*
 * โมดูล scheduler "ซ่อนการ์ด" อัตโนมัติ (Aging Rule = auto_archive)
 *
 * แยกโมดูลออกจาก AgingRulesModule เพื่อไม่ให้เกิด circular import:
 *   AgingRulesModule  <- IssueOrdersModule (ใช้ assertNotEditLocked)
 *   AgingAutoArchiveModule -> ทั้งคู่ (ใช้ rule + ซ่อนการ์ด)
 */
@Module({
  imports: [AgingRulesModule, IssueOrdersModule],
  providers: [AgingAutoArchiveService],
})
export class AgingAutoArchiveModule {}
