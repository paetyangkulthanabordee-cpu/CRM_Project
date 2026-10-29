-- เพิ่มส่วนลด (%) และ VAT (%) ระดับใบสั่งซื้อ
-- เดิมเก็บแค่ amount ทำให้แสดง breakdown (ก่อนหักส่วนลด / หลังหักส่วนลด / VAT) ไม่ได้
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend

ALTER TABLE issue_order
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE issue_order
    ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5,2) NOT NULL DEFAULT 7;

-- ปรับ amount ของใบสั่งซื้อเดิมให้เป็นยอดสุทธิ (หักส่วนลด 0% แล้วบวก VAT 7%)
-- ตามนิยามใหม่ amount = Grand Total
-- ถ้าไม่อยากให้ปรับยอดเดิม ให้ลบบล็อกนี้ทิ้งก่อนรัน
UPDATE issue_order o
SET amount = ROUND(COALESCE(d.subtotal, 0) * 1.07, 2)
FROM (
    SELECT issue_order_id,
           SUM(quantity * unit_price) AS subtotal
    FROM issue_order_detail
    GROUP BY issue_order_id
) d
WHERE d.issue_order_id = o.id;

COMMENT ON COLUMN issue_order.amount IS 'ยอดสุทธิของใบสั่งซื้อ (หลังหักส่วนลดและบวก VAT แล้ว)';
