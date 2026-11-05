var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module, } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { OrderPipeline } from './entities/order-pipeline.entity.js';
import { OrderPipelineController } from './order-pipeline.controller.js';
import { OrderPipelineService } from './order-pipeline.service.js';
let OrderPipelineModule = class OrderPipelineModule {
};
OrderPipelineModule = __decorate([
    Module({
        imports: [
            TypeOrmModule.forFeature([
                OrderPipeline,
            ]),
        ],
        controllers: [OrderPipelineController],
        providers: [OrderPipelineService],
        exports: [TypeOrmModule, OrderPipelineService],
    })
], OrderPipelineModule);
export { OrderPipelineModule };
//# sourceMappingURL=order-pipeline.module.js.map