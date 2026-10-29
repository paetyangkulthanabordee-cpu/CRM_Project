import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { IssueOrder } from './issue-order.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';
import { User } from '../../users/entities/user.entity.js';

/*
 * metadata ของไฟล์แนบใบสั่งซื้อ
 * ไฟล์จริงเก็บลงดิสก์ (uploads/attachments) ไม่ได้เก็บในฐานข้อมูล
 *
 * import แบบ value ได้เพราะฝั่ง issue-order entity
 * อ้าง entity นี้ด้วย string จึงไม่เกิดการวนกลับกันของ ESM
 */
@Entity('issue_order_attachment')
export class IssueOrderAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'issue_order_id',
    type: 'int',
  })
  issueOrderId: number;

  @ManyToOne(
    () => IssueOrder,
    (order) => order.attachments,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'issue_order_id' })
  issueOrder?: IssueOrder;

  /*
   * ชื่อไฟล์ตามที่ผู้ใช้อัปโหลดมา (อาจมีภาษาไทย/อักขระพิเศษ)
   */
  @Column({
    name: 'original_name',
    type: 'varchar',
    length: 255,
  })
  originalName: string;

  /*
   * ชื่อไฟล์บนดิสก์ = uuid + extension
   * ไม่ใช้ชื่อเดิมเพราะมีโอกาสชนกันและมี path traversal
   */
  @Column({
    name: 'stored_name',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  storedName: string;

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 100,
  })
  mimeType: string;

  @Column({
    name: 'size_bytes',
    type: 'int',
  })
  sizeBytes: number;

  /*
   * ใครเป็นคนอัปโหลดไฟล์แนบนี้
   * nullable: ข้อมูลเดิม/ user ถูกลบ -> NULL (ON DELETE SET NULL)
   */
  @Column({
    name: 'uploaded_by',
    type: 'int',
    nullable: true,
  })
  uploadedBy: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User;

  /*
   * ประเภทเอกสารของไฟล์แนบ (FK -> document_type.id)
   * nullable: ไฟล์เดิมที่ยังไม่ระบุประเภทจะเป็น NULL
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

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
