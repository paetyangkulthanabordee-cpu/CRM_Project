import {
  ArrayNotEmpty,
  IsArray,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const KEY_PATTERN =
  /^[a-z][a-z0-9_]*$/;

export class CreateOrderPipelineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(KEY_PATTERN, {
    message:
      'stage key ต้องเป็นตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
  })
  stageKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateOrderPipelineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(KEY_PATTERN, {
    message:
      'stage key ต้องเป็นตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
  })
  stageKey?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class ReorderOrderPipelineDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  stageIds: number[];
}
