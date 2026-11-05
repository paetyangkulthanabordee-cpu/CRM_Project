import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class ListIssueOrdersDto {
  /*
   * ค้นได้ทั้งเลขที่ใบสั่งซื้อ ชื่อบริษัท หมายเหตุ
   * และชื่อสินค้าในรายละเอียด (issue_order_detail)
   */
  @IsOptional()
  @IsString()
  search?: string;

  /*
   * กรองตามขั้นตอนบนบอร์ด (order_pipeline.id)
   */
  @IsOptional()
  @IsInt()
  pipelineId?: number;

  /*
   * กรองตามลูกค้า (customers.customer_id)
   * ใช้ตอนเปิดหน้า dashboard ของลูกค้ารายนั้น
   */
  @IsOptional()
  @IsInt()
  customerId?: number;

  /*
   * กรองใบสั่งซื้อที่ถูก Archive (Aging Rule = auto_archive)
   * - ไม่ส่งพารามนี้  -> ทุกใบ (หน้าอื่น เช่น หน้ารายละเอียดลูกค้า เห็นครบ)
   * - "false"          -> เฉพาะที่ยังแสดงบนบอร์ด (หน้า Order Pipeline ส่งค่านี้)
   * - "true"           -> เฉพาะที่ถูกซ่อน
   *
   * ใช้ string กับ @IsIn (ไม่ใช่ boolean) เพราะ query string "false"
   * ถ้าแปลงผิดฝั่งจะกลายเป็นค่า truthy แล้วกรองกลับด้าน
   */
  @IsOptional()
  @IsIn(['true', 'false'])
  archived?: string;
}
