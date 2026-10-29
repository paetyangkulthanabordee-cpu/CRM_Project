import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/*
 * ตาราง product_group: กลุ่มสินค้า (master list)
 * เก็บแค่ชื่อกลุ่ม/คำอธิบาย ไม่มี FK ไปตารางอื่น
 * (หมวดหมู่ผูกกลุ่มผ่านคอลัมน์ category.product_group_id)
 *
 * หมายเหตุ: ตาราง category เป็นคนละตาราง — หน้า /categories จัดการตารางนั้น
 */
@Entity('product_group')
export class ProductGroup {
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
}
