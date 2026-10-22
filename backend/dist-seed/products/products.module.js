var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule, } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductGroup } from './entities/product-group.entity.js';
import { ProductUnit } from './entities/product-unit.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
let ProductsModule = class ProductsModule {
};
ProductsModule = __decorate([
    Module({
        imports: [
            TypeOrmModule.forFeature([
                Product,
                ProductGroup,
                ProductUnit,
            ]),
        ],
        controllers: [ProductsController],
        providers: [ProductsService],
        exports: [ProductsService],
    })
], ProductsModule);
export { ProductsModule };
//# sourceMappingURL=products.module.js.map