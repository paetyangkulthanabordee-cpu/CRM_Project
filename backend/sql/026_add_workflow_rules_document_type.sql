-- เพิ่มคอลัมน์ FK ประเภทเอกสารให้ workflow_rules
--   workflow_rules.document_type_id = ประเภทเอกสารที่เงื่อนไข "document" ต้องมี
--       (FK -> document_type.id, nullable)
--
-- เหตุผล: เดิมเก็บเป็น string ใน condition_config.docType และตรวจกับตาราง documents
--   แต่ตาราง documents ถูก DROP ไปแล้ว (migration 024) จึงย้ายมาใช้คอลัมน์ FK
--   และตรวจกับไฟล์แนบใบสั่งซื้อ (issue_order_attachment.document_type_id) แทน
--
-- nullable: ใช้ได้เฉพาะ rule ที่ condition_type = 'document' เท่านั้น
--   rule ประเภทอื่น (attachment/field/payment) ค่าจะเป็น NULL
-- ON DELETE SET NULL: ลบแถว document_type แล้ว rule จะกลายเป็นไม่ระบุประเภท
--
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend (รันซ้ำได้ IF NOT EXISTS)

-- ============================================================
-- 1) คอลัมน์ document_type_id
-- ============================================================
ALTER TABLE workflow_rules
    ADD COLUMN IF NOT EXISTS document_type_id INT
    REFERENCES document_type(id) ON DELETE SET NULL;

-- ใช้ตอนโหลด rule ตามประเภทเอกสาร
CREATE INDEX IF NOT EXISTS idx_workflow_rules_document_type
    ON workflow_rules (document_type_id);

-- ============================================================
-- 2) Backfill: rule เดิมที่มี docType เป็น string ใน config
--    ย้ายเข้าคอลัมน์ FK (ตอนนี้ยังไม่มี rule ประเภท document ใน DB
--    จึงไม่มีแถวถูก update — เขียนเผื่อกรณีมีข้อมูลจาก environment อื่น)
-- ============================================================
UPDATE workflow_rules wr
SET document_type_id = dt.id
FROM document_type dt
WHERE wr.condition_type = 'document'
  AND wr.condition_config->>'docType' = dt.document_type
  AND wr.document_type_id IS NULL;
