import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class IssueOrderDetailDto {
  @IsInt()
  productId: number;

  /*
   * จำนวนที่สั่งซื้อ ถ้าไม่ระบุจะใช้ 1
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  /*
   * ราคาต่อหน่วย ถ้าไม่ระบุจะใช้ราคาปัจจุบันของสินค้า
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateIssueOrderDto {
  @IsInt()
  customerId: number;

  @IsInt()
  orderPipelineId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => IssueOrderDetailDto)
  details: IssueOrderDetailDto[];
}

export class UpdateIssueOrderDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsInt()
  orderPipelineId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueOrderDetailDto)
  details?: IssueOrderDetailDto[];
}

export class MoveIssueOrderStageDto {
  @IsInt()
  orderPipelineId: number;
}
