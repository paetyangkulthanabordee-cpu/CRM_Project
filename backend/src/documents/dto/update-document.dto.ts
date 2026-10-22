import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

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
  @IsString()
  note?: string;
}
