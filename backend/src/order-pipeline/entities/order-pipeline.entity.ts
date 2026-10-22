import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('order_pipeline')
export class OrderPipeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'stage_key',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  stageKey: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  label: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '#64748b',
  })
  color: string;

  @Column({
    type: 'int',
    default: 0,
  })
  position: number;

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
