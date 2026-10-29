-- เพิ่มคอลัมน์ FK ให้ใบสั่งซื้อและไฟล์แนบ
--   1) issue_order.user_id                    = ผู้รับผิดชอบใบสั่งซื้อ (assignee)
--   2) issue_order_attachment.document_type_id = ประเภทเอกสารของไฟล์แนบ (FK -> document_type)
--
-- ทั้งคู่ nullable: ข้อมูลเดิม (4 orders / 1 attachment) จะเป็น NULL โดยไม่ต้องเดาค่า
-- ทั้งคู่ ON DELETE SET NULL: ลบ user/document_type แล้วค่าจะกลายเป็น NULL ไม่ใช่ error
--   (ตรงสไตล์ uploaded_by เดิมของตาราง issue_order_attachment)
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend (รันซ้ำได้เพราะใช้ IF NOT EXISTS)

-- ============================================================
-- 1) issue_order.user_id (ผู้รับผิดชอบใบสั่งซื้อ)
-- ============================================================
ALTER TABLE issue_order
    ADD COLUMN IF NOT EXISTS user_id INT
    REFERENCES users(user_id) ON DELETE SET NULL;

-- ใช้ตอน filter/นับตามผู้รับผิดชอบ
CREATE INDEX IF NOT EXISTS idx_issue_order_user
    ON issue_order (user_id);

-- ============================================================
-- 2) issue_order_attachment.document_type_id (ประเภทเอกสารไฟล์แนบ)
-- ============================================================
ALTER TABLE issue_order_attachment
    ADD COLUMN IF NOT EXISTS document_type_id INT
    REFERENCES document_type(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_issue_order_attachment_document_type
    ON issue_order_attachment (document_type_id);
