import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/*
 * รับได้ทั้งวันที่ (YYYY-MM-DD)
 * และวันเวลาเต็มแบบ ISO เช่น 2026-10-26T00:00:00.000Z
 * หน้าบอร์ดส่งเวลาแบบ ISO เพื่อให้ตรงเขตเวลาผู้ใช้จริง
 */
const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const DATE_ERROR_MESSAGE =
  'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD หรือ ISO datetime)';

/*
 * แปลงค่าที่รับมาจาก query string เป็นข้อความ
 * ค่าที่ไม่ใช่ข้อความ/ตัวเลข/boolean จะถูกตัดทิ้ง
 */
function toText(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return '';
}

/*
 * แปลงค่า comma-separated เป็น array
 * ใช้ได้ทั้งตอนส่ง "a,b" และส่งหลายพารามิเตอร์ซ้ำกัน
 */
function toStringList(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value
    : [value];

  return parts
    .flatMap((item) => toText(item).split(','))
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

/*
 * แปลง comma-separated เป็นตัวเลข
 * ค่าที่ไม่ใช่จำนวนเต็มจะถูกตัดทิ้ง (ไม่ทำให้ filter พัง)
 */
function toNumberList(
  value: unknown,
): number[] | undefined {
  const numbers = toStringList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));

  return numbers.length > 0 ? numbers : undefined;
}

export class ListCustomersDto {
  /*
   * กรองหลายสถานะพร้อมกัน (คั่นด้วย comma)
   * ยังรับค่าเดี่ยวแบบเดิมได้ เช่น status=new
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : toStringList(value),
  )
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: DATE_ERROR_MESSAGE,
  })
  dateFrom?: string;

  /*
   * จำกัดถึงวันสิ้นวัน (ถ้าส่งแบบ YYYY-MM-DD)
   * หรือถึงเวลานั้น ๆ (ถ้าส่งแบบ ISO datetime)
   */
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: DATE_ERROR_MESSAGE,
  })
  dateTo?: string;

  /*
   * กรองผู้รับผิดชอบหลายคน (คั่นด้วย comma)
   * ใช้คู่กับ unassigned เพื่อรวมลูกค้าที่ยังไม่ระบุผู้รับผิดชอบ
   */
  @IsOptional()
  @Transform(({ value }) => toNumberList(value))
  @IsArray()
  @IsInt({ each: true })
  assignedId?: number[];

  /*
   * true = แสดงลูกค้าที่ยังไม่ได้ระบุผู้รับผิดชอบด้วย
   */
  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  /*
   * true = แสดงเฉพาะลูกค้าที่ปิดใช้งาน
   * ไม่ส่งมาหรือ false = แสดงเฉพาะลูกค้าที่ใช้งานอยู่
   */
  @IsOptional()
  @IsBoolean()
  onlyInactive?: boolean;
}
