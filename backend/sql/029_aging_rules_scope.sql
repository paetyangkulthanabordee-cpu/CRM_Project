/*
 * 029: Aging Rules แบบเลือกบอร์ด + เลือกคอลัมน์
 *
 * เดิม: aging_rules มีผลกับ "ทุกใบบนบอร์ดใบสั่งซื้อ" เท่านั้น
 * ใหม่: แต่ละ rule ระบุได้ว่ามีผลกับบอร์ดไหน (board_type)
 *       และเจาะจงคอลัมน์ใดบนบอร์ดนั้น (stage_key)
 *
 *   board_type = 'order_pipeline' -> stage_key อ้างตาราง order_pipeline
 *   board_type = 'customers'      -> stage_key อ้างตาราง pipeline_stages
 *   stage_key  = NULL             -> มีผลกับ "ทุกคอลัมน์" ของบอร์ดนั้น
 *
 * ใช้ stage_key (ไม่ใช่ id) เพราะ unique ทั้งสองตาราง
 * และหน้า frontend มีค่านี้อยู่แล้ว (order.orderPipeline.stageKey / customer.status)
 * ไม่ทำ FK เพราะเป็น polymorphic อ้าง 2 ตารางต่าง entity
 *
 * แถวเดิมทั้งหมดได้ board_type='order_pipeline', stage_key=NULL
 * -> พฤติกรรมเดิม (rule เดิมมีผลทุกใบใบสั่งซื้อ) ไม่เปลี่ยน
 *
 * ⚠ ต้องรันทุก environment (TypeORM synchronize: false)
 */
ALTER TABLE aging_rules
  ADD COLUMN board_type varchar(20) NOT NULL DEFAULT 'order_pipeline',
  ADD COLUMN stage_key   varchar(50) NULL;

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_board_type_check
  CHECK (board_type IN ('order_pipeline', 'customers'));

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_stage_key_len_check
  CHECK (stage_key IS NULL OR char_length(stage_key) <= 50);

COMMENT ON COLUMN aging_rules.board_type IS
  'บอร์ดที่ruleมีผล: order_pipeline = ใบสั่งซื้อ, customers = ลูกค้า';

COMMENT ON COLUMN aging_rules.stage_key IS
  'คอลัมน์บนบอร์ดboard_typeที่มีผล (stage_key ของ order_pipeline/pipeline_stages), NULL = ทุกคอลัมน์';
