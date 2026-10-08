"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import HistoryIcon from "@mui/icons-material/History";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PersonIcon from "@mui/icons-material/Person";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import TodayIcon from "@mui/icons-material/Today";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useVirtualizer } from "@tanstack/react-virtual";

import CustomerDetailDialog, {
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";
import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import type {
  Customer,
  PipelineStage,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

/* สีพื้นหลังของตัวเลขนับในหัวคอลัมน์ */
const COUNT_TINTS = [
  "#f1f5f9",
  "#e8f1ff",
  "#fdf6d8",
  "#e6f8ec",
  "#f1e8ff",
  "#eef1f6",
  "#fdecec",
] as const;

function countTint(index: number) {
  return COUNT_TINTS[
    index % COUNT_TINTS.length
  ];
}

/* =====================================================
   FILTERS
   ====================================================== */

/*
 * ลูกค้าที่ยังไม่ได้ระบุผู้รับผิดชอบ
 * ใช้ค่าติดลบเป็นตัวแทน เพราะ assigned_id เป็น NULL
 */
const UNASSIGNED = -1;

/*
 * ช่วงเวลาแบบเลือกครั้งเดียว เพราะช่วงเวลาซ้อนกัน
 * ถ้าเลือกหลายอันจะได้ผลที่งงง เช่น "วันนี้" อยู่ใน "7 วัน" อยู่แล้ว
 */
type DateBucket =
  | "today"
  | "7d"
  | "30d"
  | "older";

type DateRange = {
  from: string;
  to: string;
};

const DATE_BUCKET_LABELS: Record<
  DateBucket,
  string
> = {
  today: "เพิ่มวันนี้",
  "7d": "7 วันที่ผ่านมา",
  "30d": "30 วันที่ผ่านมา",
  older: "เก่ากว่า 30 วัน",
};

const DATE_BUCKETS: {
  value: DateBucket;
  label: string;
  icon: ReactNode;
}[] = [
  {
    value: "today",
    label: "เพิ่มวันนี้",
    icon: <TodayIcon />,
  },
  {
    value: "7d",
    label: "7 วันที่ผ่านมา",
    icon: <AccessTimeIcon />,
  },
  {
    value: "30d",
    label: "30 วันที่ผ่านมา",
    icon: <HistoryIcon />,
  },
  {
    value: "older",
    label: "เก่ากว่า 30 วัน",
    icon: <EventBusyIcon />,
  },
];

function daysAgo(days: number) {
  const date = new Date();

  date.setDate(date.getDate() - days);

  return date;
}

/*
 * ต้องใช้เวลาในเขตเวลาท้องถิ่น ไม่ใช่ UTC
 * ไม่งั้นช่วงเวลาเช้าของไทยจะได้วันที่ของเมื่อวาน
 */
function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function bucketRange(bucket: DateBucket): DateRange {
  const now = new Date();

  if (bucket === "today") {
    const today = toDateInputValue(now);

    return { from: today, to: today };
  }

  if (bucket === "7d") {
    return {
      from: toDateInputValue(daysAgo(6)),
      to: toDateInputValue(now),
    };
  }

  if (bucket === "30d") {
    return {
      from: toDateInputValue(daysAgo(29)),
      to: toDateInputValue(now),
    };
  }

  /*
   * เก่ากว่า 30 วัน = ก่อนวันที่เริ่มช่วง 30 วัน
   */
  return {
    from: "",
    to: toDateInputValue(daysAgo(30)),
  };
}

const startOfDay = (value: string) =>
  new Date(`${value}T00:00:00`).getTime();

const endOfDay = (value: string) =>
  new Date(`${value}T23:59:59.999`).getTime();

/* =====================================================
   FILTER PILL
   ====================================================== */

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Chip
      size="small"
      label={label}
      onDelete={onRemove}
      deleteIcon={<CloseIcon fontSize="small" />}
      sx={{
        fontWeight: 700,
        fontSize: 11,
        height: 24,
        borderRadius: "7px",
        bgcolor: "#e8f1ff",
        color: "#1d4ed8",
        "& .MuiChip-deleteIcon": {
          color: "#1d4ed8",
        },
      }}
    />
  );
}

/* =====================================================
   FILTER PANEL (แบบ Trello)
   ====================================================== */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ px: 2, py: 1.25 }}>
      <Typography
        sx={{
          mb: 0.75,
          fontWeight: 800,
          fontSize: 13,
          color: "#1a2233",
        }}
      >
        {title}
      </Typography>

      <Stack spacing={0.25}>{children}</Stack>
    </Box>
  );
}

