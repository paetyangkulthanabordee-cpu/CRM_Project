-- ลบลูกค้าที่ไม่ได้ผูกผู้รับผิดชอบ (assigned_id IS NULL = Unassigned) ออกทั้งหมด
-- รันครั้งเดียวบน PostgreSQL
--
-- หมายเหตุ:
--   - FK documents.customer_id เป็น ON DELETE SET NULL
--     ดังนั้นถ้ามีเอกสารผูกอยู่ เอกสารจะไม่ถูกลบ แต่ customer_id จะถูกตั้งเป็น NULL
--   - ลบแบบถาวร (hard delete) ไม่ใช่ soft delete (is_active)

BEGIN;

-- 1) ตรวจสอบรายการที่จะถูกลบก่อน
SELECT customer_id, company_name, email, status, created_at
FROM customers
WHERE assigned_id IS NULL
ORDER BY customer_id;

-- 2) ลบลูกค้า Unassigned ออกทั้งหมด
DELETE FROM customers
WHERE assigned_id IS NULL
RETURNING customer_id, company_name, email;

-- 3) ตรวจสอบหลังลบ
SELECT COUNT(*) FILTER (WHERE assigned_id IS NULL) AS remaining_unassigned,
       COUNT(*) AS total_customers
FROM customers;

COMMIT;
