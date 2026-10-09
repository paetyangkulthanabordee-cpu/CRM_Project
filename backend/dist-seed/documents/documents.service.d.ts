import { Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service.js';
import { Customer } from '../customers/entities/customer.entity.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentRecord } from './entities/document.entity.js';
export declare class DocumentsService {
    private readonly documentsRepository;
    private readonly customersRepository;
    private readonly customersService;
    constructor(documentsRepository: Repository<DocumentRecord>, customersRepository: Repository<Customer>, customersService: CustomersService);
    findAll(query: ListDocumentsDto): Promise<(DocumentRecord & {
        customerName: any;
        creatorName: any;
    })[]>;
    findOne(docId: number): Promise<DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    stats(): Promise<Record<string, {
        count: number;
        total: number;
        pendingAmount: number;
    }>>;
    create(dto: CreateDocumentDto, userId: number): Promise<DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    update(docId: number, dto: UpdateDocumentDto): Promise<DocumentRecord & {
        customerName: any;
        creatorName: any;
    }>;
    remove(docId: number): Promise<{
        docId: number;
        deleted: boolean;
    }>;
    private assertStatus;
    private assertCustomer;
    private resolveRef;
    private nextDocNo;
}
