import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/*
 * แก้ไขประเภทเอกสาร (ทุก field ไม่บังคับ)
 */
export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentType?: string;
}
