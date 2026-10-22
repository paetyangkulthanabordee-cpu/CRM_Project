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

import { IssueOrderDetail } from './issue-order-detail.entity.js';

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
   * รายละเอียดสินค้าในใบสั่งซื้อ
   * ฝั่งกลับ (OneToMany) ใช้ตอน query พร้อม relation
   */
  @OneToMany(
    () => IssueOrderDetail,
    (detail) => detail.issueOrder,
  )
  details?: IssueOrderDetail[];

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: amountTransformer,
  })
  amount: number;

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
