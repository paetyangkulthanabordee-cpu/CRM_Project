/*
 * 028: เลิกใช้ issue_order.last_activity_at — Aging Rules นับจาก updated_at แทน
 *
 * เหตุผล:
 * - updated_at เป็นคอลัมน์ @UpdateDateColumn ที่ TypeORM อัปเดตให้เองทุกครั้ง
 *   ที่เรียก save()/update() จึงทำหน้าที่ "จุดเริ่มต้นนับอายุการ์ด" ได้ครบ
 *   ทั้งตอน สร้างใบสั่งซื้อ / ย้ายขั้นตอน / แก้ไขข้อมูล / อัปโหลดไฟล์
 *   โดยไม่ต้อง maintain คอลัมน์เวลาแยกต่างหากให้ตรงกันอีก
 * - ฝั่ง frontend จึงใช้ updatedAt (fallback createdAt) ในการคำนวณ Aging
 *
 * หมายเหตุ: 027 ยังคงไว้เป็นประวัติการ migration (ไม่แก้ไขไฟล์เดิม)
 *
 * ⚠ ข้อมูลใน last_activity_at จะหายถาวร — ย้อนกลับไม่ได้
 *   ถ้าต้องการสำรองก่อนรัน ให้ SELECT id, last_activity_at FROM issue_order;
 */
ALTER TABLE issue_order
  DROP COLUMN last_activity_at;
