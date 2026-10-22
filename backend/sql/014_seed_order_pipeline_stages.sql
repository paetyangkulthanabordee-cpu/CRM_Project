-- ข้อมูลเริ่มต้นของ order_pipeline (ขั้นตอนของใบสั่งซื้อ)
-- ตาราง order_pipeline ถูกสร้างไว้ใน 011_create_order_pipeline_and_issue_order.sql
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- ON CONFLICT ทำให้รันซ้ำได้โดยไม่พัง

INSERT INTO order_pipeline (stage_key, label, color, position) VALUES
('lead', 'Lead', '#64748b', 1),
('qualified', 'Qualified', '#0f62fe', 2),
('send_quotation', 'Send Quotation', '#eab308', 3),
('payment', 'Payment', '#16a34a', 4),
('contract', 'Contract', '#7c3aed', 5)
ON CONFLICT (stage_key) DO NOTHING;
