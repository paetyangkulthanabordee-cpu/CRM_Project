import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

import type { DocType } from '../document-types.js';

@Entity('document_sequences')
export class DocumentSequence {
  @PrimaryColumn({ name: 'doc_type', length: 20 })
  docType: DocType;

  @PrimaryColumn({ name: 'year', type: 'int' })
  year: number;

  @Column({
    name: 'last_no',
    type: 'int',
    default: 0,
  })
  lastNo: number;
}
