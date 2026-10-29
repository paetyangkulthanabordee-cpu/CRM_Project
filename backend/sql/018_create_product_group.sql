-- สร้างตาราง product_group (กลุ่มสินค้า ระดับ link category ↔ product)
-- 1 แถว = ผูกสินค้า 1 ชิ้นกับหมวด (category) 1 อัน พร้อมชื่อ/รายละเอียดของกลุ่ม
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
--   psql -d <DATABASE_NAME> -f backend/sql/018_create_product_group.sql

CREATE TABLE IF NOT EXISTS product_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    -- กันสินค้าซ้ำในกลุ่ม + หมวดเดียวกัน (สินค้าเดียวกันแยกคนละหมวดได้)
    CONSTRAINT product_group_category_product_key UNIQUE (category_id, product_id)
);

-- index สำหรับค้นหา/filter ตามหมวดและสินค้า
CREATE INDEX IF NOT EXISTS idx_product_group_category_id ON product_group (category_id);
CREATE INDEX IF NOT EXISTS idx_product_group_product_id ON product_group (product_id);
