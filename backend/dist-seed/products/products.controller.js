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
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductGroupDto } from './dto/product-group.dto.js';
import { UpdateProductGroupDto } from './dto/product-group.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    stats() {
        return this.productsService.stats();
    }
    findAll(query) {
        return this.productsService.findAll(query);
    }
    findAllGroups() {
        return this.productsService.findAllGroups();
    }
    findAllUnits() {
        return this.productsService.findAllUnits();
    }
    findOne(id) {
        return this.productsService.findOne(id);
    }
    create(dto) {
        return this.productsService.create(dto);
    }
    update(id, dto) {
        return this.productsService.update(id, dto);
    }
    remove(id) {
        return this.productsService.remove(id);
    }
    createGroup(dto) {
        return this.productsService.createGroup(dto);
    }
    updateGroup(id, dto) {
        return this.productsService.updateGroup(id, dto);
    }
    removeGroup(id) {
        return this.productsService.removeGroup(id);
    }
    createUnit(dto) {
        return this.productsService.createUnit(dto);
    }
    updateUnit(id, dto) {
        return this.productsService.updateUnit(id, dto);
    }
    removeUnit(id) {
        return this.productsService.removeUnit(id);
    }
};
__decorate([
    Get('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "stats", null);
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListProductsDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAll", null);
__decorate([
    Get('groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAllGroups", null);
__decorate([
    Get('units'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAllUnits", null);
__decorate([
    Get(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findOne", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "create", null);
__decorate([
    Patch(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "remove", null);
__decorate([
    Post('groups'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductGroupDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "createGroup", null);
__decorate([
    Patch('groups/:id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateProductGroupDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "updateGroup", null);
__decorate([
    Delete('groups/:id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "removeGroup", null);
__decorate([
    Post('units'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductUnitDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "createUnit", null);
__decorate([
    Patch('units/:id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateProductUnitDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "updateUnit", null);
__decorate([
    Delete('units/:id'),
    RequirePermissions('products', 'productManagement'),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "removeUnit", null);
ProductsController = __decorate([
    Controller('products'),
    RequirePermissions('products'),
    __metadata("design:paramtypes", [ProductsService])
], ProductsController);
export { ProductsController };
//# sourceMappingURL=products.controller.js.map