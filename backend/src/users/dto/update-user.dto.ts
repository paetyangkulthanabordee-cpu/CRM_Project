import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRole } from '../entities/user.entity.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /*
   * เว้นว่างไว้ = ไม่เปลี่ยนรหัสผ่าน
   */
  @IsOptional()
  @IsString()
  @MinLength(6, {
    message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
