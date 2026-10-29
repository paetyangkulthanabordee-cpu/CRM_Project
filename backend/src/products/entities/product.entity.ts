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
   * หมวดหมู่สินค้า (ตาราง category)
   * เดิมชื่อ property ว่า productGroupId ทั้งที่ชี้ category_id (legacy naming)
   * จึงเปลี่ยนมาตั้งชื่อให้ตรงคอลัมน์จริง — ผลข้างเคียง: ชื่อ field ใน JSON เปลี่ยนด้วย
   */
  @Column({
    name: 'category_id',
    type: 'int',
  })
  categoryId: number;

  @ManyToOne(() => Category)
  @JoinColumn({
    name: 'category_id',
  })
  category?: Category;

  /*
   * กลุ่มสินค้าไม่ได้ผูกกับสินค้าโดยตรงอีกต่อไป
   * คอลัมน์ product_group_id ถูกย้ายไปที่ category (migration 021)
   * สืบค้นกลุ่มผ่าน category.productGroup แทน
   */

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

  @ManyToOne(() => ProductUnit)
  @JoinColumn({
    name: 'product_unit_id',
  })
  productUnit?: ProductUnit;
}
