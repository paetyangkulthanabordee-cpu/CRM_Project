import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ProductGroup } from './product-group.entity.js';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 255,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  /*
   * กลุ่มสินค้า (ตาราง product_group)
   * ย้ายมาจาก product.product_group_id ใน migration 021
   * nullable เพราะหมวดที่ไม่มีสินค้าค้างอยู่อาจยังไม่มีกลุ่ม
   */
  @Column({
    name: 'product_group_id',
    type: 'int',
    nullable: true,
  })
  productGroupId: number | null;

  @ManyToOne(() => ProductGroup)
  @JoinColumn({
    name: 'product_group_id',
  })
  productGroup?: ProductGroup | null;
}
