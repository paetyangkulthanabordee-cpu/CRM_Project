-- เพิ่มลำดับเลขเอกสารสำหรับใบสั่งซื้อ (purchase_order)
INSERT INTO document_sequences (doc_type, year, last_no)
VALUES ('purchase_order', 2026, 0)
ON CONFLICT (doc_type, year) DO NOTHING;
