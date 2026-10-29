import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';

import type {
  WorkflowConditionType,
} from '../condition-types.js';

@Entity('workflow_rules')
export class WorkflowRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rule_name',
    type: 'varchar',
    length: 150,
  })
  ruleName: string;

  @Column({
    name: 'from_stage_id',
    type: 'int',
  })
  fromStageId: number;

  @ManyToOne(
    () => OrderPipeline,
    { nullable: true },
  )
  @JoinColumn({ name: 'from_stage_id' })
  fromStage?: OrderPipeline;

  @Column({
    name: 'to_stage_id',
    type: 'int',
  })
  toStageId: number;

  @ManyToOne(
    () => OrderPipeline,
    { nullable: true },
  )
  @JoinColumn({ name: 'to_stage_id' })
  toStage?: OrderPipeline;

  @Column({
    name: 'condition_type',
    type: 'varchar',
    length: 30,
  })
  conditionType: WorkflowConditionType;

  /*
   * ค่า config ต่างกันตาม condition_type
   * เช่น { minFiles: 1 } / { field: 'note' } / { docType: 'purchase_order' }
   */
  @Column({
    name: 'condition_config',
    type: 'jsonb',
    default: {},
  })
  conditionConfig: Record<string, unknown>;

  /*
   * ประเภทเอกสารที่เงื่อนไข "document" ต้องมี (FK -> document_type.id)
   * nullable: rule ประเภทอื่น (attachment/field/payment) เป็น NULL
   * แหล่งความจริงของประเภทเอกสาร — config.docType (string) เก็บไว้เป็น fallback
   * ลบ document_type แล้วค่ากลายเป็น NULL (ON DELETE SET NULL)
   */
  @Column({
    name: 'document_type_id',
    type: 'int',
    nullable: true,
  })
  documentTypeId: number | null;

  @ManyToOne(() => DocumentType)
  @JoinColumn({ name: 'document_type_id' })
  documentType?: DocumentType;

  /*
   * true  = ไม่ผ่านแล้วบล็อกการย้ายการ์ด
   * false = เก็บไว้เป็นข้อมูล ไม่บล็อก
   */
  @Column({
    name: 'is_required',
    type: 'boolean',
    default: true,
  })
  isRequired: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

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
