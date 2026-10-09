import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

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

  /*
   * true = แสดงเฉพาะลูกค้าที่ปิดใช้งาน
   * ไม่ส่งมาหรือ false = แสดงเฉพาะลูกค้าที่ใช้งานอยู่
   */
  @IsOptional()
  @IsBoolean()
  onlyInactive?: boolean;
}
