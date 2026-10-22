-- เพิ่มจำนวนและราคาต่อหน่วยในรายละเอียดใบสั่งซื้อ
-- เดิม issue_order_detail มีแค่ product_id ทำให้คำนวณยอดรวมไม่ได้
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend

ALTER TABLE issue_order_detail
    ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,3) NOT NULL DEFAULT 1;

ALTER TABLE issue_order_detail
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN issue_order_detail.quantity IS 'จำนวนที่สั่งซื้อ';
COMMENT ON COLUMN issue_order_detail.unit_price IS 'ราคาต่อหน่วย ณ เวลาสั่งซื้อ';
