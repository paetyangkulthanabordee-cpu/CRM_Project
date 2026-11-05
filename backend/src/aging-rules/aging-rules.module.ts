import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgingRule } from './entities/aging-rule.entity.js';
import { AgingRulesController } from './aging-rules.controller.js';
import { AgingRulesService } from './aging-rules.service.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';

/*
 * โมดูล rules ประเภท Time-based (Aging)
 * ไม่ต้องเป็น @Global เพราะไม่มี service อื่นของ backend ฉีดใช้ —
 * บอร์ดฝั่ง frontend ดึง Threshold ผ่าน GET /api/aging-rules ตรง ๆ
 *
 * register ทั้ง 2 ตารางคอลัมน์ด้วย เพราะ service ตรวจว่า
 * stage_key ของ rule มีอยู่จริงใน order_pipeline / pipeline_stages
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgingRule,
      OrderPipeline,
      PipelineStage,
    ]),
  ],
  controllers: [AgingRulesController],
  providers: [AgingRulesService],
  exports: [AgingRulesService],
})
export class AgingRulesModule {}
