/*
 * รูปแบบตัวเลขเงิน ใช้ร่วมกันทุกหน้า
 * ตรึง locale ไว้ที่ th-TH เพื่อให้แสดงสัญลักษณ์ ฿ เสมอ
 * ไม่ว่าผู้ใช้จะเลือกภาษาอังกฤษหรือไทย
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/*
 * ปัดเศษทศนิยม 2 ตำแหน่งแบบ bank rounding
 * กัน floating point error เช่น 0.1 + 0.2
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/*
 * แสดงขนาดไฟล์แบบย่อให้อ่านง่าย (ใช้ตอนโชว์ไฟล์แนบ)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
