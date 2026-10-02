import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer } from '../customers/entities/customer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DocumentRecord } from './entities/document.entity.js';
import { DocumentSequence } from './entities/document-sequence.entity.js';

@Module({
  imports: [
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
export class DocumentsModule {}
