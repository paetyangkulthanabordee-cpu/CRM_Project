export type ListQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<
      string | number | null | undefined
    >;

export type ListQueryInput = Record<
  string,
  ListQueryValue
>;

function append(
  params: URLSearchParams,
  key: string,
  value: ListQueryValue,
) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    /*
     * ค่าหลายรายการ (เช่น status หลายช่อง) รวมเป็น comma-separated
     * ค่าว่างถูกตัดออก ถ้าไม่เหลืออะไรเลยจะไม่ส่งพารามิเตอร์นี้ไป
     */
    const items = value
      .map((item) =>
        item === null || item === undefined
          ? ""
          : String(item).trim(),
      )
      .filter((item) => item !== "");

    if (items.length === 0) {
      return;
    }

    params.set(key, items.join(","));
    return;
  }

  if (typeof value === "boolean") {
    if (value) {
      params.set(key, "true");
    }

    return;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    params.set(key, trimmed);
    return;
  }

  params.set(key, String(value));
}

/*
 * สร้าง query string สำหรับเรียก API รายชื่อ
 * - ค่าว่าง/ช่องว่าง/undefined ไม่ถูกส่งไปเลย
 * - ค่า array ถูก join ด้วย comma
 */
export function buildListQuery(
  entries: ListQueryInput,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
    entries,
  )) {
    append(params, key, value);
  }

  return params.toString();
}

/*
 * ต่อ query string เข้ากับ base URL
 * base เป็น null (ยังไม่พร้อม) หรือไม่มีค่า filter เลย -> คืน URL เดิม
 */
export function withQuery(
  base: string | null,
  entries: ListQueryInput,
): string | null {
  if (!base) {
    return null;
  }

  const query = buildListQuery(entries);

  return query ? `${base}?${query}` : base;
}
