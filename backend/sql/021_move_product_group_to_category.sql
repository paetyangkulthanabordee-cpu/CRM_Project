-- ย้าย product_group_id จากตาราง product ไปอยู่ที่ตาราง category
-- ความสัมพันธ์ใหม่: product → category → product_group
--   * สินค้าไม่มี product_group_id โดยตรงอีกต่อไป
--   * หมวดหมู่ (category) ผูกกับกลุ่มสินค้า (product_group) ผ่านคอลัมน์ product_group_id
-- รันครั้งเดียวบน PostgreSQL หลัง 020 และก่อน restart backend
--   psql -d <DATABASE_NAME> -f backend/sql/021_move_product_group_to_category.sql

-- 1) เพิ่มคอลัมน์ product_group_id ให้ตาราง category
ALTER TABLE category
  ADD COLUMN IF NOT EXISTS product_group_id INT;

-- 2) ย้ายข้อมูล: เติม category.product_group_id จากสินค้าที่อยู่ในหมวดนั้น
--    (สินค้า 1 รายการมีกลุ่มเดียว จึงใช้ค่าจากสินค้าแรกของหมวดได้)
UPDATE category c
SET product_group_id = sub.product_group_id
FROM (
  SELECT DISTINCT ON (category_id) category_id, product_group_id
  FROM product
  WHERE product_group_id IS NOT NULL
  ORDER BY category_id, id
) sub
WHERE c.id = sub.category_id
  AND c.product_group_id IS NULL;

-- 3) FK ชี้ product_group
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'category_product_group_id_fkey'
  ) THEN
    ALTER TABLE category
      ADD CONSTRAINT category_product_group_id_fkey
      FOREIGN KEY (product_group_id)
      REFERENCES product_group(id);
  END IF;
END $$;

-- 4) index สำหรับ filter/join ตามกลุ่มสินค้า
CREATE INDEX IF NOT EXISTS idx_category_product_group_id
  ON category (product_group_id);

-- 5) บังคับ NOT NULL (ถ้าหมวดไหนยัง NULL ให้ข้ามไป ตั้งค่าเองภายหลังได้)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM category WHERE product_group_id IS NULL) THEN
    ALTER TABLE category
      ALTER COLUMN product_group_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'มี category ที่ product_group_id ยังเป็น NULL — ยังไม่บังคับ NOT NULL';
  END IF;
END $$;

-- 6) ลบ product_group_id ออกจากตาราง product (FK/index ถูกลบตามคอลัมน์อัตโนมัติ)
DROP INDEX IF EXISTS idx_product_product_group_id;
ALTER TABLE product DROP CONSTRAINT IF EXISTS product_product_group_id_fkey;
ALTER TABLE product DROP COLUMN IF EXISTS product_group_id;
