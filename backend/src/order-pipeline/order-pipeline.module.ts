import {
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import { OrderPipeline } from './entities/order-pipeline.entity.js';

import { OrderPipelineController } from './order-pipeline.controller.js';
import { OrderPipelineService } from './order-pipeline.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderPipeline,
    ]),
  ],
  controllers: [OrderPipelineController],
  providers: [OrderPipelineService],
  exports: [TypeOrmModule, OrderPipelineService],
})
export class OrderPipelineModule {}
