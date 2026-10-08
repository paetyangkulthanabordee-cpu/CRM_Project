export const CUSTOMER_STATUSES = [
  "lead",
  "qualified",
  "send_quotation",
  "payment",
  "contract",
  "idle",
  "not_interested",
] as const;

export type CustomerStatus =
  (typeof CUSTOMER_STATUSES)[number];

export const STATUS_LABELS: Record<
  string,
  string
> = {
  lead: "Lead",
  qualified: "Qualified",
  send_quotation: "Send Quotation",
  payment: "Payment",
  contract: "Contract",
  idle: "Idle",
  not_interested: "ลูกค้าไม่สนใจ",
};

export interface CustomerColumn {
  status: CustomerStatus;
  label: string;
  color: string;
}

export const CUSTOMER_COLUMNS: CustomerColumn[] = [
  {
    status: "contract",
    label: "Contract",
    color: "#7c3aed",
  },
  {
    status: "lead",
    label: "Lead",
    color: "#64748b",
  },
  {
    status: "qualified",
    label: "Qualified",
    color: "#0f62fe",
  },
  {
    status: "idle",
    label: "Idle",
    color: "#94a3b8",
  },
  {
    status: "send_quotation",
    label: "Send Quotation",
    color: "#eab308",
  },
  {
    status: "payment",
    label: "Payment",
    color: "#16a34a",
  },
  {
    status: "not_interested",
    label: "ลูกค้าไม่สนใจ",
    color: "#dc2626",
  },
];

export interface StatusChipStyle {
  bg: string;
  fg: string;
}

export const STATUS_CHIP_STYLES: Record<
  string,
  StatusChipStyle
> = {
  lead: { bg: "#f1f5f9", fg: "#475569" },
  qualified: { bg: "#e8f1ff", fg: "#1d4ed8" },
  send_quotation: {
    bg: "#fdf6d8",
    fg: "#a16207",
  },
  payment: { bg: "#e6f8ec", fg: "#15803d" },
  contract: { bg: "#f1e8ff", fg: "#6d28d9" },
  idle: { bg: "#eef1f6", fg: "#64748b" },
  not_interested: {
    bg: "#fdecec",
    fg: "#b91c1c",
  },
};

export interface SalesUser {
  userId: number;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "SALES";
}

export interface Customer {
  customerId: number;
  companyName: string;
  email: string | null;
  phone: string | null;
  status: string;
  assignedId: number | null;
  assignedUser?: SalesUser | null;
  purchaseCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* =====================================================
   PIPELINE COLUMNS (จัดการได้จากหน้า Administration)
   คอลัมน์ถูกกำหนดจาก DB ไม่ใช่ hardcode
===================================================== */

export interface PipelineStage {
  stageId: number;
  stageKey: string;
  label: string;
  color: string;
  position: number;
  customerCount: number;
}

export const STAGE_COLOR_PRESETS = [
  "#64748b",
  "#0f62fe",
  "#16a34a",
  "#eab308",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
] as const;

export interface DashboardKpis {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  dealCustomers: number;
  conversionRate: number;
}

/* =====================================================
   DOCUMENTS (Quotation / Invoice / Receipt)
===================================================== */

export const DOC_TYPES = [
  "quotation",
  "invoice",
  "receipt",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<
  DocType,
  string
> = {
  quotation: "Quotation",
  invoice: "Invoice",
  receipt: "Receipt",
};

export const DOC_TYPE_LABELS_TH: Record<
  DocType,
  string
> = {
  quotation: "ใบเสนอราคา",
  invoice: "ใบแจ้งหนี้",
  receipt: "ใบเสร็จรับเงิน",
};

export const DOC_PREFIXES: Record<DocType, string> =
  {
    quotation: "QT",
    invoice: "IV",
    receipt: "RC",
  };

export const DOCUMENT_STATUSES: Record<
  DocType,
  readonly string[]
> = {
  quotation: ["draft", "approved", "cancelled"],
  invoice: ["pending", "paid", "cancelled"],
  receipt: ["completed", "void"],
};

export const DOC_STATUS_LABELS: Record<
  string,
  string
> = {
  draft: "แบบร่าง",
  approved: "อนุมัติแล้ว",
  cancelled: "ยกเลิก",
  pending: "รอชำระ",
  paid: "ชำระแล้ว",
  completed: "สำเร็จ",
  void: "ยกเลิก",
};

export const DOC_STATUS_STYLES: Record<
  string,
  StatusChipStyle
> = {
  draft: { bg: "#f1f5f9", fg: "#475569" },
  approved: { bg: "#e6f8ec", fg: "#15803d" },
  cancelled: { bg: "#fdecec", fg: "#b91c1c" },
  pending: { bg: "#fff4e8", fg: "#c2410c" },
  paid: { bg: "#e6f8ec", fg: "#15803d" },
  completed: { bg: "#e8f1ff", fg: "#1d4ed8" },
  void: { bg: "#fdecec", fg: "#b91c1c" },
};

export const REF_TYPE: Record<
  DocType,
  DocType | null
> = {
  quotation: null,
  invoice: "quotation",
  receipt: "invoice",
};

export interface DocumentItem {
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
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  creatorName: string | null;
}

export interface DocumentStatsEntry {
  count: number;
  total: number;
  pendingAmount: number;
}

export type DocumentStats = Record<
  DocType,
  DocumentStatsEntry
>;

export interface DashboardStage {
  stage: string;
  status: CustomerStatus;
  count: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  statuses: {
    status: CustomerStatus;
    count: number;
  }[];
  stages: DashboardStage[];
  recentCustomers: Customer[];
}
