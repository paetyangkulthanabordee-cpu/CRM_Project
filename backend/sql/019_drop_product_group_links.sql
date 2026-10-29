-- ตัดการเชื่อมระหว่าง product_group ↔ category/product ออก
-- ตาราง product_group เหลือเป็นตาราง master ธรรมดา: id / name / description
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
--   psql -d <DATABASE_NAME> -f backend/sql/019_drop_product_group_links.sql
-- หมายเหตุ: รันหลัง 018_create_product_group.sql (ต้องมีตารางนี้ก่อน)

-- 1) UNIQUE (category_id, product_id)
ALTER TABLE product_group
  DROP CONSTRAINT IF EXISTS product_group_category_product_key;

-- 2) index ของสองคอลัมน์
DROP INDEX IF EXISTS idx_product_group_category_id;
DROP INDEX IF EXISTS idx_product_group_product_id;

-- 3) คอลัมน์ + FK ที่ค้างอยู่ (DROP COLUMN จะลบ FK ที่ depend ตามไปด้วย)
ALTER TABLE product_group DROP COLUMN IF EXISTS category_id;
ALTER TABLE product_group DROP COLUMN IF EXISTS product_id;
