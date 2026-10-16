"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";

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
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";

import SearchOffIcon from "@mui/icons-material/SearchOff";
import TodayIcon from "@mui/icons-material/Today";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type {
  Active,
  CollisionDetection,
  Over,
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
import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import type {
  Customer,
  PipelineStage,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

import { useTranslations } from "next-intl";





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
   CARD
   ====================================================== */

function PipelineCard({
  customer,
  dragging,
  ghost,
  onOpen,
}: {
  customer: Customer;
  dragging?: boolean;
  ghost?: boolean;
  onOpen: (customer: Customer) => void;
}) {
  const t = useTranslations("salesPipeline");

  const assigned =
    customer.assignedUser?.name ?? null;

  return (
    <Card
      data-testid="pipeline-card"
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: "#0f172a",
            fontSize: 14,
            lineHeight: 1.35,
            wordBreak: "break-word",
            flex: 1,
            minWidth: 0,
          }}
        >
          {customer.companyName}
        </Typography>

      </Box>

      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "#64748b",
        }}
      >
        <PhoneIphoneIcon sx={{ fontSize: 13 }} />
        <Typography variant="caption" sx={{ fontSize: 12 }}>
          {customer.phone || "-"}
        </Typography>
      </Box>

      <Box
        sx={{
          mt: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "#64748b",
        }}
      >
        <MailOutlineIcon sx={{ fontSize: 13 }} />
        <Typography
          variant="caption"
          sx={{
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
        >
          {customer.email || "-"}
        </Typography>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box
        sx={{
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
              bgcolor: assigned ? "#e8f1ff" : "#eef1f6",
              color: assigned ? "#1d4ed8" : "#94a3b8",
              flexShrink: 0,
            }}
          >
            {assigned ? initials(assigned) : "?"}
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
            {assigned ?? t("unassigned")}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "#94a3b8", flexShrink: 0 }}
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
        // ไม่ต้องมี transition ตอน-active drag เพราะ dnd-kit คุม transform เอง
        transition: isDragging
          ? undefined
          : transition ||
            "transform 150ms cubic-bezier(0.2, 1, 0.3, 1), opacity 150ms ease",
        willChange: "transform",
      }}
      {...attributes}
      {...listeners}
    >
      <PipelineCard
        customer={customer}
        ghost={isDragging}
        onOpen={onOpen}
      />
    </div>
  );
}

const MemoSortableCard = memo(SortableCard);

/*
 * collision detection สำหรับ Kanban:
 * - ถ้า cursor อยู่ใน target จริง ให้ใช้อันนั้นก่อน (ลื่นสุด ตามตำแหน่งเมาส์)
 * - ถ้าไม่มี ค่อย fallback เป็นระยะ/recently intersection
 * - สุดท้าย closestCorners กันพ零部件ตอน header/empty state
 */
const kanbanCollision: CollisionDetection = (
  args,
) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const rectCollisions = rectIntersection(args);

  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  return closestCorners(args);
};

const CARD_HEIGHT = 148;
const CARD_GAP = 1.25;

