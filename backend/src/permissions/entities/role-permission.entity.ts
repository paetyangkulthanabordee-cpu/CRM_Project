import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  id: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  role: string;

  @Column({
    name: 'permission_key',
    type: 'varchar',
    length: 50,
  })
  permissionKey: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  granted: boolean;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}