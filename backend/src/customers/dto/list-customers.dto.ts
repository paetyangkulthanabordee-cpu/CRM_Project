import { IsOptional, IsString } from 'class-validator';

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
