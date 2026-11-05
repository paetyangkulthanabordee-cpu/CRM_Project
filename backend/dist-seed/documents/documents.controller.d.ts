import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    stats(): Promise<{
        quotation: {
            count: number;
            total: number;
        };
        invoice: {
            count: number;
            total: number;
        };
        receipt: {
            count: number;
            total: number;
        };
        purchase_order: {
            count: number;
            total: number;
        };
    }>;
    findAll(query: ListDocumentsDto): Promise<{
        data: never[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<void>;
    create(dto: CreateDocumentDto, user: AuthUser): Promise<void>;
    update(id: number, dto: UpdateDocumentDto): Promise<void>;
    remove(id: number): Promise<void>;
}
