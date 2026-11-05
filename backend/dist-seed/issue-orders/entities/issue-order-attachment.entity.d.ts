import { IssueOrder } from './issue-order.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';
import { User } from '../../users/entities/user.entity.js';
export declare class IssueOrderAttachment {
    id: number;
    issueOrderId: number;
    issueOrder?: IssueOrder;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: number | null;
    uploader?: User;
    documentTypeId: number | null;
    documentType?: DocumentType;
    createdAt: Date;
}
