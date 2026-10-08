import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRole } from '../entities/user.entity.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, {
    message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
