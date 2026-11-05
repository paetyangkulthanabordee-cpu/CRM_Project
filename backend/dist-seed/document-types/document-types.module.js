var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { DocumentTypesController } from './document-types.controller.js';
import { DocumentTypesService } from './document-types.service.js';
let DocumentTypesModule = class DocumentTypesModule {
};
DocumentTypesModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([DocumentType])],
        controllers: [DocumentTypesController],
        providers: [DocumentTypesService],
        exports: [DocumentTypesService],
    })
], DocumentTypesModule);
export { DocumentTypesModule };
//# sourceMappingURL=document-types.module.js.map