"use client";

import { useApi } from "./swr";
import { useSession } from "./useSession";

import type { AgingRule } from "./types";
import type { AgingBoard } from "./useAgingStatus";

export interface EditLockInfo {
  /* true = คอลัมน์นี้ถูก Aging Rule ล็อกไม่ให้แก้ไข */
  locked: boolean;
  /* ชื่อ rule ที่ล็อก (ใช้แสดงใน Alert/tooltip ให้รู้ว่า rule ไหนสั่ง) */
  ruleName: string | null;
}

const UNLOCKED: EditLockInfo = {
  locked: false,
  ruleName: null,
};

/*
 * หา rule edit_lock ที่ล็อกคอลัมน์นี้ (null = ทุกคอลัมน์ของบอร์ด)
 * ใช้ร่วมกันทั้งแบบ hook และแบบ sync
 */
function findLockRule(
  rules: AgingRule[] | null | undefined,
  boardType: AgingBoard,
  stageKey: string | null | undefined,
): AgingRule | undefined {
  if (!rules || !stageKey) {
    return undefined;
  }

  return rules.find(
    (item) =>
      item.isActive &&
      item.actionType === "edit_lock" &&
      item.boardType === boardType &&
      (item.stageKey === null || item.stageKey === stageKey),
  );
}

/*
 * ตรวจแบบ sync (ไม่ผ่าน hook) — ใช้ตอนต้องเช็คหลายแถวพร้อมกัน
 * เช่น ตารางรายการลูกค้า ที่ปุ่มแก้ไข/ลบต้องปิดตามแถว
 */
export function isColumnLocked(
  rules: AgingRule[] | null | undefined,
  boardType: AgingBoard,
  stageKey: string | null | undefined,
): boolean {
  return Boolean(findLockRule(rules, boardType, stageKey));
}

/*
 * ตรวจว่าคอลัมน์ (stage_key) บนบอร์ดที่ระบุ
 * ถูก Aging Rule ประเภท edit_lock ล็อกไม่ให้แก้ไขหรือไม่
 *
 * ใช้ร่วมกันทุกหน้า/dialog — ดึง /api/aging-rules ซึ่งเป็น key เดียว
 * กับหน้าอื่นในแอป -> SWR ยิง request ครั้งเดียวแล้วแชร์ผลกัน
 *
 * ⚠ ตัวนี้ใช้ "ปิด UI" เท่านั้น — ฝั่ง backend เป็นคนบังคับจริงด้วย
 *   (403 errorCode EDIT_LOCKED) เผื่อมีช่องทางแก้ไขที่ไม่ผ่านหน้านี้
 */
export function useEditLock(
  boardType: AgingBoard,
  stageKey: string | null | undefined,
): EditLockInfo {
  const { ready, user } = useSession();

  const { data } = useApi<AgingRule[]>(
    ready && user ? "/api/aging-rules" : null,
  );

  if (!data || !stageKey) {
    return UNLOCKED;
  }

  const rule = findLockRule(data, boardType, stageKey);

  if (!rule) {
    return UNLOCKED;
  }

  return {
    locked: true,
    ruleName: rule.ruleName,
  };
}
