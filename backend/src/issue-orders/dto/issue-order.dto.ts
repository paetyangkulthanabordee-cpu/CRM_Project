import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  /*
   * ส่วนลดและ VAT เป็นเปอร์เซ็นต์ (0-100)
   * ไม่ส่งมาก็ได้: discount ใช้ 0 และ VAT ใช้ 7
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  /*
   * ผู้รับผิดชอบใบสั่งซื้อ (assignee) ไม่ส่งก็ได้ -> NULL
   */
  @IsOptional()
  @IsInt()
  userId?: number;

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
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  /*
   * ผู้รับผิดชอบใบสั่งซื้อ (assignee)
   */
  @IsOptional()
  @IsInt()
  userId?: number;

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
