/*
 * 030: Aging Rules เพิ่ม "การกระทำ" (action_type)
 *
 *   none        = ไม่มีการกระทำ (พฤติกรรมเดิม — แค่เปลี่ยนสีการ์ด)
 *   auto_delete = ลบใบสั่งซื้อจริงเมื่อไม่มีกิจกรรมครบ critical_after_days
 *                 (ทำงานโดย scheduler ฝั่ง backend ทุก 10 นาที)
 *                 ⚠ ใช้ได้เฉพาะ board_type = 'order_pipeline' เท่านั้น
 *                 (ฝั่ง backend validate ซ้ำตอนสร้าง/แก้ไข rule)
 *   edit_lock    = เมื่อการ์ดอยู่ในคอลัมน์นี้ จะแก้ไขข้อมูลไม่ได้
 *                 แต่ "ย้ายคอลัมน์ออกได้เสมอ" (ไม่บล็อกการลาก)
 *
 * เลือกได้อย่างเดียวต่อ 1 rule (CHECK กันค่าแปลก ๆ)
 * แถวเดิมทั้งหมดได้ 'none' -> พฤติกรรมเดิมไม่เปลี่ยน
 *
 * ⚠ ต้องรันทุก environment (TypeORM synchronize: false)
 */
ALTER TABLE aging_rules
  ADD COLUMN action_type varchar(20) NOT NULL DEFAULT 'none';

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_action_type_check
  CHECK (action_type IN ('none', 'auto_delete', 'edit_lock'));

COMMENT ON COLUMN aging_rules.action_type IS
  'การกระทำของrule: none = แค่เปลี่ยนสี, auto_delete = ลบใบสั่งซื้อเมื่อครบกำหนด (เฉพาะ order_pipeline), edit_lock = ล็อกไม่ให้แก้ไขเมื่ออยู่ในคอลัมน์นี้';
