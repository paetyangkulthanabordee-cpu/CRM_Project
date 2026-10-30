import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgingRule } from './entities/aging-rule.entity.js';
import { AgingRulesController } from './aging-rules.controller.js';
import { AgingRulesService } from './aging-rules.service.js';

/*
 * โมดูล rules ประเภท Time-based (Aging)
 * ไม่ต้องเป็น @Global เพราะไม่มี service อื่นของ backend ฉีดใช้ —
 * บอร์ดฝั่ง frontend ดึง Threshold ผ่าน GET /api/aging-rules ตรง ๆ
 */
@Module({
  imports: [TypeOrmModule.forFeature([AgingRule])],
  controllers: [AgingRulesController],
  providers: [AgingRulesService],
  exports: [AgingRulesService],
})
export class AgingRulesModule {}
