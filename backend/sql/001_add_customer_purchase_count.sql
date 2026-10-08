-- เพิ่มจำนวนการซื้อ (นับใบเสร็จรับเงินที่สำเร็จ) ให้ลูกค้า
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- ค่าในคอลัมน์นี้ถูกคำนวณใหม่โดย DocumentsService ทุกครั้งที่เอกสารเปลี่ยน

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS purchase_count integer NOT NULL DEFAULT 0;

-- คำนวณย้อนหลังข้อมูลเดิม
UPDATE customers c
SET purchase_count = (
  SELECT COUNT(*)::int
  FROM documents d
  WHERE d.customer_id = c.customer_id
    AND d.doc_type = 'receipt'
    AND d.status = 'completed'
);
