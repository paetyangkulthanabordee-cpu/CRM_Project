var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DocumentRecord } from './entities/document.entity.js';
import { DocumentSequence } from './entities/document-sequence.entity.js';
let DocumentsModule = class DocumentsModule {
};
DocumentsModule = __decorate([
    Module({
        imports: [
            CustomersModule,
            TypeOrmModule.forFeature([
                DocumentRecord,
                DocumentSequence,
                Customer,
                User,
            ]),
        ],
        controllers: [DocumentsController],
        providers: [DocumentsService],
        exports: [DocumentsService],
    })
], DocumentsModule);
export { DocumentsModule };
//# sourceMappingURL=documents.module.js.map