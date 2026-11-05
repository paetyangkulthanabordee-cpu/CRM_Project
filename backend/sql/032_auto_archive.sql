/*
 * 032: เปลี่ยน "Auto Delete" -> "Auto Archive" (Soft Archive / ซ่อนการ์ด)
 *
 * พฤติกรรมใหม่: เมื่อการ์ดไม่มีกิจกรรมครบจำนวนวันที่กำหนดในคอลัมน์
 *   -> ระบบ "ซ่อนการ์ด" ออกจาก Order Pipeline (is_archived = true)
 *   -> บอร์ดยิง API ด้วย archived=false จึง "ไม่ดึงใบนั้นมาแสดงเลย"
 *      (server-side filter ไม่ใช่ fetch แล้วกรองฝั่ง UI)
 *   -> ⚠ ไม่ลบข้อมูลใด ๆ ออกจาก database:
 *      แถว issue_order / issue_order_detail / issue_order_attachment
 *      และไฟล์บนดิสก์ อยู่ครบเหมือนเดิม เข้าถึงได้จากหน้าอื่น
 *      (เช่น ตารางคำสั่งซื้อในหน้ารายละเอียดลูกค้า ที่ไม่ได้ส่ง archived)
 *
 * (ก) flag ฝั่งใบสั่งซื้อ
 *     is_archived = false -> แสดงบน Order Pipeline
 *     is_archived = true  -> ถูกซ่อน (archive) — ข้อมูลยังอยู่ครบ
 *
 * (ข) เปลี่ยนชื่อค่า action: auto_delete -> auto_archive
 *     (CHECK เดิมชื่อ autodelete ต้องลบแล้วสร้างใหม่)
 *
 * (ค) เปลี่ยนชื่อคอลัมน์วัน: delete_after_days -> archive_after_days
 *
 * แถว aging_rules ปัจจุบันเป็น action='none' ทั้งหมด -> UPDATE ไม่กระทับอะไร
 * (ทำเผื่อ environment อื่นที่เคยสร้าง auto_delete ไว้)
 *
 * ปลดการซ่อน: UPDATE issue_order SET is_archived = false WHERE id = ...
 *              (หรือ PATCH /api/issue-orders/:id {"isArchived": false})
 *
 * ⚠ ต้องรันทุก environment (TypeORM synchronize: false)
 */

/* ---- (ก) flag ฝั่งใบสั่งซื้อ ---- */
ALTER TABLE issue_order
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN issue_order.is_archived IS
  'true = ถูก Archive โดย Aging Rule (ถูกซ่อนจาก Order Pipeline) — ไม่มีการลบข้อมูล เข้าถึงได้จากหน้าอื่นตามเดิม';

CREATE INDEX idx_issue_order_is_archived
  ON issue_order (is_archived);

/* ---- (ข) auto_delete -> auto_archive ---- */
ALTER TABLE aging_rules
  DROP CONSTRAINT aging_rules_action_type_check;

ALTER TABLE aging_rules
  DROP CONSTRAINT aging_rules_autodelete_days_check;

UPDATE aging_rules
SET action_type = 'auto_archive'
WHERE action_type = 'auto_delete';

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_action_type_check
  CHECK (action_type IN ('none', 'auto_archive', 'edit_lock'));

ALTER TABLE aging_rules
  ADD CONSTRAINT aging_rules_archive_days_check
  CHECK (
    action_type <> 'auto_archive' OR delete_after_days IS NOT NULL
  );

/* ---- (ค) ชื่อคอลัมน์วัน ---- */
ALTER TABLE aging_rules
  RENAME COLUMN delete_after_days TO archive_after_days;

COMMENT ON COLUMN aging_rules.archive_after_days IS
  'จำนวนวันที่ไม่มีกิจกรรมแล้วซ่อนการ์ดออกจากบอร์ด (ใช้เฉพาะ action_type=auto_archive), NULL = ไม่ได้ใช้ rule นี้';
