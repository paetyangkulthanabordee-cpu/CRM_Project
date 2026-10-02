import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

import { ALL_DOCUMENT_STATUSES } from '../document-types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateDocumentDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
  })
  issueDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
  })
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsIn(ALL_DOCUMENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
