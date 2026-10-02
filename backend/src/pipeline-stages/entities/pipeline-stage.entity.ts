import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pipeline_stages')
export class PipelineStage {
  @PrimaryGeneratedColumn({
    name: 'stage_id',
  })
  stageId: number;

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