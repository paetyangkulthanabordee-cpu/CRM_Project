import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { DocType } from '../document-types.js';

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('documents')
export class DocumentRecord {
  @PrimaryGeneratedColumn({ name: 'doc_id' })
  docId: number;

  @Column({ name: 'doc_type', length: 20 })
  docType: DocType;

  @Column({ name: 'doc_no', length: 30 })
  docNo: string;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'ref_doc_id', type: 'int', nullable: true })
  refDocId: number | null;

  @Column({
    name: 'ref_doc_no',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  refDocNo: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: amountTransformer,
  })
  amount: number;

  @Column({ length: 20 })
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

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
