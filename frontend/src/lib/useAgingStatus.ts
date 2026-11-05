"use client";

import { useEffect, useMemo, useState } from "react";

import type { AgingRule } from "./types";

/*
 * Time-based Workflow Rules (Aging Rules) ฝั่งหน้าบอร์ด
 *
 * หน้าที่ของ hook นี้คือ "นับอายุ" ของแต่ละการ์ดจาก updated_at
 * แล้วเทียบกับ Threshold ที่ Admin ตั้งไว้ในหน้า Workflow Rules แท็บ Aging:
 *
 *   days < warningAfterDays   -> normal (สีปกติ)
 *   days >= warningAfterDays  -> warning (สีเหลือง / border เหลือง)
 *   days >= criticalAfterDays -> critical (สีแดง / border แดง)
 *
 * Scope ของ rule (boardType + stageKey) ถูกกรองที่นี่:
 *   - ใช้เฉพาะ rule ของบอร์ดที่ hook ถูกเรียก (order_pipeline / customers)
 *   - rule ที่ระบุ stageKey = มีผลเฉพาะการ์ดในคอลัมน์นั้น
 *     rule ที่ stageKey = null  = มีผลกับทุกคอลัมน์ของบอร์ดนั้น
 *   - ถ้ามี rule หลายใบเข้ากับการ์ดเดียว ใช้ค่าเข้มงวดที่สุด (วันน้อยสุด)
 *
 * คำนวณฝั่ง client แล้วสุ่มคำนวณใหม่ทุก 1 นาที (และตอนแท็บกลับมา
 * แสดงผล) เพื่อให้สถานะเปลี่ยน Day 3 -> Day 7 ได้เอง
 * โดยไม่ต้องให้ผู้ใช้กด Refresh หน้า
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ระยะเวลาระหว่างการคำนวณซ้ำอัตโนมัติ */
const TICK_MS = 60 * 1000;

/* บอร์ดที่ Aging Rule มีผล — ตรงกับค่าในตาราง aging_rules.board_type */
export type AgingBoard =
  | "order_pipeline"
  | "customers";

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
   * true = วันที่ของใบสั่งซื้ออยู่ "ในอนาคต" อย่างน้อย 1 วันปฏิทินเต็ม
   * (ข้อมูลผิด เช่น แก้ใน DB ผิดปี) — การ์ดจะไม่นับเป็น warning/critical
   * แต่โชว์ป้ายเตือนแทน เพื่อไม่ให้ข้อมูลผิด ๆ ถูกกลืนเป็น "0 วัน" เงียบ ๆ
   *
   * เทียบแบบ "วันปฏิทิน" (ไม่ใช่ timestamp) เพื่อไม่ให้
   * ค่าที่เลยมาไม่กี่ชั่วโมง (timezone/clock skew ตอนแก้ DB ตรง ๆ)
   * ถูกตีความเป็นอนาคตและขึ้นป้ายโดยไม่จำเป็น
   */
  invalidFuture: boolean;
}

/*
 * โครงสร้างขั้นต่ำที่ hook ต้องการจาก card
 * (ใบสั่งซื้อส่ง updatedAt -> fallback createdAt)
 *
 * คีย์ของรายการ: ใบสั่งซื้อใช้ `id`, ลูกค้าใช้ `customerId`
 * ทั้งสอง optional เพื่อให้ใช้ได้กับ entity ที่ต่างกัน
 */
interface ActivityStamped {
  id?: number;
  customerId?: number;
  updatedAt?: string;
  createdAt?: string;
}

