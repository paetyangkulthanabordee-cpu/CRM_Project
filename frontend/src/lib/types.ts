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
  purchaseCount: number;
  customerId: number;
  companyName: string;
  email: string | null;
  phone: string | null;
  status: string;
  assignedId: number | null;
  assignedUser?: SalesUser | null;
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

/* =====================================================
   KANBAN COLUMNS (ใช้ร่วมกันทุกบอร์ด)
   คอลัมน์ไม่ว่าจะมาจากตารางไหนก็หน้าตาเดียวกัน
   คือ stageKey + label + color
====================================================== */

export interface KanbanStage {
  stageKey: string;
  label: string;
  color: string;
}

/* =====================================================
   ORDER PIPELINE (บอร์ดใบสั่งซื้อ)
====================================================== */

/*
 * แถวจาก GET /api/order-pipeline
 * มีจำนวนใบสั่งซื้อในคอลัมน์นั้นมาให้ด้วย
 */
export interface OrderPipelineStage
  extends KanbanStage {
  stageId: number;
  position: number;
  issueOrderCount: number;
}

/*
 * คอลัมน์ที่ฝังมาในใบสั่งซื้อ (relation orderPipeline)
 * เป็น object ของตาราง order_pipeline ตรง ๆ ไม่มีจำนวนการ์ด
 */
export interface OrderPipelineColumn {
  id: number;
  stageKey: string;
  label: string;
  color: string;
  position: number;
}

/*
 * หนึ่งแถวในใบสั่งซื้อ
 * เก็บ unitPrice เป็น snapshot ตอนสั่งซื้อ
 */
export interface IssueOrderLine {
  id?: number;
  issueOrderId?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: Product | null;
}

export interface IssueOrder {
  id: number;
  customerId: number;
  customer?: Customer | null;
  orderPipelineId: number;
  orderPipeline?: OrderPipelineColumn | null;
  details?: IssueOrderLine[];
  attachments?: IssueOrderAttachment[];
  amount: number;

  /*
   * ส่วนลดและ VAT ระดับใบสั่งซื้อ (เป็นเปอร์เซ็นต์)
   * amount คือยอดสุทธิหลังหักส่วนลดและบวก VAT แล้ว
   * ใบสั่งซื้อเก่าที่ยังไม่มีข้อมูลให้ treat เป็น 0% / 7%
   */
  discountPercent?: number;
  vatPercent?: number;
  note: string | null;

  /*
   * เวลาของกิจกรรมล่าสุดบนการ์ด (ย้ายขั้นตอน/แก้ไข/อัปโหลดไฟล์)
   * จุดเริ่มต้นนับเวลาของ Aging Rules — ค่า null ให้ fallback ไป updatedAt
   */
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/*
 * ไฟล์แนบของใบสั่งซื้อ (metadata จาก /api/issue-orders/:id/attachments)
 * ใช้ตอนตรวจ Workflow Rule ข้อ "ต้องแนบไฟล์"
 */
export interface IssueOrderAttachment {
  /*
   * ฝั่ง backend ส่งมา 2 แบบ:
   * - GET /issue-orders ส่ง raw entity -> ใช้ field "id"
   * - GET /issue-orders/:id/attachments ส่ง view -> ใช้ "attachmentId"
   */
  id?: number;
  attachmentId?: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;

