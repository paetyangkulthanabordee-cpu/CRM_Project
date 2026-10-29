-- เพิ่ม permission key 'orderPipeline' สำหรับบอร์ดใบสั่งซื้อ (Order Pipeline)
-- ตาราง role_permissions มีแค่ 'salesPipeline' (บอร์ด Contact Pipeline)
-- ทำให้ MANAGER/SALES ถูก PermissionsGuard ตีกลับ 403 ทุกครั้งที่เรียก
--   GET/POST /api/issue-orders และ PATCH /api/issue-orders/:id/stage
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- ON CONFLICT ทำให้รันซ้ำได้โดยไม่พัง
-- ค่าเริ่มต้นของทุก role ในโค้ดคือ orderPipeline = true จึงคัดลอกจาก salesPipeline

INSERT INTO role_permissions (role, permission_key, granted)
SELECT role, 'orderPipeline', granted
FROM role_permissions
WHERE permission_key = 'salesPipeline'
ON CONFLICT (role, permission_key) DO NOTHING;
