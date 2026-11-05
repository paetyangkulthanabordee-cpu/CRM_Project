import { Repository } from 'typeorm';
import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderAttachment } from './entities/issue-order-attachment.entity.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
export declare const UPLOAD_ALLOWED_MIME_TYPES: readonly ["application/pdf", "image/png", "image/jpeg", "image/webp", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export declare const UPLOAD_MAX_BYTES: number;
export declare const UPLOAD_INVALID_TYPE_MESSAGE = "\u0E44\u0E1F\u0E25\u0E4C\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A (\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A PDF, \u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E, Excel \u0E41\u0E25\u0E30 Word \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19)";
export interface UploadFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export interface AttachmentView {
    attachmentId: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number | null;
    documentTypeId: number | null;
    createdAt: Date;
}
export declare class IssueOrderAttachmentsService {
    private readonly attachmentsRepository;
    private readonly ordersRepository;
    private readonly documentTypesRepository;
    private readonly agingRulesService;
    private readonly uploadDir;
    constructor(attachmentsRepository: Repository<IssueOrderAttachment>, ordersRepository: Repository<IssueOrder>, documentTypesRepository: Repository<DocumentType>, agingRulesService: AgingRulesService);
    list(orderId: number): Promise<AttachmentView[]>;
    upload(orderId: number, file: UploadFile | undefined, userId: number | null, documentTypeId?: number | null): Promise<AttachmentView>;
    getFile(orderId: number, attachmentId: number): Promise<{
        buffer: Buffer;
        originalName: string;
        mimeType: string;
    }>;
    remove(orderId: number, attachmentId: number): Promise<{
        attachmentId: number;
        deleted: boolean;
    }>;
    deleteFilesByOrderId(orderId: number): Promise<number>;
    private assertNotEditLocked;
    private findOne;
    private assertOrderExists;
    private assertDocumentTypeExists;
    private resolveExtension;
    private toView;
}
