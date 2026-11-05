import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/*
 * Time-based Workflow Rule (Aging Rule)
 *
 * กฎอายุของ Card บนบอร์ด Kanban — ไม่มี from/to stage จึงแยกตาราง
 * ออกจาก workflow_rules และเก็บ Threshold เป็นค่าที่ Admin กำหนดเอง:
 *
 *   จำนวนวันที่ผ่านไปตั้งแต่ updated_at ของใบสั่งซื้อ/ลูกค้า
 *     < warning_after_days  -> Normal (สีปกติ)
 *     >= warning_after_days -> Warning (สีเหลือง / border เหลือง)
 *     >= critical_after_days-> Critical (สีแดง / border แดง)
 *
 * rule ถูกจำกัด scope ด้วย board_type + stage_key (ดูคอลัมน์ด้านล่าง)
 * การเปิด/ปิดทำผ่าน is_active โดยไม่ต้องลบ rule
 */
@Entity('aging_rules')
export class AgingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rule_name',
    type: 'varchar',
    length: 150,
  })
  ruleName: string;

  /*
   * จำนวนวันที่เริ่มแสดงสีเหลือง (Warning)
   * ตั้งแต่ 1 วันขึ้นไป (constraint ใน DB: critical > warning >= 1)
   */
  @Column({
    name: 'warning_after_days',
    type: 'int',
    default: 3,
  })
  warningAfterDays: number;

  /*
   * จำนวนวันที่เปลี่ยนเป็นสีแดง (Overdue/Critical)
   * ต้องมากกว่า warning_after_days เสมอ
   */
  @Column({
    name: 'critical_after_days',
    type: 'int',
    default: 7,
  })
  criticalAfterDays: number;

  /*
   * true  = rule นี้ถูกนำไปคิดสีการ์ด
   * false = ปิดไว้ชั่วคราว ไม่ต้องลบ
   */
  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  /*
   * บอร์ดที่ rule นี้มีผล (บอกว่า stage_key ด้านล่างชี้ไปที่ตารางไหน)
   *   order_pipeline -> บอร์ดใบสั่งซื้อ (ตาราง order_pipeline)
   *   customers      -> บอร์ดลูกค้า (ตาราง pipeline_stages)
   */
  @Column({
    name: 'board_type',
    type: 'varchar',
    length: 20,
    default: 'order_pipeline',
  })
  boardType: 'order_pipeline' | 'customers';

  /*
   * คอลัมน์บนบอร์ดดังกล่าวที่ rule นี้มีผล (เก็บ stage_key ซึ่ง unique ทั้งสองตาราง)
   * NULL = มีผลกับ "ทุกคอลัมน์" ของบอร์ดนั้น (พฤติกรรมเดิมก่อนเพิ่ม scope)
   *
   * ไม่ทำ FK เพราะเป็น polymorphic อ้าง 2 ตารางต่าง entity
   * -> ถ้าคอลัมน์ถูกลบ rule จะไม่ match ใบไหนเลย
   *    (หน้า Administration ขึ้นป้าย "ไม่พบคอลัมน์" ให้เห็น)
   */
  @Column({
    name: 'stage_key',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  stageKey: string | null;

  /*
   * การกระทำของ rule (เลือกได้อย่างเดียวต่อ 1 ใบ)
   *   none        = ไม่มี (เปลี่ยนสีการ์ดตามวัน — "Color mark")
   *   auto_archive= ครบกำหนดแล้ว "ซ่อนการ์ด" ออกจากบอร์ด
   *                 (is_archived = true — ไม่ลบข้อมูลออกจาก DB)
   *                 scheduler ฝั่ง backend ทุก 10 นาที
   *                 ⚠ ใช้ได้เฉพาะ boardType = 'order_pipeline' (validate ใน service)
   *   edit_lock    = ห้ามแก้ไขข้อมูลเมื่อการ์ดอยู่ในคอลัมน์นี้
   *                 แต่ยัง "ย้ายคอลัมน์ออกได้เสมอ"
   */
  @Column({
    name: 'action_type',
    type: 'varchar',
    length: 20,
    default: 'none',
  })
  actionType: 'none' | 'auto_archive' | 'edit_lock';

  /*
   * จำนวนวัน "ของ auto_archive" ที่ Admin กำหนดเอง
   * (แยกจาก Warning/Critical ที่ใช้ตอน action = 'none')
   *
   * NULL       = ไม่ได้ใช้ rule ใบนี้ซ่อนการ์ด (action อื่น)
   * >= 1 วัน   = ไม่มีกิจกรรมครบกำหนดนี้ -> scheduler ซ่อนการ์ดออกจากบอร์ด
   * CHECK ใน DB บังคับว่า action='auto_archive' ต้องมีค่า
   */
  @Column({
    name: 'archive_after_days',
    type: 'int',
    nullable: true,
  })
  archiveAfterDays: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
