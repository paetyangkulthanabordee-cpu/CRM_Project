import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/*
 * validation แบบข้าม field (critical > warning) ทำใน service
 * เพราะ class-validator เช็คความสัมพันธ์ระหว่าง 2 ค่าไม่ได้
 */

export class CreateAgingRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruleName: string;

  /*
   * จำนวนวันที่เริ่มแสดงสีเหลือง (Warning)
   * ตัวอย่าง 3 = ไม่มี activity 3 วัน -> การ์ดเป็นสีเหลือง
   */
  @IsInt()
  @Min(1, {
    message: 'Warning after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(365, {
    message: 'Warning after ต้องไม่เกิน 365 วัน',
  })
  warningAfterDays: number;

  /*
   * จำนวนวันที่เปลี่ยนเป็นสีแดง (Overdue/Critical)
   * ต้องมากกว่า warningAfterDays (เช็คใน service)
   */
  @IsInt()
  @Min(1, {
    message: 'Critical after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(730, {
    message: 'Critical after ต้องไม่เกิน 730 วัน',
  })
  criticalAfterDays: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAgingRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruleName?: string;

  @IsOptional()
  @IsInt()
  @Min(1, {
    message: 'Warning after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(365, {
    message: 'Warning after ต้องไม่เกิน 365 วัน',
  })
  warningAfterDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1, {
    message: 'Critical after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(730, {
    message: 'Critical after ต้องไม่เกิน 730 วัน',
  })
  criticalAfterDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/*
 * ค่าที่ส่งกลับให้หน้า Administration -> Workflow Rules -> แท็บ Aging
 * และให้บอร์ด Order Pipeline ไปคิดสีของ Card
 */
export interface AgingRuleView {
  ruleId: number;
  ruleName: string;
  warningAfterDays: number;
  criticalAfterDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
