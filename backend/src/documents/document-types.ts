export const DOC_TYPES = [
  'quotation',
  'invoice',
  'receipt',
  'purchase_order',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_PREFIXES: Record<DocType, string> = {
  quotation: 'QT',
  invoice: 'IV',
  receipt: 'RC',
  purchase_order: 'PO',
};

export const REF_TYPE: Record<
  DocType,
  DocType | null
> = {
  quotation: null,
  invoice: 'quotation',
  receipt: 'invoice',
  purchase_order: null,
};
