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
 *   จำนวนวันที่ผ่านไปตั้งแต่ last_activity_at
 *     < warning_after_days  -> Normal (สีปกติ)
 *     >= warning_after_days -> Warning (สีเหลือง / border เหลือง)
 *     >= critical_after_days-> Critical (สีแดง / border แดง)
 *
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
