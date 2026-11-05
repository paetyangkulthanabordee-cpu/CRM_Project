import type { AgingInfo } from "./useAgingStatus";

/*
 * สีขอบ/เงาของ "การ์ด" ตามสถานะอายุ (Aging Rules)
 * ใช้ร่วมกันทุกบอร์ด (Order Pipeline / Customers ทั้ง 2 หน้า)
 * เพื่อให้สีเดียวกันทุกที่และไม่ต้องคัดลอก logic ซ้ำ 3 แห่ง
 *
 * ปกติ         -> ขอบเทา 1px (ค่าเดิมของบอร์ด)
 * warning      -> ขอบ 2px เหลือง #f59e0b + เงาอ่อน
 * critical     -> ขอบ 2px แดง  #ef4444 + เงาอ่อน
 * invalidFuture-> ไม่ทาสี (ปล่อยเป็นขอบเทาปกติ — ใช้ป้ายเตือนแทน)
 */
export interface AgingCardStyle {
  /* true = มีสีอายุ (ใช้ขอบ 2px + เงา tinted) */
  aged: boolean;
  /* สีขอบเมื่อ aged (ใช้คู่กับ border 2px) */
  border: string;
  /* สีขอบตอน hover (ชนะสีอายุเพื่อให้เห็นสีชัดตอนชี้) */
  hoverBorder: string;
  /* เงาเมื่อ aged (ค่า hex ต่อท้าย opacity 33) */
  shadow: string;
}

const NORMAL_BORDER = "#e7ebf2";
const NORMAL_HOVER_BORDER = "#c7d2fe";
const NORMAL_SHADOW = "0 1px 3px rgba(15,23,42,0.04)";

const STATUS_COLORS: Record<string, string> = {
  warning: "#f59e0b",
  critical: "#ef4444",
};

export function agingCardStyle(
  aging?: AgingInfo | null,
): AgingCardStyle {
  const color =
    aging && STATUS_COLORS[aging.status]
      ? STATUS_COLORS[aging.status]
      : null;

  if (!color) {
    return {
      aged: false,
      border: NORMAL_BORDER,
      hoverBorder: NORMAL_HOVER_BORDER,
      shadow: NORMAL_SHADOW,
    };
  }

  return {
    aged: true,
    border: color,
    hoverBorder: color,
    shadow: `0 1px 3px ${color}33`,
  };
}