function FilterRow({
  checked,
  onChange,
  icon,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 0.5,
        py: 0.6,
        mx: -0.5,
        borderRadius: "8px",
        cursor: "pointer",
        "&:hover": { bgcolor: "#f4f6f9" },
      }}
    >
      <Checkbox
        size="small"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        sx={{ p: 0.5 }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: "50%",
          flexShrink: 0,
          bgcolor: "#eef1f6",
          color: "#64748b",
          "& svg": { fontSize: 16 },
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13.5,
            color: "#1a2233",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>

        {sub && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "#94a3b8",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* =====================================================
   CARD
   ====================================================== */

function PipelineCard({
  customer,
  dragging,
  onOpen,
}: {
  customer: Customer;
  dragging?: boolean;
  onOpen: (customer: Customer) => void;
}) {
  const assigned =
    customer.assignedUser?.name ?? null;

  return (
    <Card
      data-testid="pipeline-card"
      data-customer-id={customer.customerId}
      sx={{
        p: 1.75,
        borderRadius: "14px",
        border: "1px solid #e7ebf2",
        bgcolor: "#ffffff",
        boxShadow: dragging
          ? "0 18px 36px rgba(15,23,42,0.18)"
          : "0 1px 2px rgba(15,23,42,0.04)",
        cursor: "pointer",
        opacity: dragging ? 0.6 : 1,
        transition: "box-shadow 150ms ease",
        "&:hover": {
          borderColor: "#c7d2fe",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.08)",
        },
      }}
      onClick={() => onOpen(customer)}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
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

          <Box
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#64748b",
            }}
          >
            <PhoneIphoneIcon
              sx={{ fontSize: 13 }}
            />
            <Typography
              variant="caption"
              sx={{ fontSize: 12 }}
            >
              {customer.phone || "-"}
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 0.4,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#64748b",
            }}
          >
            <MailOutlineIcon
              sx={{ fontSize: 13 }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 190,
              }}
            >
              {customer.email || "-"}
            </Typography>
          </Box>
        </Box>

        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 12,
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
      </Box>

      <Divider sx={{ my: 1.25 }} />

      {(customer.purchaseCount ?? 0) > 0 && (
        <Box
          sx={{
            mb: 1.25,
            px: 0.85,
            py: 0.4,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            alignSelf: "flex-start",
            borderRadius: "7px",
            bgcolor: "#16a34a14",
            color: "#16a34a",
          }}
        >
          <ReceiptLongIcon sx={{ fontSize: 13 }} />

          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              color: "#16a34a",
            }}
          >
            ซื้อแล้ว {customer.purchaseCount}{" "}
            ครั้ง
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#94a3b8" }}
        >
{assigned ?? "ไม่ระบุผู้รับผิดชอบ"}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: "#94a3b8" }}
        >
          {formatDate(customer.createdAt)}
        </Typography>
      </Box>
    </Card>
  );
}

function SortableCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: (customer: Customer) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: customer.customerId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform,
        ),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <PipelineCard
        customer={customer}
        dragging={isDragging}
        onOpen={onOpen}
      />
    </div>
  );
}

const CARD_HEIGHT = 128;
const CARD_GAP = 10;

