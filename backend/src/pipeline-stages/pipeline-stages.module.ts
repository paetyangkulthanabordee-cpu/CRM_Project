import {
  Global,
  Module,
} from '@nestjs/common';
import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import { PipelineStage } from './entities/pipeline-stage.entity.js';
import { PipelineStagesController } from './pipeline-stages.controller.js';
import { PipelineStagesService } from './pipeline-stages.service.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineStage]),
  ],
  controllers: [PipelineStagesController],
  providers: [PipelineStagesService],
  exports: [PipelineStagesService],
})
export class PipelineStagesModule {}