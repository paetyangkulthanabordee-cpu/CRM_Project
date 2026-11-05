var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgingRule } from './entities/aging-rule.entity.js';
import { AgingRulesController } from './aging-rules.controller.js';
import { AgingRulesService } from './aging-rules.service.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';
let AgingRulesModule = class AgingRulesModule {
};
AgingRulesModule = __decorate([
    Module({
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
], AgingRulesModule);
export { AgingRulesModule };
//# sourceMappingURL=aging-rules.module.js.map