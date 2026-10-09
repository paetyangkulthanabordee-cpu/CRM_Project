import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    stats(): Promise<Record<string, {
        count: number;
        total: number;
        pendingAmount: number;
    }>>;
    findAll(query: ListDocumentsDto): Promise<(import("./entities/document.entity.js").DocumentRecord & {
        customerName: any;
        creatorName: any;
    })[]>;
    findOne(id: number): Promise<import("./entities/document.entity.js").DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    create(dto: CreateDocumentDto, user: AuthUser): Promise<import("./entities/document.entity.js").DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    update(id: number, dto: UpdateDocumentDto): Promise<import("./entities/document.entity.js").DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    remove(id: number): Promise<{
        docId: number;
        deleted: boolean;
    }>;
}
