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
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, } from '@nestjs/common';
import { CreateWorkflowRuleDto, UpdateWorkflowRuleDto, } from './dto/workflow-rule.dto.js';
import { WorkflowRulesService } from './workflow-rules.service.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
let WorkflowRulesController = class WorkflowRulesController {
    rulesService;
    constructor(rulesService) {
        this.rulesService = rulesService;
    }
    findAll() {
        return this.rulesService.findAll();
    }
    check(orderId, toStageId) {
        return this.rulesService.checkMove(orderId, toStageId);
    }
    create(dto) {
        return this.rulesService.create(dto);
    }
    update(ruleId, dto) {
        return this.rulesService.update(ruleId, dto);
    }
    remove(ruleId) {
        return this.rulesService.remove(ruleId);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WorkflowRulesController.prototype, "findAll", null);
__decorate([
    Get('check'),
    RequirePermissions('orderPipeline'),
    __param(0, Query('orderId', ParseIntPipe)),
    __param(1, Query('toStageId', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], WorkflowRulesController.prototype, "check", null);
__decorate([
    Post(),
    RequirePermissions('administration'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateWorkflowRuleDto]),
    __metadata("design:returntype", Promise)
], WorkflowRulesController.prototype, "create", null);
__decorate([
    Patch(':ruleId'),
    RequirePermissions('administration'),
    __param(0, Param('ruleId', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateWorkflowRuleDto]),
    __metadata("design:returntype", Promise)
], WorkflowRulesController.prototype, "update", null);
__decorate([
    Delete(':ruleId'),
    RequirePermissions('administration'),
    __param(0, Param('ruleId', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], WorkflowRulesController.prototype, "remove", null);
WorkflowRulesController = __decorate([
    Controller('workflow-rules'),
    __metadata("design:paramtypes", [WorkflowRulesService])
], WorkflowRulesController);
export { WorkflowRulesController };
//# sourceMappingURL=workflow-rules.controller.js.map