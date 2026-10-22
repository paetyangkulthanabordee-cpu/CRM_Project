-- ลบคอลัมน์ status ออกจากตาราง documents
-- เหตุผล: ยกเลิกแนวคิดสถานะเอกสาร (draft/approved/pending/paid/cancelled/void)
--        ทุกเอกสารถูกนับรวมในยอดรวมและไม่มีการ mark invoice ว่า "จ่ายแล้ว"
-- รันครั้งเดียวบน PostgreSQL หลัง deploy โค้ดใหม่ (โค้ดเก่าจะ query doc.status และ error)
-- (ไฟล์นี้ปลอดภัยกับฐานข้อมูลที่ไม่มีคอลัมน์ status อยู่แล้ว)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'status'
  ) THEN
    ALTER TABLE documents DROP COLUMN status;
  END IF;
END $$;

-- index idx_documents_type_status ถูกลบอัตโนมัติโดย PostgreSQL
-- แต่ถ้ามี index ที่ประกอบด้วย status เพียงตัวเดียว ให้ลบทิ้งเพื่อความสะอาด
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_documents_status'
  ) THEN
    DROP INDEX idx_documents_status;
  END IF;
END $$;
