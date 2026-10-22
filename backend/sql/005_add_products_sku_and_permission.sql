-- เพิ่มคอลัมน์ sku_code ให้ตาราง product (รหัสสินค้า)
ALTER TABLE product ADD COLUMN IF NOT EXISTS sku_code VARCHAR(100);

-- สร้าง unique index เฉพาะค่าที่ไม่ null (ยังไม่บังคับให้กรอก sku_code)
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_sku_code
    ON product (sku_code)
    WHERE sku_code IS NOT NULL AND sku_code <> '';

-- เพิ่ม permission 'products' และ 'productManagement' ให้ทุก role
INSERT INTO role_permissions (role, permission_key, granted) VALUES
('ADMIN', 'products', TRUE),
('ADMIN', 'productManagement', TRUE),
('MANAGER', 'products', TRUE),
('MANAGER', 'productManagement', TRUE),
('SALES', 'products', TRUE),
('SALES', 'productManagement', FALSE)
ON CONFLICT (role, permission_key) DO NOTHING;

-- เพิ่มข้อมูลเริ่มต้น: product_group (กลุ่มสินค้า)
INSERT INTO product_group (name, description)
SELECT v.name, v.description
FROM (VALUES
    ('สินค้าหลัก', 'สินค้าหลักที่ขายให้ลูกค้า'),
    ('บริการ', 'งานบริการและงานติดตั้ง'),
    ('อุปกรณ์เสริม', 'อุปกรณ์เสริมและวัสดุใช้งาน')
) AS v(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM product_group pg WHERE pg.name = v.name
);

-- เพิ่มข้อมูลเริ่มต้น: product_unit (หน่วยสินค้า)
INSERT INTO product_unit (name)
SELECT v.name
FROM (VALUES
    ('ชิ้น'),
    ('กล่อง'),
    ('ชุด'),
    ('ครั้ง'),
    ('เดือน')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1 FROM product_unit pu WHERE pu.name = v.name
);