  /*
   * ประเภทเอกสารที่ผูกไว้ตอนอัปโหลด (เช่น Quotation/Invoice)
   * null = ไฟล์ที่ไม่ได้ผูกประเภท — ใช้แสดงผลในแท็บเอกสารของลูกค้า
   */
  documentTypeId?: number | null;
  uploadedBy?: number | null;
  createdAt: string;
}

/*
 * ประเภทเงื่อนไขของ Workflow Rule
 * - attachment : ต้องแนบไฟล์อย่างน้อย minFiles ไฟล์
 * - field      : ต้องกรอกฟิลด์ที่กำหนด (note / details / amount)
 * - document   : ต้องมีเอกสารประเภท docType ของลูกค้ารายนั้น
 * - payment    : ต้องมีข้อมูลการชำระเงิน (เอกสารใบเสร็จ)
 */
export type WorkflowConditionType =
  | "attachment"
  | "field"
  | "document"
  | "payment";

export interface WorkflowRuleConditionConfig {
  minFiles?: number;
  field?: string;
  docType?: DocType;
}

/*
 * แถวหนึ่งในตาราง Workflow Rules Management
 * backend แนบ label ของ stage ต้นทาง/ปลายทางมาให้แล้ว
 * documentTypeId = FK -> document_type (ใช้กับ conditionType 'document')
 */
export interface WorkflowRule {
  ruleId: number;
  ruleName: string;
  fromStageId: number;
  fromStageKey: string;
  fromStageLabel: string;
  fromStageColor: string;
  toStageId: number;
  toStageKey: string;
  toStageLabel: string;
  toStageColor: string;
  conditionType: WorkflowConditionType;
  conditionConfig: WorkflowRuleConditionConfig;
  documentTypeId?: number | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/*
 * แถวหนึ่งในตาราง aging_rules (Time-based Workflow Rules)
 * กำหนดวันที่เปลี่ยนสีการ์ด Kanban เมื่อไม่มี activity:
 *   ไม่ถึง warningAfterDays  -> Normal (สีปกติ)
 *   ถึง warningAfterDays     -> Warning (สีเหลือง)
 *   ถึง criticalAfterDays    -> Critical (สีแดง)
 * เปิด/ปิดรายละใบได้ผ่านหน้า Administration -> Workflow Rules
 */
export interface AgingRule {
  ruleId: number;
  ruleName: string;
  warningAfterDays: number;
  criticalAfterDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/*
 * ผลตรวจ Workflow Rule หนึ่งข้อของใบสั่งซื้อ
 * มาจาก 400 ตอนย้ายขั้นตอนถูกบล็อก (unmetRules)
 * และ GET /api/workflow-rules/check
 *
 * ใช้แสดงแถบ mark ในหน้ารายละเอียดว่าต้องแนบไฟล์อะไร
 * พร้อมความคืบหน้า currentCount/requiredCount
 */
export interface WorkflowRuleCheck {
  ruleId: number;
  ruleName: string;
  conditionType: WorkflowConditionType;
  /*
   * ฟิลด์ที่ rule ชนิด field เรียกร้อง (note/details/amount)
   * null กับ rule ชนิดอื่น — ใช้วาง inline ใต้ field ที่ถูกต้อง
   */
  fieldKey?: string | null;
  met: boolean;
  requirementText: string;
  documentTypeId: number | null;
  documentTypeLabel: string | null;
  currentCount: number;
  requiredCount: number;
}

/*
 * คำตอบของ GET /api/workflow-rules/check?orderId=&toStageId=
 * allowed = true เมื่อ rule ทุกข้อผ่าน -> หน้ารายละเอียด
 * โชว์ปุ่ม "ย้ายไปขั้นตอนเลย" ให้กดยืนยันได้ทันที
 */
export interface WorkflowMoveCheck {
  orderId: number;
  fromStageId: number;
  toStageId: number;
  toStageLabel: string;
  allowed: boolean;
  rules: WorkflowRuleCheck[];
}

/*
 * response ของ 400 ตอนถูก Workflow Rule บล็อกการย้ายขั้นตอน
 * (backend ส่ง message ตัวเดิมคู่กับ errorCode + unmetRules)
 */
export interface WorkflowRuleBlockedError {
  errorCode?: string;
  message?: string;
  unmetRules?: WorkflowRuleCheck[];
}

/*
 * การย้ายขั้นตอนที่ถูกบล็อก — หน้าบอร์ดเก็บไว้แล้วส่งเข้า dialog
 * ให้แสดงแถบ mark "ต้องแนบไฟล์อะไร"
 * แล้วระบบจะย้ายขั้นตอนให้อัตโนมัติเมื่อผ่านครบ
 */
export interface PendingStageMove {
  orderId: number;
  toStageKey: string;
  toStageLabel: string;
  rules: WorkflowRuleCheck[];
}

/*
 * แถวจาก GET /api/document-types (ตาราง document_type)
 * ใช้เป็นตัวเลือก dropdown "ประเภทเอกสาร" ใน Workflow Rule
 * และหน้า /document-types (จัดการเพิ่ม/แก้/ลบ)
 *
 * *UsageCount = จำนวนที่ชี้มายังแถว ฝั่ง backend ส่งมาด้วย
 * แต่หน้า /document-types ไม่ได้แสดงแล้ว — เก็บไว้ให้ interface
 * ตรงกับ response จริง (ตัวนับยังถูกใช้ตอนบล็อกการลบฝั่ง server)
 */
export interface DocumentTypeItem {
  id: number;
  documentType: string;
  ruleUsageCount?: number;
  attachmentUsageCount?: number;
}

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

export type DocType =
  | "quotation"
  | "invoice"
  | "receipt"
  | "purchase_order";

export const DOC_TYPE_LABELS_TH: Record<
  DocType,
  string
> = {
  quotation: "ใบเสนอราคา",
  invoice: "ใบแจ้งหนี้",
  receipt: "ใบเสร็จรับเงิน",
  purchase_order: "ใบสั่งซื้อ",
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
  note: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  creatorName: string | null;
}

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

/* =====================================================
   PRODUCTS (สินค้า)
===================================================== */

/**
 * ตาราง category (หมวดหมู่สินค้า)
 * ชื่อเดิมของ type นี้คือ ProductGroup ซึ่งสับสนกับตาราง product_group
 * จึงเปลี่ยนมาใช้ชื่อ Category ให้ตรงกับตารางจริง
 */
export interface Category {
  id: number;
  name: string;
  description: string | null;
  productGroupId?: number | null;
  productGroup?: ProductGroup | null;
  productCount?: number;
}

/**
 * ตาราง product_group (กลุ่มสินค้า) = master list: ชื่อกลุ่ม + คำอธิบาย
 * ไม่มี FK ไปตารางอื่น — หมวดหมู่ผูกกลุ่มผ่าน category.productGroupId
 */
export interface ProductGroup {
  id: number;
  name: string;
  description: string | null;
}

/**
 * รายการ product_group ที่ backend ส่งกลับพร้อม relation
 */
export interface ProductGroupList {
  data: ProductGroup[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductUnit {
  id: number;
  name: string;
  productCount?: number;
}

export interface Product {
  id: number;
  name: string;
  skuCode: string | null;
  categoryId: number;
  description: string | null;
  price: number;
  productUnitId: number;
  category?: Category | null;
  productUnit?: ProductUnit | null;
}

export interface ProductStats {
  totalProducts: number;
  totalValue: number;
  groupCount: number;
  unitCount: number;
}

export interface ProductListItem
  extends Product {
  productGroupName: string;
  productUnitName: string;
}
