import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Category } from './category.entity.js';
import { ProductUnit } from './product-unit.entity.js';

const priceTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 255,
  })
  name: string;

  @Column({
    name: 'sku_code',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  skuCode: string | null;

  /*
   * ชื่อ property คงเดิม (productGroupId / productGroup) เพื่อไม่ให้ API contract
   * ที่ frontend ใช้อยู่เปลี่ยน ส่วนคอลัมน์ในฐานข้อมูลถูก rename เป็น category_id
   */
  @Column({
    name: 'category_id',
    type: 'int',
  })
  productGroupId: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: priceTransformer,
  })
  price: number;

  @Column({
    name: 'product_unit_id',
    type: 'int',
  })
  productUnitId: number;

  @ManyToOne(() => Category)
  @JoinColumn({
    name: 'category_id',
  })
  productGroup?: Category;

  @ManyToOne(() => ProductUnit)
  @JoinColumn({
    name: 'product_unit_id',
  })
  productUnit?: ProductUnit;
}
