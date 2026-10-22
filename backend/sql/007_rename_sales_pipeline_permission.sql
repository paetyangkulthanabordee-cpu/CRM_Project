-- เปลี่ยนชื่อ permission key จาก 'salesPipeline' เป็น 'orderPipeline'
-- เพราะโมดูลเปลี่ยนชื่อจาก Sales Pipeline เป็น Order Pipeline
-- รันครั้งเดียวบน PostgreSQL ก่อน restart backend
-- ถ้าไม่รันผู้ใช้ทุก role จะเสียสิทธิ์ของโมดูลนี้

UPDATE role_permissions
SET permission_key = 'orderPipeline'
WHERE permission_key = 'salesPipeline';
