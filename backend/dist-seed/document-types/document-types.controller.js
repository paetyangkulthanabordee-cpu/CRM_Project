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
import { DocumentTypesService } from './document-types.service.js';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
let DocumentTypesController = class DocumentTypesController {
    documentTypesService;
    constructor(documentTypesService) {
        this.documentTypesService = documentTypesService;
    }
    findAll() {
        return this.documentTypesService.findAll();
    }
    findOne(id) {
        return this.documentTypesService.findOne(id);
    }
    create(dto) {
        return this.documentTypesService.create(dto);
    }
    update(id, dto) {
        return this.documentTypesService.update(id, dto);
    }
    remove(id) {
        return this.documentTypesService.remove(id);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DocumentTypesController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentTypesController.prototype, "findOne", null);
__decorate([
    Post(),
    RequirePermissions('administration'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateDocumentTypeDto]),
    __metadata("design:returntype", Promise)
], DocumentTypesController.prototype, "create", null);
__decorate([
    Patch(':id'),
    RequirePermissions('administration'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateDocumentTypeDto]),
    __metadata("design:returntype", Promise)
], DocumentTypesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequirePermissions('administration'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentTypesController.prototype, "remove", null);
DocumentTypesController = __decorate([
    Controller('document-types'),
    __metadata("design:paramtypes", [DocumentTypesService])
], DocumentTypesController);
export { DocumentTypesController };
//# sourceMappingURL=document-types.controller.js.map