export const DOC_TYPES = [
  'quotation',
  'invoice',
  'receipt',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_PREFIXES: Record<DocType, string> = {
  quotation: 'QT',
  invoice: 'IV',
  receipt: 'RC',
};

export const DOCUMENT_STATUSES: Record<
  DocType,
  readonly string[]
> = {
  quotation: ['draft', 'approved', 'cancelled'],
  invoice: ['pending', 'paid', 'cancelled'],
  receipt: ['completed', 'void'],
};

export type DocumentStatus =
  | 'draft'
  | 'approved'
  | 'cancelled'
  | 'pending'
  | 'paid'
  | 'completed'
  | 'void';

export const ALL_DOCUMENT_STATUSES: string[] = [
  ...DOCUMENT_STATUSES.quotation,
  ...DOCUMENT_STATUSES.invoice,
  ...DOCUMENT_STATUSES.receipt,
];

export const DEFAULT_STATUS: Record<DocType, string> = {
  quotation: 'draft',
  invoice: 'pending',
  receipt: 'completed',
};

export const REF_TYPE: Record<
  DocType,
  DocType | null
> = {
  quotation: null,
  invoice: 'quotation',
  receipt: 'invoice',
};
