import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/*
 * ตาราง lookup ประเภทเอกสาร (สร้างจาก migration 024_drop_documents_and_create_document_type)
 * ปัจจุบันใช้เป็น FK ของไฟล์แนบใบสั่งซื้อ (issue_order_attachment.document_type_id)
 */
@Entity('document_type')
export class DocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'document_type',
    length: 50,
    unique: true,
  })
  documentType: string;
}
