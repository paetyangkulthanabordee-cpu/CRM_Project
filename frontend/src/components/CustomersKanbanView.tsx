"use client";

import { useCallback } from "react";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

import CustomersKanbanBoard from "@/components/CustomersKanbanBoard";
import {
  formatBaht,
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";

import { emptySummary } from "@/lib/customerDocs";

import type { DocSummary } from "@/lib/customerDocs";
import type {
  Customer,
  PipelineStage,
} from "@/lib/types";

export interface CustomersKanbanViewProps {
  customers: Customer[];
  stages: PipelineStage[];
  docSummary: Record<number, DocSummary>;
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
  ghost,
  dragging,
}: {
  customer: Customer;
  docSummary: Record<number, DocSummary>;
  unassignedLabel: string;
  onOpen: (customer: Customer) => void;
  ghost?: boolean;
  dragging?: boolean;
}) {
  const summary =
    docSummary[customer.customerId] ??
    emptySummary();

  const assigned =
    customer.assignedUser?.name ?? null;

  return (
    <Card
      data-testid="customer-kanban-card"
      data-customer-id={customer.customerId}
      sx={{
        p: 2,
        borderRadius: "12px",
        border: "1px solid #e7ebf2",
        bgcolor: "#ffffff",
        boxShadow: dragging
          ? "0 12px 24px rgba(15,23,42,0.15)"
          : "0 1px 3px rgba(15,23,42,0.04)",
        cursor: "pointer",
        opacity: ghost ? 0 : 1,
        pointerEvents: ghost
          ? "none"
          : undefined,
        transition: "box-shadow 150ms ease, opacity 150ms ease",
        "&:hover": {
          borderColor: "#c7d2fe",
          bgcolor: "#f8fafc",
          boxShadow:
            "0 4px 12px rgba(15,23,42,0.08)",
        },
      }}
      onClick={() => onOpen(customer)}
    >
      <Typography
        sx={{
          fontWeight: 800,
          color: "#0f172a",
          fontSize: 14,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {customer.companyName}
      </Typography>

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
        ghost={state.ghost}
        dragging={state.dragging}
      />
    ),
    [docSummary, unassignedLabel, onOpen],
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
