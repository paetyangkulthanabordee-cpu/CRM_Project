-- เปลี่ยนชื่อ product_type → product_group และ sku → sku_code
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- (ไฟล์นี้ปลอดภัยกับฐานข้อมูลที่ยังไม่เคยสร้างตาราง product)

-- ตาราง product_type → product_group
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_type'
  ) THEN
    ALTER TABLE product_type RENAME TO product_group;
  END IF;
END $$;

-- คอลัมน์ในตาราง product
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'product_type_id'
  ) THEN
    ALTER TABLE product RENAME COLUMN product_type_id TO product_group_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'sku'
  ) THEN
    ALTER TABLE product RENAME COLUMN sku TO sku_code;
  END IF;
END $$;

-- unique index ของ sku
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ux_product_sku'
  ) THEN
    ALTER INDEX ux_product_sku RENAME TO ux_product_sku_code;
  END IF;
END $$;
