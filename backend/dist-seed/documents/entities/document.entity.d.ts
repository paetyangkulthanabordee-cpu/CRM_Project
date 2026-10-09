import type { DocType } from '../document-types.js';
export declare class DocumentRecord {
    docId: number;
    docType: DocType;
    docNo: string;
    customerId: number | null;
    issueDate: string;
    dueDate: string | null;
    refDocId: number | null;
    refDocNo: string | null;
    amount: number;
    status: string;
    note: string | null;
    createdBy: number | null;
    createdAt: Date;
    updatedAt: Date;
}
