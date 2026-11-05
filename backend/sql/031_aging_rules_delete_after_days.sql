/*
 * 031: Aging Rules เพิ่ม "จำนวนวันของ auto-delete" (delete_after_days)
 *
 * เดิม: การลบอัตโนมัติหยิบ "Critical after" มาใช้ร่วมกับการเปลี่ยนสี
 * ใหม่: action 'auto_delete' มีช่อง "กำหนดวันเอง" แยกต่างหาก
 *       ไม่ผูกกับ Warning/Critical ที่ใช้แค่ตอน action = 'none'
 *
 *   delete_after_days NULL     = ไม่ใช้ rule ใบนี้ลบ (action อื่น)
 *   delete_after_days >= 1     = จำนวนวันที่ไม่มีกิจกรรมแล้วลบใบสั่งซื้อ
 *
 * CHECK กัน 2 แบบ:
 *   - ค่าต้อง >= 1 เมื่อมีค่า
 *   - action เป็น auto_delete ต้องมีค่า (บังคับกรอกตอนสร้าง/แก้ไข)
 *
 * แถวเดิมทั้งหมดเป็น action='none' -> ไม่ต้อง backfill
 *
 * ⚠ ต้องรันทุก environment (TypeORM synchronize: false)
 */
ALTER TABLE aging_rules
  ADD COLUMN delete_after_days int NULL;

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_delete_after_days_check
  CHECK (delete_after_days IS NULL OR delete_after_days >= 1);

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_autodelete_days_check
  CHECK (
    action_type <> 'auto_delete' OR delete_after_days IS NOT NULL
  );

COMMENT ON COLUMN aging_rules.delete_after_days IS
  'จำนวนวันที่ไม่มีกิจกรรมแล้วลบใบสั่งซื้อ (ใช้เฉพาะ action_type=auto_delete), NULL = ไม่ได้ใช้ rule นี้ลบ';
