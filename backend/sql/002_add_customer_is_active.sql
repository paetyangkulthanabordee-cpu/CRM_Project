-- เพิ่มคอลัมน์ is_active สำหรับปิดใช้งานลูกค้า (soft delete)
-- ลูกค้าที่ปิดใช้งานจะถูกซ่อนจากหน้าหลัก แต่ยังอยู่ในระบบ
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
