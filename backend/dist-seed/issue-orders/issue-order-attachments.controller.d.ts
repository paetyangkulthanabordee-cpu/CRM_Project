import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { IssueOrderAttachmentsService } from './issue-order-attachments.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { UploadFile } from './issue-order-attachments.service.js';
export declare class IssueOrderAttachmentsController {
    private readonly attachmentsService;
    constructor(attachmentsService: IssueOrderAttachmentsService);
    list(orderId: number): Promise<import("./issue-order-attachments.service.js").AttachmentView[]>;
    upload(orderId: number, file?: UploadFile, user?: AuthUser, documentTypeIdRaw?: string): Promise<import("./issue-order-attachments.service.js").AttachmentView>;
    download(orderId: number, attachmentId: number, res: Response): Promise<StreamableFile>;
    remove(orderId: number, attachmentId: number): Promise<{
        attachmentId: number;
        deleted: boolean;
    }>;
}
