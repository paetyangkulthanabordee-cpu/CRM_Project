import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  WORKFLOW_CONDITION_TYPES,
} from '../condition-types.js';

import type { WorkflowConditionType } from '../condition-types.js';

/*
 * validation ของ conditionConfig ทำใน service เพราะค่าที่ถูกต้อง
 * ขึ้นอยู่กับ conditionType ที่ส่งมาด้วย (class-validator เช็คข้าม field ไม่ได้)
 */
export class CreateWorkflowRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruleName: string;

  @IsInt()
  fromStageId: number;

  @IsInt()
  toStageId: number;

  @IsIn(WORKFLOW_CONDITION_TYPES, {
    message:
      'conditionType ต้องเป็น attachment, field, document หรือ payment เท่านั้น',
  })
  conditionType: (typeof WORKFLOW_CONDITION_TYPES)[number];

  @IsOptional()
  @IsObject()
  conditionConfig?: Record<string, unknown>;

  /*
   * ประเภทเอกสารของเงื่อนไข "document" (FK -> document_type.id)
   * ไม่ส่งก็ได้ — service จะ resolve จาก conditionConfig.docType ให้เอง
   */
  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruleName?: string;

  @IsOptional()
  @IsInt()
  fromStageId?: number;

  @IsOptional()
  @IsInt()
  toStageId?: number;

  @IsOptional()
  @IsIn(WORKFLOW_CONDITION_TYPES, {
    message:
      'conditionType ต้องเป็น attachment, field, document หรือ payment เท่านั้น',
  })
  conditionType?:
    (typeof WORKFLOW_CONDITION_TYPES)[number];

  @IsOptional()
  @IsObject()
  conditionConfig?: Record<string, unknown>;

  /*
   * ประเภทเอกสารของเงื่อนไข "document" (FK -> document_type.id)
   */
  @IsOptional()
  @IsInt()
  documentTypeId?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/*
 * ใช้ตอนส่งค่ากลับให้หน้าตาราง
 * แนบ label ของ stage ต้นทาง/ปลายทางมาด้วย
 * เพื่อไม่ให้หน้าเวปต้อง join เอง
 */
export interface WorkflowRuleView {
  ruleId: number;
  ruleName: string;
  fromStageId: number;
  fromStageKey: string;
  fromStageLabel: string;
  fromStageColor: string;
  toStageId: number;
  toStageKey: string;
  toStageLabel: string;
  toStageColor: string;
  conditionType: string;
  conditionConfig: Record<string, unknown>;
  /*
   * ประเภทเอกสารของเงื่อนไข document (null = ไม่ใช่ rule ประเภทนี้
   * หรือ document_type ถูกลบไปแล้ว)
   */
  documentTypeId: number | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/*
 * ผลตรวจ rule หนึ่งข้อกับใบสั่งซื้อใบเดียว
 * ใช้ทั้งตอนบล็อกการย้ายขั้นตอน (400) และ endpoint /workflow-rules/check
 *
 * - met = เงื่อนไขผ่านแล้วหรือยัง
 * - requirementText = ข้อความไทยบอกว่าต้องทำอะไร (มาจาก describeRequirement)
 * - documentTypeId/Label = ประเภทเอกสารที่ rule เรียกร้อง (null ถ้าไม่เกี่ยวกับไฟล์)
 * - currentCount/requiredCount = ความคืบหน้า เช่น แนบแล้ว 1 จากที่ต้องการ 2
 */
export interface WorkflowRuleEvaluation {
  ruleId: number;
  ruleName: string;
  conditionType: WorkflowConditionType;
  /*
   * ฟิลด์ที่ rule ชนิด field เรียกร้อง (note/details/amount)
   * null สำหรับ rule ชนิดอื่น — หน้ารายละเอียดใช้วาง inline ใต้ field ที่ถูกต้อง
   */
  fieldKey: string | null;
  met: boolean;
  requirementText: string;
  documentTypeId: number | null;
  documentTypeLabel: string | null;
  currentCount: number;
  requiredCount: number;
}

/*
 * คำตอบของ GET /workflow-rules/check?orderId=&toStageId=
 * หน้ารายละเอียดใบสั่งซื้อเอาไปแสดงแถบ mark ✅/❌
 * แล้วตัดสินใจโชว์ปุ่ม "ย้ายไปขั้นตอนเลย" เมื่อ allowed = true
 */
export interface WorkflowMoveCheckView {
  orderId: number;
  fromStageId: number;
  toStageId: number;
  toStageLabel: string;
  allowed: boolean;
  rules: WorkflowRuleEvaluation[];
}
