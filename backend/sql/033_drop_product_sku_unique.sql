/*
 * 033: เลิกบังคับ SKU Code ให้ไม่ซ้ำ — อนุญาตให้สินค้าหลายตัวมี SKU Code เดียวกันได้
 *
 * เหตุผล: ทางธุรกิจต้องการกรอก SKU Code เดิมซ้ำได้ (เช่น สินค้ารุ่นเดียวกัน
 *   ขายต่างสาขา/ต่างหน่วย) หน้า Add/Edit Product จึงไม่แสดงคำเตือน "ต้องไม่ซ้ำ"
 *   และ backend ไม่ตรวจซ้ำแล้ว
 *
 * สิ่งที่ลบ:
 * - unique index ux_product_sku_code (สร้างจาก migration 005)
 * - unique index ux_product_sku (ชื่อเก่าก่อน rename ใน migration 008/012)
 * - unique constraint ใด ๆ ที่ผูกกับคอลัมน์ product.sku_code
 *   (เผื่อ environment ที่ TypeORM เคย sync สร้าง constraint ชื่ออื่น)
 *
 * ข้อมูลเดิม: ซ้ำกันไม่ได้อยู่แล้ว (index บังคับอยู่) จึงไม่ต้อง clean อะไร
 *   รันแล้วปลอดภัย ลบอย่างเดียว ไม่แตะแถวข้อมูล
 *
 * รันครั้งเดียวบน PostgreSQL ก่อน restart backend (TypeORM synchronize: false):
 *   psql -d <DATABASE_NAME> -f backend/sql/033_drop_product_sku_unique.sql
 */

DROP INDEX IF EXISTS ux_product_sku_code;
DROP INDEX IF EXISTS ux_product_sku;

-- ลบ unique constraint อื่นที่ผูกกับ sku_code โดยเฉพาะ (ไม่แตะ constraint ของคอลัมน์อื่น)
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'product'::regclass
      AND c.contype = 'u'
      AND a.attname = 'sku_code'
  LOOP
    EXECUTE format(
      'ALTER TABLE product DROP CONSTRAINT %I',
      con.conname
    );
  END LOOP;
END $$;
