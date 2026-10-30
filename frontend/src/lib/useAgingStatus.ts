"use client";

import { useEffect, useMemo, useState } from "react";

import type { AgingRule } from "./types";

/*
 * Time-based Workflow Rules (Aging Rules) ฝั่งหน้าบอร์ด
 *
 * หน้าที่ของ hook นี้คือ "นับอายุ" ของแต่ละการ์ดจาก last_activity_at
 * แล้วเทียบกับ Threshold ที่ Admin ตั้งไว้ในหน้า Workflow Rules แท็บ Aging:
 *
 *   days < warningAfterDays   -> normal (สีปกติ)
 *   days >= warningAfterDays  -> warning (สีเหลือง / border เหลือง)
 *   days >= criticalAfterDays -> critical (สีแดง / border แดง)
 *
 * คำนวณฝั่ง client แล้วสุ่มคำนวณใหม่ทุก 1 นาที (และตอนแท็บกลับมา
 * แสดงผล) เพื่อให้สถานะเปลี่ยน Day 3 -> Day 7 ได้เอง
 * โดยไม่ต้องให้ผู้ใช้กด Refresh หน้า
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ระยะเวลาระหว่างการคำนวณซ้ำอัตโนมัติ */
const TICK_MS = 60 * 1000;

export type AgingStatus =
  | "normal"
  | "warning"
  | "critical";

export interface AgingInfo {
  status: AgingStatus;
  /* จำนวนวันตามปฏิทินที่ผ่านไปตั้งแต่ last activity */
  days: number;
  /* เวลาที่ใช้เป็นจุดเริ่มต้นนับ (ISO string, '' ถ้าไม่มีข้อมูล) */
  since: string;
  /* threshold ที่ทำให้เป็นสถานะนี้ (null เมื่อ normal) */
  thresholdDays: number | null;
  /*
   * true = วันที่ activity อยู่ "ในอนาคต" (ข้อมูลผิด)
   * การ์ดจะไม่นับเป็น warning/critical แต่โชว์ป้ายเตือนแทน
   * เพื่อไม่ให้ข้อมูลผิด ๆ ถูกกลืนเป็น "0 วัน" แบบเงียบ ๆ
   */
  invalidFuture: boolean;
}

/*
 * โครงสร้างขั้นต่ำที่ hook ต้องการจาก card
 * (ใบสั่งซื้อส่ง lastActivityAt -> fallback updatedAt -> createdAt)
 */
interface ActivityStamped {
  id: number;
  lastActivityAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
}

function resolveSince(
  item: ActivityStamped,
): Date | null {
  const raw =
    item.lastActivityAt ??
    item.updatedAt ??
    item.createdAt;

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/*
 * ค่า timestamp ของ "เที่ยงคืนตามเวลาท้องถิ่น" ของวันนั้น ๆ
 * ใช้เทียบวันแบบ calendar day (ข้ามวันตามปฏิทิน)
 * ไม่ใช่การนับชั่วโมงเต็ม เพราะ "ไม่มี activity 3 วัน" ของคนทั่วไป
 * หมายถึงข้ามวันตามปฏิทิน เช่น activity วันที่ 27 -> วันที่ 30 = 3 วัน
 * (ตรงกับตัวอย่าง Day 0 / 1-2 / 3-6 / 7+ ของกฎ)
 */
function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/*
 * คิดสถานะของ card หนึ่งใบ ณ เวลา nowMs
 * ถ้ามี rule ที่ active หลายใบ ใช้ค่าที่เข้มงวดที่สุด
 * (วันน้อยสุดที่ทำให้ถึงสถานะนั้น)
 */
export function computeAging(
  item: ActivityStamped,
  rules: AgingRule[],
  nowMs: number,
): AgingInfo {
  const since = resolveSince(item);

  if (!since) {
    return {
      status: "normal",
      days: 0,
      since: "",
      thresholdDays: null,
      invalidFuture: false,
    };
  }

  /*
   * วันที่อยู่ในอนาคต (เช่น ถูกแก้ใน DB ผิดปี)
   * ห้ามปล่อยให้ Math.max(0, ...) กลืนเป็น "0 วัน" เงียบ ๆ
   * เพราะจะทำให้การ์ดไม่มีวันเปลี่ยนสีและไม่รู้ว่าข้อมูลผิด
   * -> คืนสถานะปกติ + ป้ายเตือนให้หน้าบอร์ดแสดงแทน
   */
  if (since.getTime() > nowMs) {
    return {
      status: "normal",
      days: 0,
      since: since.toISOString(),
      thresholdDays: null,
      invalidFuture: true,
    };
  }

  /*
   * จำนวนวันตามปฏิทิน (calendar day) ที่ผ่านไปตั้งแต่ last activity
   * นับแบบเที่ยงคืนถึงเที่ยงคืนของ timezone ผู้ใช้ + round กันวันมี DST
   * เช่น ไม่มี activity ตั้งแต่ 27 ต.ค. -> 30 ต.ค. = 3 วัน (เข้า rule 3 วันทันที)
   */
  const days = Math.max(
    0,
    Math.round(
      (startOfLocalDay(nowMs) -
        startOfLocalDay(since.getTime())) /
        DAY_MS,
    ),
  );

  let status: AgingStatus = "normal";
  let thresholdDays: number | null = null;

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    if (days >= rule.criticalAfterDays) {
      if (
        status !== "critical" ||
        thresholdDays === null ||
        rule.criticalAfterDays < thresholdDays
      ) {
        status = "critical";
        thresholdDays = rule.criticalAfterDays;
      }

      continue;
    }

    if (days >= rule.warningAfterDays) {
      if (
        status === "normal" ||
        thresholdDays === null ||
        rule.warningAfterDays < thresholdDays
      ) {
        status = "warning";
        thresholdDays = rule.warningAfterDays;
      }
    }
  }

  return {
    status,
    days,
    since: since.toISOString(),
    thresholdDays,
    invalidFuture: false,
  };
}

/*
 * คืน Map<cardId, AgingInfo> สำหรับบอร์ด
 *
 * - ค่า now เริ่มเป็น null แล้วค่อยตั้งใน useEffect เพื่อกัน
 *   hydration mismatch (server/client เวลาไม่ตรงกัน)
 * - หลัง mount จะคำนวณทันที แล้วสุ่มใหม่ทุก TICK_MS
 *   + ทุกครั้งที่แท็บกลับมาอยู่หน้าจอ (ข้ามแท็บ/สลับแอป)
 */
export function useAgingStatus<T extends ActivityStamped>(
  items: readonly T[],
  rules: AgingRule[],
): Map<number, AgingInfo> {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());

    update();

    const intervalId = window.setInterval(
      update,
      TICK_MS,
    );

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        update();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisible,
    );
    window.addEventListener("focus", handleVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisible,
      );
      window.removeEventListener(
        "focus",
        handleVisible,
      );
    };
  }, []);

  return useMemo(() => {
    const map = new Map<number, AgingInfo>();

    if (now === null) {
      return map;
    }

    for (const item of items) {
      map.set(
        item.id,
        computeAging(item, rules, now),
      );
    }

    return map;
  }, [items, rules, now]);
}
