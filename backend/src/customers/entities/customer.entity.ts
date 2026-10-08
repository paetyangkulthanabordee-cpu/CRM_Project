import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn({
    name: 'customer_id',
  })
  customerId: number;

  @Column({
    name: 'company_name',
    length: 255,
    nullable: true,
  })
  companyName: string;

  @Column({
    length: 255,
    nullable: true,
  })
  email: string;

  @Column({
    length: 50,
    nullable: true,
  })
  phone: string;

  @Column({
    length: 50,
    default: 'new',
  })
  status: string;

  /*
   * ปิดใช้งาน = soft delete
   * ลูกค้าที่ปิดใช้งานจะถูกซ่อนจากหน้าหลัก
   * แต่ข้อมูลยังอยู่ในระบบและเปิดใช้งานอีกครั้งได้
   */
  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    name: 'assigned_id',
    type: 'int',
    nullable: true,
  })
  assignedId: number | null;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({
    name: 'assigned_id',
  })
  assignedUser?: User | null;

  @Column({
    name: 'purchase_count',
    type: 'int',
    default: 0,
  })
  purchaseCount: number;

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
