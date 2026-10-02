"use client";

import { useState } from "react";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";

import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";

import {
  CUSTOMER_COLUMNS,
  STATUS_CHIP_STYLES,
  STATUS_LABELS,
} from "@/lib/types";

import type {
  Customer,
  CustomerColumn,
  CustomerStatus,
} from "@/lib/types";

interface Props {
  customers: Customer[];
  onMove: (
    customerId: number,
    status: CustomerStatus,
  ) => void;
  onAdd: (status: CustomerStatus) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

const AVATAR_STYLES: { bg: string; fg: string }[] = [
  { bg: "#e8f1ff", fg: "#1d4ed8" },
  { bg: "#e6f8ec", fg: "#15803d" },
  { bg: "#fff4e8", fg: "#c2410c" },
  { bg: "#f1e8ff", fg: "#7c3aed" },
  { bg: "#e0f7fa", fg: "#0e7490" },
  { bg: "#fde8ee", fg: "#be185d" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  const first = parts[0]?.[0] ?? "?";
  const last =
    parts.length > 1
      ? parts[parts.length - 1][0]
      : "";

  return (first + last).toUpperCase();
}

function getAvatarStyle(name: string) {
  let sum = 0;

  for (const char of name) {
    sum += char.codePointAt(0) ?? 0;
  }

  return AVATAR_STYLES[sum % AVATAR_STYLES.length];
}

/* =====================================================
   CARD CONTENT (ใช้ทั้งการ์ดปกติ และ overlay)
===================================================== */

function CardView({
  customer,
  onEdit,
  onDelete,
  attributes,
  listeners,
  setNodeRef,
  isDragging,
  overlay,
}: {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  setNodeRef?: (node: HTMLElement | null) => void;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  const [menuAnchor, setMenuAnchor] =
    useState<HTMLElement | null>(null);

  const chip = STATUS_CHIP_STYLES[customer.status];
  const avatar = getAvatarStyle(customer.companyName);

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onEdit?.(customer)}
      sx={{
        p: 1.5,
        borderRadius: "14px",
        bgcolor: "#ffffff",
        border: "1px solid #eceff4",
        boxShadow: overlay
          ? "0 16px 32px rgba(15,23,42,0.18)"
          : "0 1px 3px rgba(15,23,42,0.05)",
        cursor: "grab",
        opacity: isDragging ? 0.35 : 1,
        touchAction: "manipulation",
        transition:
          "box-shadow 150ms ease, border-color 150ms ease",
        "&:hover": {
          borderColor: "#d7e3f8",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.09)",
        },
      }}
    >
      {/* ROW 1: avatar + name + date + menu */}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: avatar.bg,
            color: avatar.fg,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 0.5,
            userSelect: "none",
          }}
        >
          {getInitials(customer.companyName)}
        </Box>

        <Box
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Typography
            component="div"
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: 14,
              color: "#1a2233",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {customer.companyName}
          </Typography>

          <Typography
            component="div"
            variant="caption"
            sx={{
              display: "block",
              mt: 0.25,
              color: "#94a3b8",
              fontSize: 11.5,
            }}
          >
            {new Date(
              customer.createdAt,
            ).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Typography>
        </Box>

        {onEdit && onDelete && (
          <IconButton
            size="small"
            aria-label="เมนูลูกค้า"
            onClick={(event) => {
              event.stopPropagation();
              setMenuAnchor(event.currentTarget);
            }}
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            sx={{
              mt: -0.5,
              mr: -0.75,
              color: "#94a3b8",
              "&:hover": {
                bgcolor: "#f1f5f9",
                color: "#475569",
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* DIVIDER */}

      <Box
        sx={{
          my: 1.25,
          borderTop: "1px solid #f1f5f9",
        }}
      />

      {/* ROW 2: phone */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
        }}
      >
        <CallIcon
          sx={{ fontSize: 14, color: "#94a3b8" }}
        />

        <Typography
          component="span"
          variant="body2"
          sx={{
            color: "#64748b",
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {customer.phone || "—"}
        </Typography>
      </Box>

      {/* ROW 3: email */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          minWidth: 0,
        }}
      >
        <EmailIcon
          sx={{ fontSize: 14, color: "#94a3b8" }}
        />

        <Typography
          component="span"
          variant="body2"
          sx={{
            color: "#64748b",
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {customer.email || "—"}
        </Typography>
      </Box>

      {/* ROW 4: status chip */}

      <Chip
        size="small"
        label={
          STATUS_LABELS[customer.status]
        }
        sx={{
          mt: 1.5,
          height: 24,
          px: 0.5,
          borderRadius: "8px",
          bgcolor: chip.bg,
          color: chip.fg,
          fontWeight: 700,
          fontSize: 11.5,
        }}
      />

      {/* MENU */}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(event) =>
          event.stopPropagation()
        }
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 140,
              borderRadius: 2,
              boxShadow:
                "0 8px 24px rgba(15,23,42,0.14)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            const target = customer;
            setMenuAnchor(null);
            onEdit?.(target);
          }}
          sx={{
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          แก้ไข
        </MenuItem>

        <MenuItem
          onClick={() => {
            const target = customer;
            setMenuAnchor(null);
            onDelete?.(target);
          }}
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: "error.main",
          }}
        >
          ลบ
        </MenuItem>
      </Menu>
    </Box>
  );
}

/* =====================================================
   DRAGGABLE CARD
===================================================== */

function DraggableCard({
  customer,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: String(customer.customerId),
  });

  return (
    <CardView
      customer={customer}
      onEdit={onEdit}
      onDelete={onDelete}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
    />
  );
}

/* =====================================================
   COLUMN
===================================================== */

function Column({
  column,
  customers,
  onAdd,
  onEdit,
  onDelete,
}: {
  column: CustomerColumn;
  customers: Customer[];
  onAdd: (status: CustomerStatus) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
  });

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER: dot + name + count pill */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1.5,
          px: 1.5,
          py: 1,
          bgcolor: "#ffffff",
          border: "1px solid #eceff4",
          borderRadius: "12px",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: column.color,
              flexShrink: 0,
            }}
          />

          <Typography
            component="span"
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: 14,
              color: "#1a2233",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {column.label}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: "999px",
            bgcolor: "#eef4ff",
            color: "#64748b",
            fontWeight: 700,
            fontSize: 11.5,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {customers.length} Leads
        </Box>
      </Box>

      {/* BODY (droppable) */}

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          minHeight: 130,
          borderRadius: "12px",
          border: "2px dashed transparent",
          bgcolor: isOver
            ? "#eef4ff"
            : "transparent",
          borderColor: isOver
            ? "#2563eb"
            : "transparent",
          transition:
            "border-color 150ms ease, background-color 150ms ease",
        }}
      >
        {customers.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "#cbd5e1" }}
            >
              {isOver
                ? "วางที่นี่"
                : "ไม่มีรายการ"}
            </Typography>
          </Box>
        ) : (
          customers.map((customer) => (
            <DraggableCard
              key={customer.customerId}
              customer={customer}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </Box>

      {/* FOOTER */}

      <Box sx={{ pt: 1 }}>
        <Button
          fullWidth
          onClick={() => onAdd(column.status)}
          sx={{
            py: 0.7,
            border: "1px dashed #d5dce6",
            borderRadius: "10px",
            color: "#94a3b8",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            justifyContent: "center",
            "&:hover": {
              bgcolor: "#f8fafc",
              borderColor: "#94a3b8",
              color: "#475569",
            },
          }}
        >
          + เพิ่ม
        </Button>
      </Box>
    </Box>
  );
}

/* =====================================================
   BOARD
===================================================== */

export default function CustomerBoard({
  customers,
  onMove,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [activeId, setActiveId] =
    useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const activeCustomer = customers.find(
    (customer) =>
      String(customer.customerId) === activeId,
  );

  function grouped(status: CustomerStatus) {
    return customers.filter(
      (customer) => customer.status === status,
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) =>
        setActiveId(String(event.active.id))
      }
      onDragEnd={(event) => {
        setActiveId(null);

        const { active, over } = event;

        if (!over) {
          return;
        }

        const customerId = Number(active.id);
        const status = String(
          over.id,
        ) as CustomerStatus;

        const isKnownColumn =
          CUSTOMER_COLUMNS.some(
            (column) => column.status === status,
          );

        if (!isKnownColumn) {
          return;
        }

        const customer = customers.find(
          (item) => item.customerId === customerId,
        );

        if (
          !customer ||
          customer.status === status
        ) {
          return;
        }

        onMove(customerId, status);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          overflowX: "auto",
          pb: 2,
          pt: 0.5,
        }}
      >
        {CUSTOMER_COLUMNS.map((column) => (
          <Column
            key={column.status}
            column={column}
            customers={grouped(column.status)}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Box>

      <DragOverlay dropAnimation={null}>
        {activeCustomer ? (
          <Box sx={{ width: 280 }}>
            <CardView
              customer={activeCustomer}
              overlay
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
