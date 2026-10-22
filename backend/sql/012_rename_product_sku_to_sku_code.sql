-- เปลี่ยนชื่อคอลัมน์ sku → sku_code ในตาราง product
-- เหตุผล: entity Product รองรับคอลัมน์ sku_code อยู่แล้ว แต่ฐานข้อมูลยังเป็น sku
--        (migration 008 ทำไว้แต่ยังไม่ได้รันในฐานข้อมูลจริง)
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- (ไฟล์นี้ปลอดภัยกับฐานข้อมูลที่รัน 008 ไปแล้ว)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'sku'
  ) THEN
    ALTER TABLE product RENAME COLUMN sku TO sku_code;
  END IF;
END $$;

-- เปลี่ยนชื่อ unique index ให้ตรงกับคอลัมน์ (PostgreSQL ไม่ rename index อัตโนมัติ)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ux_product_sku'
  ) THEN
    ALTER INDEX ux_product_sku RENAME TO ux_product_sku_code;
  END IF;
END $$;
