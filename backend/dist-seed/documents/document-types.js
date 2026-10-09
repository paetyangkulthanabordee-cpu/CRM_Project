export const DOC_TYPES = [
    'quotation',
    'invoice',
    'receipt',
];
export const DOC_PREFIXES = {
    quotation: 'QT',
    invoice: 'IV',
    receipt: 'RC',
};
export const DOCUMENT_STATUSES = {
    quotation: ['draft', 'approved', 'cancelled'],
    invoice: ['pending', 'paid', 'cancelled'],
    receipt: ['completed', 'void'],
};
export const ALL_DOCUMENT_STATUSES = [
    ...DOCUMENT_STATUSES.quotation,
    ...DOCUMENT_STATUSES.invoice,
    ...DOCUMENT_STATUSES.receipt,
];
export const DEFAULT_STATUS = {
    quotation: 'draft',
    invoice: 'pending',
    receipt: 'completed',
};
export const REF_TYPE = {
    quotation: null,
    invoice: 'quotation',
    receipt: 'invoice',
};
//# sourceMappingURL=document-types.js.map