-- สร้างตาราง order_pipeline (ขั้นตอนของใบสั่งซื้อ)
-- หมายเหตุ: เป็นตารางใหม่แยกจาก pipeline_stages (ตารางเดิมที่ฝั่ง Kanban ใช้อยู่)
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
CREATE TABLE IF NOT EXISTS order_pipeline (
    id SERIAL PRIMARY KEY,
    stage_key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#64748b',
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- สร้างตาราง issue_order (ใบสั่งซื้อ)
CREATE TABLE IF NOT EXISTS issue_order (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_pipeline_id INT NOT NULL REFERENCES order_pipeline(id),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    note TEXT
);

-- สร้างตาราง issue_order_detail (รายละเอียดสินค้าในใบสั่งซื้อ)
CREATE TABLE IF NOT EXISTS issue_order_detail (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(id),
    issue_order_id INT NOT NULL REFERENCES issue_order(id) ON DELETE CASCADE
);

-- index สำหรับการ join/filter ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_issue_order_customer
    ON issue_order (customer_id);

CREATE INDEX IF NOT EXISTS idx_issue_order_order_pipeline
    ON issue_order (order_pipeline_id);

CREATE INDEX IF NOT EXISTS idx_issue_order_detail_issue_order
    ON issue_order_detail (issue_order_id);

CREATE INDEX IF NOT EXISTS idx_issue_order_detail_product
    ON issue_order_detail (product_id);

-- ข้อมูลเริ่มต้นของ order_pipeline (ตารางจะว่างจนกว่าจะเพิ่ม stage เอง)
-- เปิดใช้งานโดยลบ -- นำหน้าบรรทัดถัดไป
-- INSERT INTO order_pipeline (stage_key, label, color, position) VALUES
-- ('lead', 'Lead', '#64748b', 1),
-- ('qualified', 'Qualified', '#0f62fe', 2),
-- ('send_quotation', 'Send Quotation', '#eab308', 3),
-- ('payment', 'Payment', '#16a34a', 4),
-- ('contract', 'Contract', '#7c3aed', 5)
-- ON CONFLICT (stage_key) DO NOTHING;
