import { IsOptional, IsString } from 'class-validator';

export class ListUsersDto {
  /*
   * ค้นจากชื่อ อีเมล หรือสิทธิ์ (ADMIN/MANAGER/SALES)
   */
  @IsOptional()
  @IsString()
  search?: string;
}
