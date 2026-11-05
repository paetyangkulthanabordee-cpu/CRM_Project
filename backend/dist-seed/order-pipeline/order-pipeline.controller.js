var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, } from '@nestjs/common';
import { CreateOrderPipelineDto, ReorderOrderPipelineDto, UpdateOrderPipelineDto, } from './dto/order-pipeline.dto.js';
import { OrderPipelineService, } from './order-pipeline.service.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
let OrderPipelineController = class OrderPipelineController {
    stagesService;
    constructor(stagesService) {
        this.stagesService = stagesService;
    }
    findAll() {
        return this.stagesService.findAll();
    }
    create(dto) {
        return this.stagesService.create(dto);
    }
    reorder(dto) {
        return this.stagesService.reorder(dto);
    }
    update(stageId, dto) {
        return this.stagesService.update(stageId, dto);
    }
    remove(stageId) {
        return this.stagesService.remove(stageId);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrderPipelineController.prototype, "findAll", null);
__decorate([
    Post(),
    RequirePermissions('administration'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOrderPipelineDto]),
    __metadata("design:returntype", Promise)
], OrderPipelineController.prototype, "create", null);
__decorate([
    Patch('order'),
    HttpCode(200),
    RequirePermissions('administration'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReorderOrderPipelineDto]),
    __metadata("design:returntype", Promise)
], OrderPipelineController.prototype, "reorder", null);
__decorate([
    Patch(':stageId'),
    RequirePermissions('administration'),
    __param(0, Param('stageId', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateOrderPipelineDto]),
    __metadata("design:returntype", Promise)
], OrderPipelineController.prototype, "update", null);
__decorate([
    Delete(':stageId'),
    RequirePermissions('administration'),
    __param(0, Param('stageId', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], OrderPipelineController.prototype, "remove", null);
OrderPipelineController = __decorate([
    Controller('order-pipeline'),
    __metadata("design:paramtypes", [OrderPipelineService])
], OrderPipelineController);
export { OrderPipelineController };
//# sourceMappingURL=order-pipeline.controller.js.map