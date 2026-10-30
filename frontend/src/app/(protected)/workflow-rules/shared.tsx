"use client";

import type { ReactNode } from "react";

import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

/*
 * คอมโพเนนต์ร่วมของหน้า Workflow Rules (ทั้งแท็บ move และแท็บ aging)
 * แยกมาไว้ตรงนี้เพื่อให้ 2 แท็บใช้หน้าตาชุดเดียวกัน
 * โดยไม่ต้อง duplicate โค้ด (เดิมเป็น local function ใน MoveRulesTab)
 */

/* หัวข้อโซนในฟอร์ม (เช่น เส้นทาง / เงื่อนไข / เกณฑ์เวลา / การบังคับใช้) */
export function ZoneTitle({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        mb: 1.5,
      }}
    >
      {icon}

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: 0.4,
          color: "#334155",
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}

/* =====================================================
   สวิตช์พร้อม label ใต้ตัว — ไม่ต้องก้มดูหัวคอลัมน์
   label จะสลับตามสถานะปัจจุบัน (เปิดใช้งาน/ปิดอยู่)
===================================================== */
export function LabeledSwitch({
  checked,
  disabled,
  labelOn,
  labelOff,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  labelOn: string;
  labelOff: string;
  ariaLabel: string;
  onChange: () => void;
}) {
  return (
    <Stack
      spacing={0.5}
      sx={{
        minWidth: 76,
        alignItems: "center",
      }}
    >
      <Switch
        size="small"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        slotProps={{
          input: { "aria-label": ariaLabel },
        }}
      />

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: 11,
          lineHeight: 1.2,
          textAlign: "center",
          color: checked ? "#2563eb" : "#94a3b8",
        }}
      >
        {checked ? labelOn : labelOff}
      </Typography>
    </Stack>
  );
}
