/*
 * 027: Time-based Workflow Rules (Aging Rules)
 *
 * 1) issue_order.last_activity_at
 *    เวลาของกิจกรรมล่าสุดบนการ์ด (ย้ายขั้นตอน / แก้ไข / อัปโหลดไฟล์)
 *    ใช้เป็นจุดเริ่มต้นนับเวลาให้กฎอายุ (เปลี่ยนสีการ์ดเมื่อไม่มี activity)
 *
 *    ⚠ ห้ามใส่ DEFAULT now() เด็ดขาด:
 *      Postgres 11+ จะ "เติมค่า default ให้ทุกแถวเดิม" ทันทีตอน ADD COLUMN
 *      ทำให้ WHERE last_activity_at IS NULL ของคำสั่ง backfill ไม่มีแถวเข้าเงื่อนไข
 *      ทุกการ์ดจะได้อายุ 0 วันเท่ากันหมด (สีไม่แยกตาม card)
 *      ปล่อยให้เป็น NULL แล้วค่อย backfill ด้วย updated_at ด้านล่าง
 *
 * 2) ตาราง aging_rules
 *    เก็บ Threshold ที่ Admin กำหนดเอง (แยกจาก workflow_rules เพราะ
 *    ไม่มี from/to stage) + สลิตช์เปิด/ปิด rule ต่อใบ
 */

ALTER TABLE issue_order
  ADD COLUMN last_activity_at timestamptz NULL;

UPDATE issue_order
SET last_activity_at = COALESCE(updated_at, created_at)
WHERE last_activity_at IS NULL;

/*
 * ตั้ง DEFAULT ให้ "เฉพาะแถวที่ INSERT ใหม่" เท่านั้น
 * (ทำหลัง backfill เพื่อไม่ให้ไปทับค่าของแถวเดิม)
 */
ALTER TABLE issue_order
  ALTER COLUMN last_activity_at SET DEFAULT now();

CREATE TABLE aging_rules (
  id                  SERIAL PRIMARY KEY,
  rule_name           varchar(150)   NOT NULL,
  warning_after_days  int            NOT NULL DEFAULT 3,
  critical_after_days int            NOT NULL DEFAULT 7,
  is_active           boolean        NOT NULL DEFAULT true,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT aging_rules_days_check
    CHECK (warning_after_days >= 1 AND critical_after_days > warning_after_days)
);

COMMENT ON TABLE aging_rules IS
  'Time-based (aging) workflow rules: กำหนดวันที่เปลี่ยนสีการ์ด Kanban เมื่อไม่มี activity';

COMMENT ON COLUMN aging_rules.warning_after_days IS
  'จำนวนวันที่เริ่มแสดงสีเหลือง (Warning)';

COMMENT ON COLUMN aging_rules.critical_after_days IS
  'จำนวนวันที่เปลี่ยนเป็นสีแดง (Overdue/Critical) ต้องมากกว่า warning_after_days';

INSERT INTO aging_rules (rule_name, warning_after_days, critical_after_days, is_active)
VALUES ('การงดดูแลการ์ด: Warning 3 วัน / Critical 7 วัน', 3, 7, true);
