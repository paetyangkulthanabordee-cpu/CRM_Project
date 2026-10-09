import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { DOC_TYPES } from '../document-types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListDocumentsDto {
  @IsOptional()
  @IsIn(DOC_TYPES)
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
  })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
  })
  to?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