function Column({
  stage,
  index,
  customers,
  onOpen,
}: {
  stage: PipelineStage;
  index: number;
  customers: Customer[];
  onOpen: (customer: Customer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.stageKey,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5,
  });

  return (
    <Box
      data-testid="pipeline-column"
      data-status={stage.stageKey}
      sx={{
        width: 272,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 150px)",
        bgcolor: isOver
          ? "#eff6ff"
          : "transparent",
        borderRadius: "14px",
        transition: "background 150ms ease",
      }}
    >
      <Box
        sx={{
          mb: 1.25,
          px: 1.25,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "#ffffff",
          border: "1px solid #e7ebf2",
          borderRadius: "12px",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            bgcolor: stage.color,
            flexShrink: 0,
          }}
        />

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: "#172033",
            flex: 1,
            minWidth: 0,
          }}
        >
          {stage.label}
        </Typography>

        <Box
          sx={{
            minWidth: 22,
            height: 20,
            px: 0.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            bgcolor: countTint(index),
            fontSize: 11,
            fontWeight: 800,
            color: "#475569",
          }}
        >
          {customers.length}
        </Box>
      </Box>

      <Box
        ref={(node: HTMLDivElement | null) => {
          setNodeRef(node);
          scrollRef.current = node;
        }}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          pb: 1,
          pr: 0.5,
        }}
      >
        <SortableContext
          items={customers.map(
            (customer) => customer.customerId,
          )}
          strategy={verticalListSortingStrategy}
        >
          <Box
            sx={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer
              .getVirtualItems()
              .map((virtualItem) => {
                const customer =
                  customers[virtualItem.index];

                return (
                  <Box
                    key={customer.customerId}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <SortableCard
                      customer={customer}
                      onOpen={onOpen}
                    />
                  </Box>
                );
              })}
          </Box>
        </SortableContext>

        {customers.length === 0 && (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: "center",
              border: "1px dashed #d7dee8",
              borderRadius: "12px",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94a3b8" }}
            >
              ยังไม่มีลูกค้า
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* =====================================================
   PAGE
   ====================================================== */

export default function SalesPipelinePage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [customers, setCustomers] = useState<
    Customer[]
  >([]);
  const [stages, setStages] = useState<
    PipelineStage[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [salesFilter, setSalesFilter] = useState<
    number[]
  >([]);
  const [statusFilter, setStatusFilter] = useState<
    string[]
  >([]);
  const [dateBucket, setDateBucket] =
    useState<DateBucket | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterAnchor, setFilterAnchor] =
    useState<HTMLElement | null>(null);

  const [activeId, setActiveId] =
    useState<Customer | null>(null);
  const [dragging, setDragging] =
    useState<Customer | null>(null);
  const [notice, setNotice] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);

    try {
      const [customersRes, stagesRes] =
        await Promise.all([
          api.get<Customer[]>("/customers"),
          api.get<PipelineStage[]>(
            "/pipeline-stages",
          ),
        ]);

      setCustomers(customersRes.data);
      setStages(stagesRes.data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    void Promise.resolve().then(() => loadCustomers());
  }, [ready, user, router, loadCustomers]);

  /*
   * รายการ Sales ที่มีอยู่จริงในบอร์ด
   * พร้อมนับจำนวนลูกค้า และรวมคนที่ยังไม่ได้ระบุผู้รับผิดชอบ
   */
  const salesOptions = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; count: number }
    >();

    let unassigned = 0;

    for (const customer of customers) {
      if (!customer.assignedId) {
        unassigned += 1;
        continue;
      }

      const existing = map.get(
        customer.assignedId,
      );

      if (existing) {
        existing.count += 1;
        continue;
      }

      map.set(customer.assignedId, {
        id: customer.assignedId,
        name:
          customer.assignedUser?.name ??
          `Sales #${customer.assignedId}`,
        count: 1,
      });
    }

    const options = [...map.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name, "th"),
    );

    if (unassigned > 0) {
      options.push({
        id: UNASSIGNED,
        name: "ยังไม่ระบุผู้รับผิดชอบ",
        count: unassigned,
      });
    }

    return options;
  }, [customers]);

  const salesNameById = useMemo(() => {
    const map = new Map<number, string>();

    for (const item of salesOptions) {
      map.set(item.id, item.name);
    }

    return map;
  }, [salesOptions]);

  const stageLabelByKey = useMemo(() => {
    const map = new Map<string, string>();

    for (const stage of stages) {
      map.set(stage.stageKey, stage.label);
    }

    return map;
  }, [stages]);

  const hasFilter =
    search.trim().length > 0 ||
    salesFilter.length > 0 ||
    statusFilter.length > 0 ||
    dateFrom !== "" ||
    dateTo !== "";

  /*
   * ช่วงเวลาที่ใช้จริง
   * ถ้ากรอกวันที่เองจะมีผลเหนือการเลือกช่วงเวลาสำเร็จ
   */
  const activeRange = useMemo<DateRange>(() => {
    if (dateFrom !== "" || dateTo !== "") {
      return { from: dateFrom, to: dateTo };
    }

    if (dateBucket === "") {
      return { from: "", to: "" };
    }

    return bucketRange(dateBucket);
  }, [dateBucket, dateFrom, dateTo]);

  const dateFilterOn =
    dateBucket !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const dateRangeLabel =
    dateFrom !== "" || dateTo !== ""
      ? `วันที่ ${dateFrom || "…"} → ${dateTo || "…"}`
      : dateBucket !== ""
        ? DATE_BUCKET_LABELS[dateBucket]
        : "";

  const filterCount =
    salesFilter.length +
    statusFilter.length +
    (dateFilterOn ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setSalesFilter([]);
    setStatusFilter([]);
    setDateBucket("");
    setDateFrom("");
    setDateTo("");
  }

  function toggleSales(id: number) {
    setSalesFilter((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleStatus(key: string) {
    setStatusFilter((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  const byColumn = useMemo(() => {
    const query = search.trim().toLowerCase();

    const from =
      activeRange.from === ""
        ? null
        : startOfDay(activeRange.from);
    const to =
      activeRange.to === ""
        ? null
        : endOfDay(activeRange.to);

    const matched = customers.filter(
      (customer) => {
        if (
          query.length > 0 &&
          ![
            customer.companyName,
            customer.email,
            customer.phone,
            customer.assignedUser?.name,
          ].some((value) =>
            (value ?? "")
              .toLowerCase()
              .includes(query),
          )
        ) {
          return false;
        }

        if (
          salesFilter.length > 0 &&
          !salesFilter.includes(
            customer.assignedId ?? UNASSIGNED,
          )
        ) {
          return false;
        }

        if (
          statusFilter.length > 0 &&
          !statusFilter.includes(
            customer.status,
          )
        ) {
          return false;
        }

        if (from !== null || to !== null) {
          const created = new Date(
            customer.createdAt,
          ).getTime();

          if (from !== null && created < from) {
            return false;
          }

          if (to !== null && created > to) {
            return false;
          }
        }

        return true;
      },
    );

    const grouped: Record<
      string,
      Customer[]
    > = {};

    for (const stage of stages) {
      grouped[stage.stageKey] = matched.filter(
        (customer) =>
          customer.status === stage.stageKey,
      );
    }

    return grouped;
  }, [
    customers,
    stages,
    search,
    salesFilter,
    statusFilter,
    activeRange,
  ]);

  async function persistStatus(
    customerId: number,
    status: string,
  ) {
    const previous = customers;

    setCustomers((current) =>
      current.map((customer) =>
        customer.customerId === customerId
          ? { ...customer, status }
          : customer,
      ),
    );

    try {
      await api.patch(`/customers/${customerId}`, {
        status,
      });

setNotice("อัปเดตสถานะใน Pipeline แล้ว");
    } catch (err) {
      setCustomers(previous);

      setNotice(
        getErrorMessage(
          err,
"ไม่พบลูกค้าที่ตรงกับคำค้นหานี้",
        ),
      );
    }
  }

  function handleDragStart(
    event: {
      active: { id: number | string };
    },
  ) {
    const id = Number(event.active.id);

    setDragging(
      customers.find(
        (customer) => customer.customerId === id,
      ) ?? null,
    );
  }

  function handleDragEnd(
    event: {
      active: { id: number | string };
      over: { id: number | string } | null;
    },
  ) {
    setDragging(null);

    if (!event.over) {
      return;
    }

    const customerId = Number(event.active.id);
    const targetStatus = String(event.over.id);

    const isStage = stages.some(
      (stage) => stage.stageKey === targetStatus,
    );

    if (!isStage) {
      return;
    }

    const customer = customers.find(
      (item) => item.customerId === customerId,
    );

    if (!customer || customer.status === targetStatus) {
      return;
    }

    void persistStatus(customerId, targetStatus);
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f7fa",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const fallbackPermissions: Permissions =
    permissions ?? {
      dashboard: true,
      customers: true,
      salesPipeline: true,
      documents: true,
      reports: true,
      administration: user.role === "ADMIN",
      permissions: user.role === "ADMIN",
      auditLogs: user.role === "ADMIN",
    };

  const totalVisible = stages.reduce(
    (sum, stage) =>
      sum + (byColumn[stage.stageKey]?.length ?? 0),
    0,
  );

  /*
   * ระหว่างกรอง แสดงเฉพาะคอลัมน์ที่มีผลลัพธ์
   * ถ้าไม่เจอเลย แสดงข้อความว่าไม่พบผลลัพธ์
   */
  const visibleStages = hasFilter
    ? stages.filter(
        (stage) =>
          (byColumn[stage.stageKey]?.length ?? 0) > 0,
      )
    : stages;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f6f8fb",
      }}
    >
      <DashboardSidebar
        user={user}
        permissions={fallbackPermissions}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
        }}
      >
        {/* ---- header ---- */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: 1.2,
                color: "#2563eb",
              }}
            >
              SALES PIPELINE
            </Typography>

            <Typography
              component="h1"
              variant="h4"
              sx={{
                mt: 0.5,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              บอร์ดติดตามลูกค้า
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              ลากการ์ดเพื่อเปลี่ยนสถานะ
              คลิกการ์ดเพื่อดูรายละเอียดและ
              เอกสารของลูกค้า
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<FilterAltIcon />}
              onClick={(event) =>
                setFilterAnchor(
                  event.currentTarget,
                )
              }
              data-testid="pipeline-filter-button"
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
                borderColor: "#bfdbfe",
                borderRadius: 2,
                bgcolor: "#ffffff",
                "&:hover": {
                  bgcolor: "#eff6ff",
                  borderColor: "#93c5fd",
                },
              }}
            >
              ตัวกรอง
            </Button>

            <Typography
              variant="body2"
              sx={{ color: "#64748b" }}
            >
              แสดง {totalVisible} จาก{" "}
              {customers.length} ราย
            </Typography>

            {hasFilter && (
              <Button
                size="small"
                onClick={resetFilters}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#64748b",
                  minWidth: 0,
                  px: 1,
                }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Stack>
        </Box>

        {/* ---- active filter pills ---- */}
        {(search.trim().length > 0 ||
          filterCount > 0) && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              mb: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {search.trim().length > 0 && (
              <FilterPill
                label={`คำค้น: ${search.trim()}`}
                onRemove={() => setSearch("")}
              />
            )}

            {salesFilter.map((id) => (
              <FilterPill
                key={`sales-${id}`}
                label={
                  salesNameById.get(id) ??
                  `Sales #${id}`
                }
                onRemove={() => toggleSales(id)}
              />
            ))}

            {statusFilter.map((key) => (
              <FilterPill
                key={`status-${key}`}
                label={stageLabelByKey.get(key) ?? key}
                onRemove={() => toggleStatus(key)}
              />
            ))}

            {dateFilterOn && (
              <FilterPill
                label={dateRangeLabel}
                onRemove={() => {
                  setDateBucket("");
                  setDateFrom("");
                  setDateTo("");
                }}
              />
            )}
          </Stack>
        )}

        {/* ---- filter panel (Trello style) ---- */}
        <Popover
          open={Boolean(filterAnchor)}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          slotProps={{
            paper: {
              sx: {
                width: 340,
                maxWidth: "calc(100vw - 32px)",
                mt: 1,
                borderRadius: "14px",
                boxShadow:
                  "0 12px 32px rgba(15,23,42,0.18)",
              },
            },
          }}
        >
          <Box
            data-testid="pipeline-filter-panel"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 16,
                color: "#1a2233",
              }}
            >
              Filter
            </Typography>

            <IconButton
              size="small"
              aria-label="ปิดตัวกรอง"
              onClick={() =>
                setFilterAnchor(null)
              }
              sx={{ color: "#64748b" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider />

          {/* ---- keyword ---- */}
          <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
            <Typography
              sx={{
                mb: 0.75,
                fontWeight: 800,
                fontSize: 13,
                color: "#1a2233",
              }}
            >
              คำค้น (Keyword)
            </Typography>

            <TextField
              fullWidth
              size="small"
              autoFocus
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ค้นหาบริษัท อีเมล เบอร์..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.75,
                color: "#94a3b8",
              }}
            >
              ค้นหาลูกค้า ชื่อบริษัท อีเมล
              เบอร์โทร และชื่อ Sales
            </Typography>
          </Box>

          {/* ---- members ---- */}
          <FilterSection title="Sales ผู้รับผิดชอบ (Members)">
            {salesOptions.map((item) => (
              <FilterRow
                key={item.id}
                checked={salesFilter.includes(item.id)}
                onChange={(next) => {
                  if (next) {
                    setSalesFilter((current) =>
                      current.includes(item.id)
                        ? current
                        : [...current, item.id],
                    );
                  } else {
                    toggleSales(item.id);
                  }
                }}
                icon={
                  item.id === UNASSIGNED ? (
                    <PersonOffIcon />
                  ) : (
                    <PersonIcon />
                  )
                }
                label={item.name}
                sub={`${item.count} ราย`}
              />
            ))}
          </FilterSection>

          <Divider />

          {/* ---- card status ---- */}
          <FilterSection title="สถานะการ์ด (Card status)">
            {stages.map((stage) => (
              <FilterRow
                key={stage.stageKey}
                checked={statusFilter.includes(
                  stage.stageKey,
                )}
                onChange={(next) => {
                  if (next) {
                    setStatusFilter((current) =>
                      current.includes(stage.stageKey)
                        ? current
                        : [...current, stage.stageKey],
                    );
                  } else {
                    toggleStatus(stage.stageKey);
                  }
                }}
                icon={
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: stage.color,
                    }}
                  />
                }
                label={stage.label}
                sub={`${
                  byColumn[stage.stageKey]?.length ?? 0
                } รายในคอลัมน์นี้`}
              />
            ))}
          </FilterSection>

          <Divider />

          {/* ---- due date ---- */}
          <FilterSection title="วันที่เพิ่มลูกค้า (Due date)">
            {DATE_BUCKETS.map((bucket) => (
              <FilterRow
                key={bucket.value}
                checked={dateBucket === bucket.value}
                onChange={(next) => {
                  /*
                   * ช่วงเวลาเลือกได้ครั้งเดียว
                   * ถ้าเลือกช่วงใหม่ให้ล้างช่วงเดิม
                   */
                  setDateBucket(
                    next ? bucket.value : "",
                  );

                  setDateFrom("");
                  setDateTo("");
                }}
                icon={bucket.icon}
                label={bucket.label}
              />
            ))}

            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, px: 0.5 }}
            >
              <TextField
                fullWidth
                size="small"
                type="date"
                label="ตั้งแต่"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setDateBucket("");
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                type="date"
                label="ถึง"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setDateBucket("");
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />
            </Stack>
          </FilterSection>

          <Divider />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              px: 2,
              py: 1.5,
            }}
          >
            <Button
              size="small"
              disabled={!hasFilter}
              onClick={resetFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              ล้างตัวกรอง
            </Button>

            <Button
              size="small"
              variant="contained"
              onClick={() =>
                setFilterAnchor(null)
              }
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "8px",
                bgcolor: "#0f62fe",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#0353e9",
                  boxShadow: "none",
                },
              }}
            >
              ดู {totalVisible} ราย
            </Button>
          </Box>
        </Popover>

        {/* ---- board ---- */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              pb: 2,
            }}
          >
            {stages.map((stage) => (
              <Box
                key={stage.stageKey}
                sx={{ width: 272, flexShrink: 0 }}
              >
                <Skeleton
                  height={44}
                  sx={{
                    mb: 1.25,
                    borderRadius: "12px",
                  }}
                />

                <Stack
                  spacing={1.25}
                >
                  {[0, 1, 2].map((row) => (
                    <Skeleton
                      key={row}
                      height={128}
                      sx={{
                        borderRadius: "14px",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        ) : customers.length === 0 ? (
          <Card
            sx={{
              py: 8,
              textAlign: "center",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
            }}
          >
            <SearchOffIcon
              sx={{
                fontSize: 40,
                color: "#cbd5e1",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontWeight: 800,
                color: "#172033",
              }}
            >
ยังไม่มีลูกค้าในระบบ
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
เพิ่มลูกค้าได้ที่หน้า Customers
            </Typography>
          </Card>
        ) : hasFilter && totalVisible === 0 ? (
          <Card
            sx={{
              py: 8,
              textAlign: "center",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
            }}
          >
            <SearchOffIcon
              sx={{
                fontSize: 40,
                color: "#cbd5e1",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontWeight: 800,
                color: "#172033",
              }}
            >
ไม่พบผลลัพธ์
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
              ไม่พบลูกค้าที่ตรงกับตัวกรองที่เลือก
            </Typography>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() =>
              setDragging(null)
            }
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                pb: 2,
                alignItems: "flex-start",
              }}
            >
              {visibleStages.map((stage) => (
                <Column
                  key={stage.stageId}
                  stage={stage}
                  index={
                    stages.findIndex(
                      (item) =>
                        item.stageId ===
                        stage.stageId,
                    )
                  }
                  customers={
                    byColumn[stage.stageKey] ?? []
                  }
                  onOpen={(target) =>
                    setActiveId(target)
                  }
                />
              ))}
            </Box>

            <DragOverlay>
              {dragging ? (
                <Box sx={{ width: 272 }}>
                  <PipelineCard
                    customer={dragging}
                    dragging
                    onOpen={() => undefined}
                  />
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </Box>

      {activeId && (
        <CustomerDetailDialog
          customer={activeId}
          stages={stages}
          onClose={() => setActiveId(null)}
        />
      )}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}