function resolveSince(
  item: ActivityStamped,
): Date | null {
  const raw =
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
 * rules ที่ส่งเข้ามาต้องเป็นของ "บอร์ดเดียวกับการ์ด" และ action = none
 * ("Color mark") อยู่แล้ว — hook เป็นคนกรองตาม boardType/actionType ให้
 * (rule auto_archive / edit_lock ไม่เปลี่ยนสีการ์ด)
 *
 * stageKey = stage_key ของใบสั่งซื้อ/ลูกค้าใบนี้ (null = ไม่ทราบ)
 * rule ที่ระบุ stageKey ต้องตรงกับ stageKey นี้จึงมีผล
 * (rule stageKey = null = ทุกคอลัมน์ ใช้กับทุกใบ)
 *
 * ถ้ามี rule หลายใบเข้ากับการ์ดเดียว ใช้ค่าเข้มงวดที่สุด
 * (วันน้อยสุดที่ทำให้ถึงสถานะนั้น)
 */
export function computeAging(
  item: ActivityStamped,
  rules: AgingRule[],
  nowMs: number,
  stageKey: string | null = null,
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
   * วันที่อยู่ในอนาคต "อย่างน้อย 1 วันปฏิทินเต็ม" (เช่น ถูกแก้ใน DB ผิดปี)
   * -> คืนสถานะปกติ + ป้ายเตือนให้หน้าบอร์ดแสดงแทน
   *
   * เทียบแบบวันปฏิทินไม่ใช่ timestamp:
   * ค่าที่เลยมาไม่กี่ชั่วโมง (timezone/clock skew ตอนพิมพ์เวลาใน DB)
   * จะตกไปอยู่ในกติกา "0 วัน = normal" ตามปกติ ไม่ขึ้นป้ายรบกวน
   * เพราะระบบก็นับอายุแบบเที่ยงคืนถึงเที่ยงคืนอยู่แล้ว
   */
  if (
    startOfLocalDay(since.getTime()) > startOfLocalDay(nowMs)
  ) {
    return {
      status: "normal",
      days: 0,
      since: since.toISOString(),
      thresholdDays: null,
      invalidFuture: true,
    };
  }

  /*
   * จำนวนวันตามปฏิทิน (calendar day) ที่ผ่านไปตั้งแต่แก้ไขล่าสุด
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

    /*
     * rule ที่ระบุคอลัมน์ไว้ (stageKey ไม่ null)
     * มีผลเฉพาะการ์ดในคอลัมน์นั้นเท่านั้น
     */
    if (
      rule.stageKey !== null &&
      rule.stageKey !== stageKey
    ) {
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
 * - boardType = บอร์ดที่กำลังเรียก (rule ของบอร์ดอื่นถูกกรองออก)
 * - getStageKey = ดึง stage_key ของแต่ละใบ (rule เฉพาะคอลัมน์ใช้เทียบ)
 *   ส่งเป็น function ระดับ module (identity คงที่) จะได้ไม่ทำให้
 *   useMemo คำนวณซ้ำทุกครั้งที่ component render
 */
export function useAgingStatus<T extends ActivityStamped>(
  items: readonly T[],
  rules: AgingRule[],
  boardType: AgingBoard,
  getStageKey?: (item: T) => string | null,
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

    /*
     * เอาเฉพาะ rule ของบอร์ดนี้ และ "rule ที่ทำหน้าที่เปลี่ยนสีอย่างเดียว"
     * (action = none / "Color mark") — rule ที่เป็น auto_archive / edit_lock
     * ทำหน้าที่เฉพาะ action ของตัวเอง ไม่เปลี่ยนสีการ์ด
     */
    const boardRules = rules.filter(
      (rule) =>
        rule.boardType === boardType &&
        rule.actionType === "none",
    );

    for (const item of items) {
      /* คีย์ = ใบสั่งซื้อ (id) หรือลูกค้า (customerId) */
      const key = item.id ?? item.customerId;

      if (key === undefined) {
        continue;
      }

      map.set(
        key,
        computeAging(
          item,
          boardRules,
          now,
          getStageKey ? getStageKey(item) : null,
        ),
      );
    }

    return map;
  }, [items, rules, boardType, getStageKey, now]);
}
