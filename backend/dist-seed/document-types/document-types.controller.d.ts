import { DocumentTypesService } from './document-types.service.js';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';
import type { DocumentType } from '../documents/entities/document-type.entity.js';
import type { DocumentTypeWithUsage } from './document-types.service.js';
export declare class DocumentTypesController {
    private readonly documentTypesService;
    constructor(documentTypesService: DocumentTypesService);
    findAll(): Promise<DocumentTypeWithUsage[]>;
    findOne(id: number): Promise<DocumentType>;
    create(dto: CreateDocumentTypeDto): Promise<DocumentType>;
    update(id: number, dto: UpdateDocumentTypeDto): Promise<DocumentType>;
    remove(id: number): Promise<{
        id: number;
        deleted: true;
    }>;
}
