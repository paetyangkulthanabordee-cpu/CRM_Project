import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
  })
  dateFrom?: string;

  /*
   * true = แสดงเฉพาะลูกค้าที่ปิดใช้งาน
   * ไม่ส่งมาหรือ false = แสดงเฉพาะลูกค้าที่ใช้งานอยู่
   */
  @IsOptional()
  @IsBoolean()
  onlyInactive?: boolean;
}
