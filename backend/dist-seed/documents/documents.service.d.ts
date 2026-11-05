import type { CreateDocumentDto } from './dto/create-document.dto.js';
import type { ListDocumentsDto } from './dto/list-documents.dto.js';
import type { UpdateDocumentDto } from './dto/update-document.dto.js';
export declare class DocumentsService {
    findAll(query: ListDocumentsDto): Promise<{
        data: never[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(_docId: number): Promise<void>;
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
    create(_dto: CreateDocumentDto, _userId: number): Promise<void>;
    update(_docId: number, _dto: UpdateDocumentDto): Promise<void>;
    remove(_docId: number): Promise<void>;
}
