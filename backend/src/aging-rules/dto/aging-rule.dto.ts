import {
  IsBoolean,
  IsIn,
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

/* บอร์ดที่ Aging Rule มีผล — ใช้ซ้ำทั้ง Create/Update */
export const AGING_BOARDS = ['order_pipeline', 'customers'] as const;
export type AgingBoard = (typeof AGING_BOARDS)[number];

/*
 * การกระทำของ rule (เลือกได้อย่างเดียวต่อ 1 ใบ)
 * none        = "Color mark" — เปลี่ยนสีการ์ดตามวันเท่านั้น
 * auto_archive= ครบกำหนดแล้ว "ซ่อนการ์ด" ออกจากบอร์ด
 *               (is_archived = true, ไม่ลบข้อมูลออกจาก DB)
 *               ใช้ได้เฉพาะ order_pipeline
 * edit_lock    = ล็อกไม่ให้แก้ไขเมื่ออยู่ในคอลัมน์นี้ (ย้ายคอลัมน์ได้)
 */
export const AGING_ACTIONS = [
  'none',
  'auto_archive',
  'edit_lock',
] as const;
export type AgingAction = (typeof AGING_ACTIONS)[number];

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

  /*
   * บอร์ดที่ruleนี้มีผล (default order_pipeline ถ้าไม่ส่งมา)
   */
  @IsOptional()
  @IsIn(AGING_BOARDS, {
    message: 'boardType ต้องเป็น order_pipeline หรือ customers',
  })
  boardType?: AgingBoard;

  /*
   * คอลัมน์บนบอร์ดดังกล่าว (stage_key) — ไม่ส่ง/null = ทุกคอลัมน์
   * service จะตรวจว่ามีอยู่จริงในตารางของ boardType ที่เลือก
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  stageKey?: string | null;

  /*
   * การกระทำ (default none = "Color mark")
   * service จะตรวจซ้ำว่า auto_archive ใช้ได้เฉพาะ order_pipeline
   * และต้องส่ง archiveAfterDays มาด้วย
   */
  @IsOptional()
  @IsIn(AGING_ACTIONS, {
    message:
      'actionType ต้องเป็น none, auto_archive หรือ edit_lock',
  })
  actionType?: AgingAction;

  /*
   * จำนวนวันของ "การซ่อนการ์ดอัตโนมัติ" ที่กำหนดเอง
   * (แยกจาก Warning/Critical ที่ใช้ตอน action = none)
   * บังคับตอน actionType = auto_archive (เช็คใน service)
   */
  @IsOptional()
  @IsInt()
  @Min(1, {
    message: 'จำนวนวันของ auto-archive ต้องตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(365, {
    message: 'จำนวนวันของ auto-archive ต้องไม่เกิน 365 วัน',
  })
  archiveAfterDays?: number;
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

  /* เปลี่ยนบอร์ด — ถ้าไม่ส่ง stageKey ด้วย service จะล้าง scope ให้ (กันค้างข้ามบอร์ด) */
  @IsOptional()
  @IsIn(AGING_BOARDS, {
    message: 'boardType ต้องเป็น order_pipeline หรือ customers',
  })
  boardType?: AgingBoard;

  /* null = ล้างscope ให้กลับเป็น "ทุกคอลัมน์"; ไม่ส่ง = คงค่าเดิม */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  stageKey?: string | null;

  /* ไม่ส่ง = คงค่าเดิม */
  @IsOptional()
  @IsIn(AGING_ACTIONS, {
    message:
      'actionType ต้องเป็น none, auto_archive หรือ edit_lock',
  })
  actionType?: AgingAction;

  /*
   * จำนวนวันของ auto_archive (บังคับตอน actionType = auto_archive)
   * ไม่ส่ง = คงค่าเดิม; service จะล้างเป็น null เองเมื่อ action ไม่ใช่ auto_archive
   */
  @IsOptional()
  @IsInt()
  @Min(1, {
    message: 'จำนวนวันของ auto-archive ต้องตั้งแต่ 1 วันขึ้นไป',
  })
  @Max(365, {
    message: 'จำนวนวันของ auto-archive ต้องไม่เกิน 365 วัน',
  })
  archiveAfterDays?: number;
}

/*
 * ค่าที่ส่งกลับให้หน้า Administration -> Workflow Rules -> แท็บ Aging
 * และให้บอร์ด Order Pipeline / Customers ไปคิดสีของ Card
 */
export interface AgingRuleView {
  ruleId: number;
  ruleName: string;
  warningAfterDays: number;
  criticalAfterDays: number;
  isActive: boolean;
  boardType: AgingBoard;
  stageKey: string | null;
  /*
   * การกระทำของ rule — หน้าแอดมินใช้แสดง chip
   * และฝั่ง UI ใช้เปิด/ปิดปุ่มแก้ไขตาม edit_lock
   */
  actionType: AgingAction;
  /*
   * จำนวนวันของ auto_archive (NULL เมื่อไม่ใช่ action นี้)
   * หน้าแอดมินใช้แสดงบน chip และ scheduler เอาไปคิดว่าเมื่อไหร่ต้องซ่อนการ์ด
   */
  archiveAfterDays: number | null;
  /*
   * ชื่อคอลัมน์ที่ stage_key ชี้ไป (คำนวณฝั่ง server ให้หน้าแอดมินใช้เลย)
   * null = หาคอลัมน์ไม่เจอใน DB (ถูกลบไปแล้ว) -> หน้า UI ขึ้นป้าย "ไม่พบคอลัมน์"
   */
  stageLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
