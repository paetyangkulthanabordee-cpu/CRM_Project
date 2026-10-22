-- เพิ่มเวลาสร้าง/แก้ไขในใบสั่งซื้อ
-- บอร์ด Order Pipeline ต้องเรียงลำดับตามวันที่สร้างได้ และใช้กรองช่วงเวลาได้
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend

ALTER TABLE issue_order
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE issue_order
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
