import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Customer } from '../../customers/entities/customer.entity.js';
import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../../users/entities/user.entity.js';

/*
 * import แบบ type only เพราะ ESM จะโหลด module ที่วนกลับกันทันที
 * ถ้า import ค่าตรง ๆ issue-order-detail จะเข้าถึง IssueOrder
 * ก่อนที่ class จะประกาศเสร็จ แล้ว backend จะสตาร์ทไม่ขึ้น
 * ฝั่ง OneToMany จึงใช้ชื่อ entity เป็น string แทน arrow
 */
import type { IssueOrderDetail } from './issue-order-detail.entity.js';
import type { IssueOrderAttachment } from './issue-order-attachment.entity.js';

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('issue_order')
export class IssueOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'customer_id',
    type: 'int',
  })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({
    name: 'customer_id',
  })
  customer?: Customer;

  @Column({
    name: 'order_pipeline_id',
    type: 'int',
  })
  orderPipelineId: number;

  @ManyToOne(() => OrderPipeline)
  @JoinColumn({
    name: 'order_pipeline_id',
  })
  orderPipeline?: OrderPipeline;

  /*
   * ผู้รับผิดชอบใบสั่งซื้อ (assignee)
   * nullable: ข้อมูลเดิมที่ยังไม่มีคนรับผิดชอบจะเป็น NULL
   * ลบ user แล้วค่ากลายเป็น NULL (ON DELETE SET NULL)
   */
  @Column({
    name: 'user_id',
    type: 'int',
    nullable: true,
  })
  userId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({
    name: 'user_id',
  })
  user?: User;

  /*
   * รายละเอียดสินค้าในใบสั่งซื้อ
   * ฝั่งกลับ (OneToMany) ใช้ตอน query พร้อม relation
   */
  @OneToMany(
    'IssueOrderDetail',
    'issueOrder',
  )
  details?: IssueOrderDetail[];

  /*
   * ไฟล์แนบ (ใช้ตอนตรวจ Workflow Rule ว่าแนบไฟล์ครบหรือยัง)
   * ฝั่งกลับ (OneToMany) ใช้ตอน query พร้อม relation
   */
  @OneToMany(
    'IssueOrderAttachment',
    'issueOrder',
  )
  attachments?: IssueOrderAttachment[];

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: amountTransformer,
  })
  amount: number;

  /*
   * ส่วนลดและ VAT ระดับใบสั่งซื้อ (เป็นเปอร์เซ็นต์)
   * amount ที่เก็บไว้คือยอดสุทธิหลังหักส่วนแล้วบวก VAT แล้ว (Grand Total)
   */
  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: amountTransformer,
  })
  discountPercent: number;

  @Column({
    name: 'vat_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 7,
    transformer: amountTransformer,
  })
  vatPercent: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

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
