"use client";

import { useCallback } from "react";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import LockOutlineIcon from "@mui/icons-material/LockOutlined";

import { useTranslations } from "next-intl";

import CustomersKanbanBoard from "@/components/CustomersKanbanBoard";
import AgingBadge from "@/components/AgingBadge";
import {
  formatBaht,
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";

import { agingCardStyle } from "@/lib/agingStyle";
import { emptySummary } from "@/lib/customerDocs";
import { useEditLock } from "@/lib/useEditLock";

import type { DocSummary } from "@/lib/customerDocs";
import type { AgingInfo } from "@/lib/useAgingStatus";
import type {
  Customer,
  PipelineStage,
} from "@/lib/types";

export interface CustomersKanbanViewProps {
  customers: Customer[];
  stages: PipelineStage[];
  docSummary: Record<number, DocSummary>;
  /*
   * สถานะอายุจาก Aging Rules (Map<customerId, AgingInfo>)
   * null = ยังไม่คำนวณ/ไม่มี rule -> การ์ดแสดงปกติ
   */
  agingMap?: Map<number, AgingInfo> | null;
  onOpen: (customer: Customer) => void;
  onStageChange: (
    customerId: number,
    status: string,
  ) => Promise<void>;
  emptyColumnLabel: string;
  unassignedLabel: string;
}

function CustomerKanbanCard({
  customer,
  docSummary,
  unassignedLabel,
  onOpen,
  aging,
  ghost,
  dragging,
}: {
  customer: Customer;
  docSummary: Record<number, DocSummary>;
  unassignedLabel: string;
  onOpen: (customer: Customer) => void;
  /* สถานะอายุจาก Aging Rules (null = ไม่เข้าเงื่อนไข/ยังไม่คำนวณ) */
  aging?: AgingInfo | null;
  ghost?: boolean;
  dragging?: boolean;
}) {
  const summary =
    docSummary[customer.customerId] ??
    emptySummary();

  const assigned =
    customer.assignedUser?.name ?? null;

  const tC = useTranslations("common");

  /*
   * edit-lock: คอลัมน์นี้ถูก Aging Rule ล็อกไม่ให้แก้ไข
   * -> ขึ้นไอคอนล็อกให้เห็นตั้งแต่บนการ์ด
   */
  const editLock = useEditLock(
    "customers",
    customer.status ?? null,
  );

  /*
   * สีขอบ/เงาตามสถานะอายุ (logic ร่วมทุกบอร์ดที่ lib/agingStyle)
   * วันที่ในอนาคต (invalidFuture) ไม่ทาสี — ใช้ป้ายเตือนแทน
   */
  const { aged, border, hoverBorder, shadow } =
    agingCardStyle(aging);

  return (
    <Card
      data-testid="customer-kanban-card"
      data-customer-id={customer.customerId}
      data-aging-status={aging?.status ?? "normal"}
      sx={{
        p: 2,
        borderRadius: "12px",
        border: aged
          ? `2px solid ${border}`
          : "1px solid #e7ebf2",
        bgcolor: "#ffffff",
        boxShadow: dragging
          ? "0 12px 24px rgba(15,23,42,0.15)"
          : shadow,
        cursor: "pointer",
        opacity: ghost ? 0 : 1,
        pointerEvents: ghost
          ? "none"
          : undefined,
        transition: "box-shadow 150ms ease, opacity 150ms ease",
        "&:hover": {
          borderColor: hoverBorder,
          bgcolor: "#f8fafc",
          boxShadow:
            "0 4px 12px rgba(15,23,42,0.08)",
        },
      }}
      onClick={() => onOpen(customer)}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.75,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 800,
            color: "#0f172a",
            fontSize: 14,
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          {customer.companyName}
        </Typography>

        {/* ป้าย "N วันไม่มี Activity" / "วันที่ผิดปกติ" (ปกติ = ไม่แสดง) */}
        <Box sx={{ flexShrink: 0, mt: "2px" }}>
          <AgingBadge aging={aging} />

          {editLock.locked && (
            <Tooltip title={tC("editLocked")}>
              <LockOutlineIcon
                data-testid="edit-lock-icon"
                sx={{
                  fontSize: 15,
                  color: "#c2410c",
                  ml: 0.5,
                  verticalAlign: "middle",
                }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 0.5,
          color: "#64748b",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {customer.email || "-"}
        {" · "}
        {customer.phone || "-"}
      </Typography>

      <Box
        sx={{
          mt: 1.25,
          pt: 1.25,
          borderTop: "1px solid #eef1f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: 10,
              fontWeight: 800,
              bgcolor: assigned
                ? "#e8f1ff"
                : "#eef1f6",
              color: assigned
                ? "#1d4ed8"
                : "#94a3b8",
              flexShrink: 0,
            }}
          >
            {assigned
              ? initials(assigned)
              : "?"}
          </Avatar>

          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {assigned ?? unassignedLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            {formatBaht(summary.outstanding)}
          </Typography>

          <Typography
            variant="caption"
            sx={{ color: "#94a3b8" }}
          >
            {formatDate(customer.createdAt)}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

export default function CustomersKanbanView({
  customers,
  stages,
  docSummary,
  agingMap = null,
  onOpen,
  onStageChange,
  emptyColumnLabel,
  unassignedLabel,
}: CustomersKanbanViewProps) {
  const renderCard = useCallback(
    (
      customer: Customer,
      state: {
        ghost: boolean;
        dragging: boolean;
      },
    ) => (
      <CustomerKanbanCard
        customer={customer}
        docSummary={docSummary}
        unassignedLabel={unassignedLabel}
        onOpen={onOpen}
        aging={
          agingMap?.get(customer.customerId) ?? null
        }
        ghost={state.ghost}
        dragging={state.dragging}
      />
    ),
    [
      docSummary,
      unassignedLabel,
      onOpen,
      agingMap,
    ],
  );

  return (
    <CustomersKanbanBoard
      customers={customers}
      stages={stages}
      onStageChange={onStageChange}
      renderCard={renderCard}
      emptyColumnLabel={emptyColumnLabel}
      cardHeight={180}
      columnWidth={300}
    />
  );
}
