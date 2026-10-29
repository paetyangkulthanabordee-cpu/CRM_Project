-- ปรับโครงสร้างตารางฝ่ายเอกสาร
--   1) DROP ตาราง documents (ข้อมูลเอกสารทั้งหมด)
--   2) DROP ตาราง document_sequences (เลขลำดับเอกสาร)
--   3) CREATE ตาราง document_type (lookup ประเภทเอกสาร)
--   4) Seed ประเภทเอกสารเดิม 4 รายการ
--
-- ⚠️ คำเตือน: รันครั้งเดียว และต้อง BACKUP ก่อนรัน
--   pg_dump -Fc -f backup_before_024.dump "$DATABASE_URL"
--   เพราะ DROP TABLE documents จะลบข้อมูลเอกสารถาวร
--
-- ⚠️ ผลกระทบหลังรัน (โค้ดที่อ้างตาราง documents จะพัง):
--   - backend: DocumentsModule ทั้งโมดูล (/api/documents)
--   - backend: customers.service.ts (recalcPurchaseCount)
--   - backend: users.service.ts (references ตรวจ user ก่อนลบ)
--   - backend: workflow-rules.service.ts (condition 'document' / 'payment')
--   - frontend: หน้า customers + CustomerDetailDialog (สรุป QT/IV/RC)
--   ให้ deploy โค้ดใหม่ที่เลิกใช้ตารางเหล่านี้คู่กับ migration นี้

-- ============================================================
-- 1) DROP ตารางเอกสารเดิม
-- ============================================================
-- ไม่มีตารางอื่นที่ทำ FK ชี้มายัง documents
-- (ref_doc_id เป็น self-reference แบบไม่มี constraint) จึง DROP ตรง ๆ ได้
DROP TABLE IF EXISTS documents;

-- ============================================================
-- 2) DROP ตารางเลขลำดับเอกสาร
-- ============================================================
DROP TABLE IF EXISTS document_sequences;

-- ============================================================
-- 3) CREATE ตาราง document_type (lookup ประเภทเอกสาร)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_type (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- 4) Seed ประเภทเอกสารเดิม 4 รายการ
-- ============================================================
INSERT INTO document_type (document_type) VALUES
('quotation'),
('invoice'),
('receipt'),
('purchase_order')
ON CONFLICT (document_type) DO NOTHING;
