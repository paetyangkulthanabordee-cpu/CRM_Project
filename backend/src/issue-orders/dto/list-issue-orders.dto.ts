import { IsInt, IsOptional, IsString } from 'class-validator';

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
}
