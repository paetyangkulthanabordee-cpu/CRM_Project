"use client";

import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import type { AgingInfo } from "@/lib/useAgingStatus";

/*
 * ป้ายสถานะอายุบนการ์ด — ใช้ร่วมทุกบอร์ด
 * (Order Pipeline / Customers kanban ทั้ง 2 หน้า)
 *
 * - normal              -> ไม่แสดงอะไร
 * - warning / critical  -> ป้าย "N วันไม่มี Activity" (เหลือง/แดง)
 *                          hover ขึ้น tooltip บอกวันที่เริ่มนับ
 * - invalidFuture       -> ป้ายส้ม "วันที่ผิดปกติ" + วันเวลาจริง
 *                          (ค่าอนาคต -> ระบบไม่นับอายุ ไม่ทาสี)
 *
 * ข้อความอยู่ใน namespace common เพื่อให้ทุกบอร์ดใช้ชุดเดียวกัน
 */
export default function AgingBadge({
  aging,
}: {
  aging?: AgingInfo | null;
}) {
  const t = useTranslations("common");
  const locale = useLocale();

  if (!aging) {
    return null;
  }

  const future = aging.invalidFuture;
  const aged = aging.status !== "normal";

  if (!future && !aged) {
    return null;
  }

  if (future) {
    return (
      <Tooltip
        title={t("agingFutureTooltip", {
          /* ไม่เรียก Date.now() ตอน render (react-hooks/purity) */
          date: aging.since
            ? new Date(aging.since).toLocaleString(locale)
            : "—",
        })}
      >
        <Typography
          data-testid="aging-future-badge"
          sx={{
            px: 0.75,
            py: 0.25,
            borderRadius: "6px",
            bgcolor: "#ffedd5",
            color: "#c2410c",
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {t("agingFutureWarning")}
        </Typography>
      </Tooltip>
    );
  }

  const warning = aging.status === "warning";

  return (
    <Tooltip
      title={t("agingTooltip", {
        days: aging.days,
        date: new Date(
          aging.since,
        ).toLocaleString(locale),
      })}
    >
      <Typography
        data-testid="aging-days-badge"
        sx={{
          px: 0.75,
          py: 0.25,
          borderRadius: "6px",
          bgcolor: warning ? "#fef3c7" : "#fee2e2",
          color: warning ? "#b45309" : "#b91c1c",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        {t("agingDays", { count: aging.days })}
      </Typography>
    </Tooltip>
  );
}
