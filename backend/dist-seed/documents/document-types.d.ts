export declare const DOC_TYPES: readonly ["quotation", "invoice", "receipt"];
export type DocType = (typeof DOC_TYPES)[number];
export declare const DOC_PREFIXES: Record<DocType, string>;
export declare const DOCUMENT_STATUSES: Record<DocType, readonly string[]>;
export type DocumentStatus = 'draft' | 'approved' | 'cancelled' | 'pending' | 'paid' | 'completed' | 'void';
export declare const ALL_DOCUMENT_STATUSES: string[];
export declare const DEFAULT_STATUS: Record<DocType, string>;
export declare const REF_TYPE: Record<DocType, DocType | null>;
