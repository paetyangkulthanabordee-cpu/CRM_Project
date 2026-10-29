import { IsOptional, IsString } from 'class-validator';

/*
 * พารามิเตอร์สำหรับรายการหมวดหมู่/หน่วยสินค้า
 * ค้นจากชื่อเป็นหลัก
 */
export class ListCatalogDto {
  @IsOptional()
  @IsString()
  search?: string;
}
