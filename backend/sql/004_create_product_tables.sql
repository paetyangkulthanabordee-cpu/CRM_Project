-- สร้างตาราง product_group (กลุ่มสินค้า)
CREATE TABLE IF NOT EXISTS product_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- สร้างตาราง product_unit (หน่วยสินค้า)
CREATE TABLE IF NOT EXISTS product_unit (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- สร้างตาราง product (สินค้า)
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_group_id INT NOT NULL REFERENCES product_group(id),
    description TEXT,
    price DECIMAL(15,2) DEFAULT 0,
    product_unit_id INT NOT NULL REFERENCES product_unit(id)
);
