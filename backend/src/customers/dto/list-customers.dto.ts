import {
  IsBoolean,
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

  /*
   * true = รวมลูกค้าที่ปิดใช้งานด้วย
   * ไม่ส่งมาหรือ false = แสดงเฉพาะลูกค้าที่ใช้งานอยู่
   */
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
