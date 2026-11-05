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
import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, } from '@nestjs/common';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { IssueOrdersService } from './issue-orders.service.js';
import { CreateIssueOrderDto, MoveIssueOrderStageDto, UpdateIssueOrderDto, } from './dto/issue-order.dto.js';
import { ListIssueOrdersDto } from './dto/list-issue-orders.dto.js';
let IssueOrdersController = class IssueOrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    findAll(query) {
        return this.ordersService.findAll(query);
    }
    findOne(id) {
        return this.ordersService.findOne(id);
    }
    create(dto) {
        return this.ordersService.create(dto);
    }
    update(id, dto) {
        return this.ordersService.update(id, dto);
    }
    moveStage(id, dto) {
        return this.ordersService.moveStage(id, dto.orderPipelineId);
    }
    remove(id) {
        return this.ordersService.remove(id);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListIssueOrdersDto]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "findOne", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateIssueOrderDto]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "create", null);
__decorate([
    Patch(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateIssueOrderDto]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "update", null);
__decorate([
    Patch(':id/stage'),
    HttpCode(200),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, MoveIssueOrderStageDto]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "moveStage", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], IssueOrdersController.prototype, "remove", null);
IssueOrdersController = __decorate([
    Controller('issue-orders'),
    RequirePermissions('orderPipeline'),
    __metadata("design:paramtypes", [IssueOrdersService])
], IssueOrdersController);
export { IssueOrdersController };
//# sourceMappingURL=issue-orders.controller.js.map