-- สร้าง table สำหรับ users
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'SALES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง table สำหรับ pipeline_stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    stage_id SERIAL PRIMARY KEY,
    stage_key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#64748b',
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง table สำหรับ customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new',
    is_active BOOLEAN DEFAULT TRUE,
    assigned_id INT REFERENCES users(user_id),
    purchase_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง table สำหรับ documents
CREATE TABLE IF NOT EXISTS documents (
    doc_id SERIAL PRIMARY KEY,
    doc_type VARCHAR(50) NOT NULL,
    doc_no VARCHAR(100) NOT NULL,
    customer_id INT REFERENCES customers(customer_id),
    issue_date DATE,
    due_date DATE,
    ref_doc_id INT,
    ref_doc_no VARCHAR(100),
    amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    note TEXT,
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง table สำหรับ role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT FALSE,
    UNIQUE(role, permission_key)
);

-- เพิ่มข้อมูลเริ่มต้น: pipeline stages
INSERT INTO pipeline_stages (stage_key, label, color, position) VALUES
('lead', 'Lead', '#64748b', 1),
('qualified', 'Qualified', '#0f62fe', 2),
('send_quotation', 'Send Quotation', '#eab308', 3),
('payment', 'Payment', '#16a34a', 4),
('contract', 'Contract', '#7c3aed', 5)
ON CONFLICT (stage_key) DO NOTHING;

-- เพิ่มข้อมูลเริ่มต้น: users (password: admin123, sales123)
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'ADMIN'),
('Sales One', 'sales1@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'SALES'),
('Sales Two', 'sales2@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'SALES')
ON CONFLICT (email) DO NOTHING;

-- เพิ่มข้อมูลเริ่มต้น: customers
INSERT INTO customers (company_name, email, phone, status, assigned_id) VALUES
('บริษัท เทคโนโลยี จำกัด', 'contact@tech.co.th', '02-123-4567', 'lead', 2),
('บริษัท ดิจิทัล โซลูชั่น', 'info@digital.co.th', '02-234-5678', 'qualified', 2),
('บริษัท สมาร์ท ซิสเต็ม', 'hello@smart.co.th', '02-345-6789', 'send_quotation', 3),
('บริษัท คราวด์ เซิร์ฟเวอร์', 'support@cloud.co.th', '02-456-7890', 'payment', 3),
('บริษัท อินเตอร์เน็ต จำกัด', 'admin@internet.co.th', '02-567-8901', 'contract', 2),
('บริษัท ซอฟต์แวร์ ดีไซน์', 'design@software.co.th', '02-678-9012', 'lead', 3),
('บริษัท เน็ตเวิร์ก โซลูชั่น', 'net@network.co.th', '02-789-0123', 'qualified', 2),
('บริษัท เดต้า เซ็นเตอร์', 'data@datacenter.co.th', '02-890-1234', 'send_quotation', 3),
('บริษัท คลาวด์ เทค', 'cloud@cloudtech.co.th', '02-901-2345', 'payment', 2),
('บริษัท ไซเบอร์ ซิคเคิร์ตี้', 'security@cyber.co.th', '02-012-3456', 'contract', 3),
('บริษัท มือถือ แอพ', 'mobile@mobile.co.th', '02-111-2222', 'lead', 2),
('บริษัท อีคอมเมิร์ซ', 'shop@ecommerce.co.th', '02-333-4444', 'qualified', 3);

-- เพิ่มข้อมูลเริ่มต้น: role permissions
INSERT INTO role_permissions (role, permission_key, granted) VALUES
('ADMIN', 'dashboard', TRUE),
('ADMIN', 'customers', TRUE),
('ADMIN', 'salesPipeline', TRUE),
('ADMIN', 'documents', TRUE),
('ADMIN', 'reports', TRUE),
('ADMIN', 'administration', TRUE),
('ADMIN', 'permissions', TRUE),
('ADMIN', 'auditLogs', TRUE),
('MANAGER', 'dashboard', TRUE),
('MANAGER', 'customers', TRUE),
('MANAGER', 'salesPipeline', TRUE),
('MANAGER', 'documents', TRUE),
('MANAGER', 'reports', TRUE),
('SALES', 'dashboard', TRUE),
('SALES', 'customers', TRUE),
('SALES', 'salesPipeline', TRUE),
('SALES', 'documents', TRUE)
ON CONFLICT (role, permission_key) DO NOTHING;
