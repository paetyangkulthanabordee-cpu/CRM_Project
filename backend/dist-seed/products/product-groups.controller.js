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
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { ProductGroupsService } from './product-groups.service.js';
import { CreateProductGroupDto } from './dto/create-product-group.dto.js';
import { ListProductGroupsDto } from './dto/list-product-groups.dto.js';
import { UpdateProductGroupDto } from './dto/update-product-group.dto.js';
let ProductGroupsController = class ProductGroupsController {
    productGroupsService;
    constructor(productGroupsService) {
        this.productGroupsService = productGroupsService;
    }
    findAll(query) {
        return this.productGroupsService.findAll(query);
    }
    findOne(id) {
        return this.productGroupsService.findOne(id);
    }
    create(dto) {
        return this.productGroupsService.create(dto);
    }
    update(id, dto) {
        return this.productGroupsService.update(id, dto);
    }
    remove(id) {
        return this.productGroupsService.remove(id);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListProductGroupsDto]),
    __metadata("design:returntype", void 0)
], ProductGroupsController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductGroupsController.prototype, "findOne", null);
__decorate([
    Post(),
    RequirePermissions('products', 'productManagement'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductGroupDto]),
    __metadata("design:returntype", void 0)
], ProductGroupsController.prototype, "create", null);
__decorate([
    Patch(':id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateProductGroupDto]),
    __metadata("design:returntype", void 0)
], ProductGroupsController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductGroupsController.prototype, "remove", null);
ProductGroupsController = __decorate([
    Controller('product-groups'),
    RequirePermissions('products'),
    __metadata("design:paramtypes", [ProductGroupsService])
], ProductGroupsController);
export { ProductGroupsController };
//# sourceMappingURL=product-groups.controller.js.map