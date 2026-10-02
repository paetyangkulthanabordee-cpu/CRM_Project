"use client";

import { useSyncExternalStore } from "react";

import {
  getPermissionsSnapshot,
  getSessionServerSnapshot,
  getUserSnapshot,
  subscribeSession,
} from "@/lib/auth";

import type {
  Permissions,
  User,
} from "@/lib/auth";

export interface Session {
  user: User | null;
  permissions: Permissions | null;

  /*
   * false ระหว่าง SSR/hydration, true เมื่ออยู่ฝั่ง client แล้ว
   * ต้องรอ ready ก่อนตัดสินใจ redirect มิฉะนั้น
   * หน้าที่ต้องล็อกอินจะถูกเด้งกลับ /login ตอน refresh
   */
  ready: boolean;
}

function getClientReady() {
  return true;
}

function getServerNotReady() {
  return false;
}

export function useSession(): Session {
  const user = useSyncExternalStore(
    subscribeSession,
    getUserSnapshot,
    getSessionServerSnapshot,
  );

  const permissions = useSyncExternalStore(
    subscribeSession,
    getPermissionsSnapshot,
    getSessionServerSnapshot,
  );

  const ready = useSyncExternalStore(
    subscribeSession,
    getClientReady,
    getServerNotReady,
  );

  return { user, permissions, ready };
}