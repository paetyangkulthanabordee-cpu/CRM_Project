/*
 * ค่าที่ workflow_rules.condition_type รับได้
 * - attachment : ต้องแนบไฟล์ (อย่างน้อย minFiles ไฟล์)
 * - field      : ต้องกรอกข้อมูลฟิลด์ที่กำหนดบนใบสั่งซื้อ
 * - document   : ต้องมีเอกสารประเภทที่กำหนดอยู่แล้วในระบบ
 * - payment    : ต้องมีข้อมูลการชำระเงิน (เอกสารใบเสร็จของลูกค้ารายนั้น)
 */
export const WORKFLOW_CONDITION_TYPES = [
  'attachment',
  'field',
  'document',
  'payment',
] as const;

export type WorkflowConditionType =
  (typeof WORKFLOW_CONDITION_TYPES)[number];

/*
 * ฟิลด์ที่เงื่อนไข type "field" สั่งให้กรอกได้
 * คิดจากคอลัมน์จริงของตาราง issue_order
 */
export const WORKFLOW_FIELD_KEYS = [
  'note',
  'details',
  'amount',
] as const;

export type WorkflowFieldKey =
  (typeof WORKFLOW_FIELD_KEYS)[number];
