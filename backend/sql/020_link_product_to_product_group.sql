-- เพิ่มคอลัมน์ product_group_id ให้ตาราง product (เชื่อมสินค้ากับกลุ่มสินค้า)
-- หมายเหตุสำคัญ:
--   * ค่า category_id เดิมชี้ตาราง category ซึ่งไม่มีการ map ไป product_group
--     → รีเซ็ตข้อมูลสินค้าเดิมทิ้งทั้งหมด แล้วเพิ่มสินค้าใหม่เอง
--   * issue_order_detail มี FK ชี้ product จึงต้องล้างก่อน
--     (ถ้ามีแถว issue_order ค้างอยู่ จะเหลือหัวรายการโดยไม่มีบรรทัด)
-- รันครั้งเดียวบน PostgreSQL หลัง 019 และก่อน restart backend
--   psql -d <DATABASE_NAME> -f backend/sql/020_link_product_to_product_group.sql

-- 1) ล้างข้อมูลที่ชี้ product (FK ก่อน) และตัวสินค้าเอง
DELETE FROM issue_order_detail;
DELETE FROM product;

-- 2) เพิ่มคอลัมน์
ALTER TABLE product
  ADD COLUMN IF NOT EXISTS product_group_id INT;

-- 3) บังคับ NOT NULL (ไม่มี row ค้างอยู่แล้ว จึงทำได้)
ALTER TABLE product
  ALTER COLUMN product_group_id SET NOT NULL;

-- 4) FK ชี้ product_group
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_product_group_id_fkey'
  ) THEN
    ALTER TABLE product
      ADD CONSTRAINT product_product_group_id_fkey
      FOREIGN KEY (product_group_id)
      REFERENCES product_group(id);
  END IF;
END $$;

-- 5) index สำหรับ filter/join ตามกลุ่มสินค้า
CREATE INDEX IF NOT EXISTS idx_product_product_group_id
  ON product (product_group_id);
