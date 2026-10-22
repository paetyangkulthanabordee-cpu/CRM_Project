import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity.js';
import { IssueOrder } from './issue-order.entity.js';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('issue_order_detail')
export class IssueOrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'product_id',
    type: 'int',
  })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({
    name: 'product_id',
  })
  product?: Product;

  @Column({
    name: 'issue_order_id',
    type: 'int',
  })
  issueOrderId: number;

  /*
   * จำนวนที่สั่งซื้อ (รองรับทศนิยม เช่น 2.5 กก.)
   */
  @Column({
    type: 'numeric',
    precision: 15,
    scale: 3,
    default: 1,
    transformer: numericTransformer,
  })
  quantity: number;

  /*
   * ราคาต่อหน่วย ณ เวลาสั่งซื้อ
   * เก็บ snapshot ไว้ เพื่อไม่ให้ราคาสินค้าเปลี่ยนแล้วย้อนแก้ใบสั่งซื้อเก่า
   */
  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  unitPrice: number;

  @ManyToOne(() => IssueOrder, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'issue_order_id',
  })
  issueOrder?: IssueOrder;
}