function Column({
  stage,
  customers,
  onOpen,
}: {
  stage: PipelineStage;
  customers: Customer[];
  onOpen: (customer: Customer) => void;
}) {
  const t = useTranslations("salesPipeline");

  const { setNodeRef, isOver } = useDroppable({
    id: stage.stageKey,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual ไม่สามารถ memoize ได้ แต่ Column ไม่ถูกส่งต่อไปยัง component ที่ memoize
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
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 140px)",
        bgcolor: isOver
          ? "#eff6ff"
          : "#ffffff",
        border: "1px solid #e7ebf2",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        transition: "background 150ms ease",
      }}
    >
      <Box
        sx={{
          mb: 1,
          px: 1.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
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
            bgcolor: "#f1f5f9",
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
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
            width: 0,
            height: 0,
          },
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
                      /*
                       * ต้องเป็น paddingBottom ไม่ใช่ marginBottom
                       * เพราะ measureElement อ่าน border-box (รวม padding ไม่รวม margin)
                       * ใช้ margin แล้ว gap จะไม่นับเข้า item size การ์ดตัวถัดมาจะมาซ้อนทับ
                       */
                      paddingBottom: CARD_GAP,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <MemoSortableCard
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
              {t("noCustomers")}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

const MemoColumn = memo(Column);

/* =====================================================
   PAGE
   ====================================================== */

export default function SalesPipelinePage() {
  const t = useTranslations("salesPipeline");


  const DATE_BUCKETS: {
    value: DateBucket;
    label: string;
    icon: ReactNode;
  }[] = [
    {
      value: "today",
      label: t("dateBuckets.today"),
      icon: <TodayIcon />,
    },
    {
      value: "7d",
      label: t("dateBuckets.7d"),
      icon: <AccessTimeIcon />,
    },
    {
      value: "30d",
      label: t("dateBuckets.30d"),
      icon: <HistoryIcon />,
    },
    {
      value: "older",
      label: t("dateBuckets.older"),
      icon: <EventBusyIcon />,
    },
  ];

  const { user, permissions, ready } = useSession();

  const {
    data: customersData,
    isLoading: loading,
    mutate: reloadCustomers,
  } = useApi<{ data: Customer[]; total: number }>(
    ready && user ? "/api/customers?limit=100" : null,
  );
  const { data: stagesData } = useApi<PipelineStage[]>(
    ready && user ? "/api/pipeline-stages" : null,
  );

  const customers = useMemo(
    () => customersData?.data ?? [],
    [customersData],
  );
  const stages = useMemo(
    () => stagesData ?? [],
    [stagesData],
  );
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

  /*
   * เก็บสถานะตั้งต้นของ card ที่ลากอยู่ ตอน drag ระหว่างคอลัมน์
   * ถ้า drop ไม่สำเร็จหรือ cancel ต้องเอากลับเป็นค่าเดิม
   */
  const dragOriginStatus = useRef<string | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

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
        name: t("unassigned"),
        count: unassigned,
      });
    }

    return options;
  }, [customers, t]);

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

  /*
   * อัปเดต status ใน SWR cache ทันทีโดยไม่ดึงข้อมูลใหม่
   * ใช้ระหว่างลาก (drag-over preview) และตอนปล่อย (drop) ให้รู้สึกไม่มีกระตุก
   */
  function patchCustomerStatus(
    customerId: number,
    status: string,
  ) {
    void reloadCustomers(
      (current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) =>
                item.customerId === customerId
                  ? { ...item, status }
                  : item,
              ),
            }
          : current,
      { revalidate: false },
    );
  }

  /*
   * เปลี่ยนสถานะผ่าน API แล้ว refetch ข้อมูลจริงกลับมา
   * ถ้าล้มเหลว refetch ทันทีเพื่อยกเลิก optimistic update ที่ค้างอยู่
   */
  const persistStatus = useCallback(
    async (
      customerId: number,
      status: string,
    ) => {
      try {
        await api.patch(
          `/api/customers/${customerId}`,
          {
            status,
          },
        );

        setNotice(t("statusUpdated"));
        await reloadCustomers();
      } catch (err) {
        setNotice(
          getErrorMessage(
            err,
            t("statusUpdateError"),
          ),
        );

        await reloadCustomers();
      }
    },
    [t, reloadCustomers],
  );

  /*
   * ลากไปวางบน card คนอื่นได้ด้วย ต้องหาว่า card นั้นอยู่คอลัมน์ไหน
   * เพราะการปล่อยบนตัวการ์ดถือว่าอยากให้เข้าแถวเดียวกันกับคนนั้น
   */
  function resolveTargetStatus(
    overId: number | string,
  ): string | null {
    const asStage = String(overId);

    if (
      stages.some(
        (stage) => stage.stageKey === asStage,
      )
    ) {
      return asStage;
    }

    const numeric = Number(overId);

    if (Number.isNaN(numeric)) {
      return null;
    }

    const overCustomer = customers.find(
      (item) => item.customerId === numeric,
    );

    return overCustomer?.status ?? null;
  }

  function handleDragStart(
    event: {
      active: Active;
    },
  ) {
    const id = Number(event.active.id);

    const customer = customers.find(
      (item) => item.customerId === id,
    );

    dragOriginStatus.current =
      customer?.status ?? null;

    setDragging(customer ?? null);
  }

  const handleOpenCustomer = useCallback(
    (customer: Customer) => {
      setActiveId(customer);
    },
    [],
  );

  /*
   * สำคัญที่สุดของความ "ลื่น": ขณะลากผ่านคอลัมน์อื่น
   * ให้ย้าย card ไปอยู่ใน target column ทันที (optimistic)
   * ตอนปล่อย card จึงอยู่ที่ถูกที่แล้ว ไม่ต้องโดนดึงข้อมูลใหม่แล้ววาร์ป
   */
  function handleDragOver(
    event: {
      active: Active;
      over: Over | null;
    },
  ) {
    const activeId = Number(event.active.id);

    if (!event.over || Number.isNaN(activeId)) {
      return;
    }

    const targetStatus = resolveTargetStatus(
      event.over.id,
    );

    if (!targetStatus) {
      return;
    }

    const activeCustomer = customers.find(
      (item) => item.customerId === activeId,
    );

    if (
      !activeCustomer ||
      activeCustomer.status === targetStatus
    ) {
      return;
    }

    patchCustomerStatus(
      activeCustomer.customerId,
      targetStatus,
    );

    setDragging((prev) =>
      prev
        ? { ...prev, status: targetStatus }
        : prev,
    );
  }

  function handleDragEnd(
    event: {
      active: Active;
      over: Over | null;
    },
  ) {
    const activeId = Number(event.active.id);

    setDragging(null);

    const originStatus = dragOriginStatus.current;

    dragOriginStatus.current = null;

    if (!event.over || Number.isNaN(activeId)) {
      // ปล่อยนอกพื้นที่ที่ยอมรับได้ -> เอากลับคอลัมน์เดิมทันที
      if (originStatus !== null) {
        patchCustomerStatus(
          activeId,
          originStatus,
        );
      }

      return;
    }

    const targetStatus = resolveTargetStatus(
      event.over.id,
    );

    if (!targetStatus) {
      return;
    }

    /*
     * เทียบกับสถานะต้นทาง ไม่ใช่สถานะปัจจุบัน
     * เพราะอาจถูกล่วงระหว่าง drag-over แล้ว ถ้าเทียบกับสถานะปัจจุบันจะไม่ยิง API
     */
    if (!originStatus || originStatus === targetStatus) {
      return;
    }

    patchCustomerStatus(activeId, targetStatus);

    void persistStatus(activeId, targetStatus);
  }

  function handleDragCancel() {
    const activeId = dragging?.customerId;
    const originStatus = dragOriginStatus.current;

    setDragging(null);

    dragOriginStatus.current = null;

    if (!activeId || originStatus === null) {
      return;
    }

    patchCustomerStatus(activeId, originStatus);
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

  const _fallbackPermissions: Permissions =
    permissions ?? {
      dashboard: true,
      customers: true,
      salesPipeline: true,
      documents: true,
      reports: true,
      administration: user?.role === "ADMIN",
      permissions: user?.role === "ADMIN",
      auditLogs: user?.role === "ADMIN",
    };

  const totalVisible = stages.reduce(
    (sum, stage) =>
      sum + (byColumn[stage.stageKey]?.length ?? 0),
    0,
  );

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        bgcolor: "#f6f8fb",
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          overflowX: "hidden",
          overflowY: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ---- header ---- */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#172033",
              lineHeight: 1.2,
            }}
          >
            {t("subtitle")}
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#64748b" }}
            >
              {t("showing")} {totalVisible} {t("of")}{" "}
              {customers.length} {t("entries")}
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
                {t("clearFilters")}
              </Button>
            )}
          </Stack>
        </Box>

        {/* ---- filter row ---- */}
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            mb: 2.5,
            alignItems: "center",
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={t("keywordPlaceholder")}
            sx={{
              flex: { xs: "1 1 100%", sm: "0 1 240px" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "#ffffff",
              },
            }}
          />

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
              borderRadius: "8px",
              color: "#2563eb",
              borderColor: "#bfdbfe",
              bgcolor: "#ffffff",
              flexShrink: 0,
              "&:hover": {
                bgcolor: "#eff6ff",
                borderColor: "#93c5fd",
              },
            }}
          >
            {t("filter")}
            {hasFilter && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: "10px",
                  bgcolor: "#ffffff",
                  color: "#026aa7",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {filterCount + (search.trim().length > 0 ? 1 : 0)}
              </Box>
            )}
          </Button>
        </Stack>

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
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                mt: 1,
                borderRadius: "8px",
                boxShadow:
                  "0 8px 24px rgba(9,30,66,0.25)",
                overflow: "hidden",
              },
            },
          }}
        >
          <Box
            data-testid="pipeline-filter-panel"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              px: 2,
              py: 1.5,
              bgcolor: "#fafbfc",
              borderBottom: "1px solid #dfe1e6",
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: "#172b4d",
              }}
            >
              {t("filterTitle")}
            </Typography>

            <IconButton
              size="small"
              aria-label={t("clearFiltersAria")}
              onClick={() =>
                setFilterAnchor(null)
              }
              sx={{
                position: "absolute",
                right: 8,
                color: "#6b778c",
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* ---- keyword ---- */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Typography
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14,
                color: "#172b4d",
              }}
            >
              {t("keyword")}
            </Typography>

            <TextField
              fullWidth
              size="small"
              autoFocus
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Enter a keyword..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  bgcolor: "#fafbfc",
                  "&:hover": {
                    bgcolor: "#ebecf0",
                  },
                  "&.Mui-focused": {
                    bgcolor: "#ffffff",
                    borderColor: "#0079bf",
                    boxShadow: "0 0 0 1px #0079bf",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  py: 1.25,
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.75,
                color: "#6b778c",
                fontSize: 12,
              }}
            >
              Search cards, members, labels, and more.
            </Typography>
          </Box>

          {/* ---- members ---- */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Typography
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14,
                color: "#172b4d",
              }}
            >
              {t("members")}
            </Typography>

            {salesOptions.map((item) => (
              <Box
                key={item.id}
                onClick={() => {
                  if (
                    salesFilter.includes(item.id)
                  ) {
                    toggleSales(item.id);
                  } else {
                    setSalesFilter((current) =>
                      current.includes(item.id)
                        ? current
                        : [...current, item.id],
                    );
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.5,
                  cursor: "pointer",
                  borderRadius: "4px",
                  "&:hover": {
                    bgcolor: "#ebecf0",
                  },
                }}
              >
                <Checkbox
                  checked={salesFilter.includes(item.id)}
                  size="small"
                  sx={{
                    p: 0,
                    color: "#6b778c",
                    "&.Mui-checked": {
                      color: "#0079bf",
                    },
                  }}
                />

                {item.id === UNASSIGNED ? (
                  <PersonOffIcon
                    sx={{
                      fontSize: 20,
                      color: "#6b778c",
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: "#0079bf",
                      color: "#ffffff",
                    }}
                  >
                    {initials(item.name)}
                  </Avatar>
                )}

                <Typography
                  sx={{
                    fontSize: 14,
                    color: "#172b4d",
                  }}
                >
                  {item.name}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* ---- card status ---- */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Typography
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14,
                color: "#172b4d",
              }}
            >
              {t("cardStatus")}
            </Typography>

            {stages.map((stage) => (
              <Box
                key={stage.stageKey}
                onClick={() => {
                  if (
                    statusFilter.includes(stage.stageKey)
                  ) {
                    toggleStatus(stage.stageKey);
                  } else {
                    setStatusFilter((current) =>
                      current.includes(stage.stageKey)
                        ? current
                        : [...current, stage.stageKey],
                    );
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.5,
                  cursor: "pointer",
                  borderRadius: "4px",
                  "&:hover": {
                    bgcolor: "#ebecf0",
                  },
                }}
              >
                <Checkbox
                  checked={statusFilter.includes(
                    stage.stageKey,
                  )}
                  size="small"
                  sx={{
                    p: 0,
                    color: "#6b778c",
                    "&.Mui-checked": {
                      color: "#0079bf",
                    },
                  }}
                />

                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    bgcolor: stage.color,
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 14,
                    color: "#172b4d",
                  }}
                >
                  {stage.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* ---- due date ---- */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1.5 }}>
            <Typography
              sx={{
                mb: 0.75,
                fontWeight: 600,
                fontSize: 14,
                color: "#172b4d",
              }}
            >
              {t("dueDate")}
            </Typography>

            {DATE_BUCKETS.map((bucket) => (
              <Box
                key={bucket.value}
                onClick={() => {
                  setDateBucket(
                    dateBucket === bucket.value
                      ? ""
                      : bucket.value,
                  );
                  setDateFrom("");
                  setDateTo("");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.5,
                  cursor: "pointer",
                  borderRadius: "4px",
                  "&:hover": {
                    bgcolor: "#ebecf0",
                  },
                }}
              >
                <Checkbox
                  checked={dateBucket === bucket.value}
                  size="small"
                  sx={{
                    p: 0,
                    color: "#6b778c",
                    "&.Mui-checked": {
                      color: "#0079bf",
                    },
                  }}
                />

                {bucket.icon}

                <Typography
                  sx={{
                    fontSize: 14,
                    color: "#172b4d",
                  }}
                >
                  {bucket.label}
                </Typography>
              </Box>
            ))}

            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, pl: 9.5 }}
            >
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t("from")}
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
                    borderRadius: "4px",
                    bgcolor: "#fafbfc",
                    "&.Mui-focused": {
                      bgcolor: "#ffffff",
                      borderColor: "#0079bf",
                      boxShadow: "0 0 0 1px #0079bf",
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                type="date"
                label={t("to")}
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
                    borderRadius: "4px",
                    bgcolor: "#fafbfc",
                    "&.Mui-focused": {
                      bgcolor: "#ffffff",
                      borderColor: "#0079bf",
                      boxShadow: "0 0 0 1px #0079bf",
                    },
                  },
                }}
              />
            </Stack>
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
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
                width: 0,
                height: 0,
              },
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
              {t("noCustomers")}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
              {t("noCustomersHint")}
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
              {t("noResults")}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
              {t("noResultsHint")}
            </Typography>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollision}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                pb: 2,
                alignItems: "flex-start",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                  width: 0,
                  height: 0,
                },
              }}
            >
              {stages.map((stage) => (
                <MemoColumn
                  key={stage.stageId}
                  stage={stage}
                  customers={
                    byColumn[stage.stageKey] ?? []
                  }
                  onOpen={handleOpenCustomer}
                />
              ))}
            </Box>

            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
              {dragging ? (
                <Box
                  sx={{
                    width: 280,
                    transform: "rotate(3deg)",
                    cursor: "grabbing",
                    "& > *": {
                      pointerEvents: "none",
                    },
                  }}
                >
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
          onMove={persistStatus}
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
