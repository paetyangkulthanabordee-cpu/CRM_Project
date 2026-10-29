import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

/*
 * เพิ่มประเภทเอกสารใหม่ (ตาราง document_type)
 * คอลัมน์ document_type = VARCHAR(50) UNIQUE
 */
export class CreateDocumentTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentType: string;
}
