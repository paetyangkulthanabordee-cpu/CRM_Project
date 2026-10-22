export declare const DOC_TYPES: readonly ["quotation", "invoice", "receipt", "purchase_order"];
export type DocType = (typeof DOC_TYPES)[number];
export declare const DOC_PREFIXES: Record<DocType, string>;
export declare const REF_TYPE: Record<DocType, DocType | null>;
