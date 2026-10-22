-- เปลี่ยนชื่อ product_type / product_group → category
-- เหตุผล: ปรับชื่อตารางกลุ่มสินค้าให้ตรงกับโมเดล Category ในระบบ
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- (ไฟล์นี้ปลอดภัยกับทั้งกรณีที่ยังใช้ชื่อ product_type และกรณีที่รัน 008 ไปแล้วเป็น product_group)

-- 1) เปลี่ยนชื่อตาราง
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_group'
  ) THEN
    ALTER TABLE product_group RENAME TO category;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'product_type'
  ) THEN
    ALTER TABLE product_type RENAME TO category;
  END IF;
END $$;

-- 2) เปลี่ยนชื่อคอลัมน์ FK ในตาราง product
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'product_group_id'
  ) THEN
    ALTER TABLE product RENAME COLUMN product_group_id TO category_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'product_type_id'
  ) THEN
    ALTER TABLE product RENAME COLUMN product_type_id TO category_id;
  END IF;
END $$;

-- 3) เปลี่ยนชื่อ constraint ของ FK
-- (PostgreSQL ไม่ rename constraint อัตโนมัติเมื่อ rename ตาราง/คอลัมน์)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_product_group_id_fkey'
  ) THEN
    ALTER TABLE product RENAME CONSTRAINT product_product_group_id_fkey TO product_category_id_fkey;
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_product_type_id_fkey'
  ) THEN
    ALTER TABLE product RENAME CONSTRAINT product_product_type_id_fkey TO product_category_id_fkey;
  END IF;
END $$;

-- 4) เปลี่ยนชื่อ primary key ของตาราง category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_group_pkey'
  ) THEN
    ALTER TABLE category RENAME CONSTRAINT product_group_pkey TO category_pkey;
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_type_pkey'
  ) THEN
    ALTER TABLE category RENAME CONSTRAINT product_type_pkey TO category_pkey;
  END IF;
END $$;

-- 5) เปลี่ยนชื่อ sequence ให้ตรงกับตาราง category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'product_group_id_seq'
  ) THEN
    ALTER SEQUENCE product_group_id_seq RENAME TO category_id_seq;
  ELSIF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'product_type_id_seq'
  ) THEN
    ALTER SEQUENCE product_type_id_seq RENAME TO category_id_seq;
  END IF;
END $$;
