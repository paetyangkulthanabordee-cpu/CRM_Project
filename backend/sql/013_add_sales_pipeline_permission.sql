-- เพิ่ม permission key 'salesPipeline' สำหรับบอร์ดลูกค้า (Sales Pipeline)
-- เดิม key 'orderPipeline' ถูกใช้กับบอร์ดลูกค้ามาตลอด
-- หลังแยกโมดูลแล้ว:
--   - salesPipeline  = บอร์ดลูกค้า (ใช้ตาราง pipeline_stages)
--   - orderPipeline  = บอร์ดใบสั่งซื้อ (ใช้ตาราง order_pipeline)
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- คัดลอกสิทธิ์เดิมของ orderPipeline ให้ทุก role ที่มีอยู่

INSERT INTO role_permissions (role, permission_key, granted)
SELECT role, 'salesPipeline', TRUE
FROM role_permissions
WHERE permission_key = 'orderPipeline'
ON CONFLICT (role, permission_key) DO NOTHING;
