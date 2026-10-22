"use client";

import {
  useCallback,
  useSyncExternalStore,
} from "react";

/*
 * ค่า UI ที่ผู้ใช้เลือกไว้ แล้วต้องจำไว้ข้ามการเปิดหน้าใหม่
 * เก็บใน localStorage และ sync ให้ทุก tab ที่เปิดอยู่เห็นค่าเดียวกัน
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onChange);
  }

  return () => {
    listeners.delete(onChange);

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "storage",
        onChange,
      );
    }
  };
}

function readValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // โหมดส่วนตัวอาจปิด localStorage ไว้ ไม่เป็นไร
  }

  emit();
}

export function useStoredPreference<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const getSnapshot = useCallback(() => {
    const raw = readValue(key);

    if (
      raw !== null &&
      (allowed as readonly string[]).includes(raw)
    ) {
      return raw as T;
    }

    return fallback;
  }, [key, fallback, allowed]);

  const getServerSnapshot = useCallback(
    () => fallback,
    [fallback],
  );

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback(
    (next: T) => {
      writeValue(key, next);
    },
    [key],
  );

  return [value, setValue];
}
