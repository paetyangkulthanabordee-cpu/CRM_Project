"use client";

import { useEffect, useState } from "react";

/*
 * หน่วงค่าไว้ตาม delayMs ก่อนคืนค่าจริง
 * ใช้กับช่องค้นหาที่ยิง API ทุกครั้งที่พิมพ์
 * เพื่อไม่ให้ยิง request ทุก keystroke
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs = 300,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
