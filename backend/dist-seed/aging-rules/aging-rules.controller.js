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
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, } from '@nestjs/common';
import { CreateAgingRuleDto, UpdateAgingRuleDto, } from './dto/aging-rule.dto.js';
import { AgingRulesService } from './aging-rules.service.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
let AgingRulesController = class AgingRulesController {
    rulesService;
    constructor(rulesService) {
        this.rulesService = rulesService;
    }
    findAll() {
        return this.rulesService.findAll();
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
], AgingRulesController.prototype, "findAll", null);
__decorate([
    Post(),
    RequirePermissions('administration'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAgingRuleDto]),
    __metadata("design:returntype", Promise)
], AgingRulesController.prototype, "create", null);
__decorate([
    Patch(':ruleId'),
    RequirePermissions('administration'),
    __param(0, Param('ruleId', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateAgingRuleDto]),
    __metadata("design:returntype", Promise)
], AgingRulesController.prototype, "update", null);
__decorate([
    Delete(':ruleId'),
    RequirePermissions('administration'),
    __param(0, Param('ruleId', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AgingRulesController.prototype, "remove", null);
AgingRulesController = __decorate([
    Controller('aging-rules'),
    __metadata("design:paramtypes", [AgingRulesService])
], AgingRulesController);
export { AgingRulesController };
//# sourceMappingURL=aging-rules.controller.js.map