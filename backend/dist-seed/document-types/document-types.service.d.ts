import { Repository } from 'typeorm';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';
export interface DocumentTypeWithUsage extends DocumentType {
    ruleUsageCount: number;
    attachmentUsageCount: number;
}
export declare class DocumentTypesService {
    private readonly documentTypesRepository;
    constructor(documentTypesRepository: Repository<DocumentType>);
    private loadUsage;
    findAll(): Promise<DocumentTypeWithUsage[]>;
    findOne(id: number): Promise<DocumentType>;
    private assertNameNotTaken;
    create(dto: CreateDocumentTypeDto): Promise<DocumentType>;
    update(id: number, dto: UpdateDocumentTypeDto): Promise<DocumentType>;
    remove(id: number): Promise<{
        id: number;
        deleted: true;
    }>;
}
