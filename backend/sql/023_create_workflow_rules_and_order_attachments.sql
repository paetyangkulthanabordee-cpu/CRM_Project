-- เพิ่ม Workflow Rules (กฎควบคุมการย้ายการ์ดบนบอร์ด Order Pipeline)
-- และตารางไฟล์แนบของใบสั่งซื้อ (ใช้ตรวจเงื่อนไข "ต้องแนบไฟล์")
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- ทุก statement เป็น IF NOT EXISTS / ON CONFLICT จึงรันซ้ำได้โดยไม่พัง

-- ============================================================
-- workflow_rules
-- condition_type:
--   attachment = ต้องแนบไฟล์ (อย่างน้อย condition_config.minFiles ไฟล์)
--   field      = ต้องกรอกข้อมูลฟิลด์ที่กำหนด (condition_config.field)
--   document   = ต้องมีเอกสารประเภทที่กำหนด (condition_config.docType)
--   payment    = ต้องมีข้อมูลการชำระเงิน (มีเอกสารใบเสร็จของลูกค้ารายนั้น)
-- is_required = TRUE  -> ไม่ผ่านแล้วบล็อกการย้าย
-- is_required = FALSE -> แสดงเป็นข้อมูลเท่านั้น ไม่บล็อก
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    from_stage_id INT NOT NULL REFERENCES order_pipeline(id) ON DELETE CASCADE,
    to_stage_id INT NOT NULL REFERENCES order_pipeline(id) ON DELETE CASCADE,
    condition_type VARCHAR(30) NOT NULL
        CHECK (condition_type IN ('attachment', 'field', 'document', 'payment')),
    condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ย้ายไปขั้นตอนเดิมไม่มีความหมาย จึงห้าม from = to
    CONSTRAINT workflow_rules_distinct_stages CHECK (from_stage_id <> to_stage_id)
);

-- ตอนลากการ์ดจะ query ด้วยคู่ (from, to) + is_active จึงทำ index ร่วม
CREATE INDEX IF NOT EXISTS idx_workflow_rules_pair
    ON workflow_rules (from_stage_id, to_stage_id)
    WHERE is_active = TRUE;

-- ============================================================
-- issue_order_attachment (ไฟล์แนบของใบสั่งซื้อ)
-- เก็บไฟล์จริงลงดิสก์ (uploads/attachments) ตารางนี้เก็บเฉพาะ metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS issue_order_attachment (
    id SERIAL PRIMARY KEY,
    issue_order_id INT NOT NULL REFERENCES issue_order(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INT NOT NULL,
    uploaded_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_order_attachment_order
    ON issue_order_attachment (issue_order_id);
