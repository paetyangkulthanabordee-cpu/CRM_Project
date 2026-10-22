"use client";

import {
  useCallback,
  useMemo,
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

import AddIcon from "@mui/icons-material/Add";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import TodayIcon from "@mui/icons-material/Today";

import AddCardDialog from "@/components/AddCardDialog";
import CustomersKanbanBoard from "@/components/CustomersKanbanBoard";
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
  const [notice, setNotice] = useState("");
  const [addCardOpen, setAddCardOpen] = useState(false);

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

  /*
   * ลูกค้าที่ผ่านตัวกรองแล้ว
   * (การจัดกลุ่มเป็นคอลัมน์ทำในบอร์ดให้เอง)
   */
  const boardCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const from =
      activeRange.from === ""
        ? null
        : startOfDay(activeRange.from);
    const to =
      activeRange.to === ""
        ? null
        : endOfDay(activeRange.to);

    return customers.filter(
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
  }, [
    customers,
    search,
    salesFilter,
    statusFilter,
    activeRange,
  ]);

  /*
   * เปลี่ยนสถานะผ่าน API แล้ว refetch ข้อมูลจริงกลับมา
   * ต้องเสร็จก่อนจบ เพื่อให้บอร์ดอัปเดตตามข้อมูลล่าสุด
   */
  const persistStatus = useCallback(
    async (
      customerId: number,
      status: string,
    ): Promise<void> => {
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

  const handleOpenCustomer = useCallback(
    (customer: Customer) => {
      setActiveId(customer);
    },
    [],
  );

  const renderCard = useCallback(
    (
      customer: Customer,
      state: {
        ghost: boolean;
        dragging: boolean;
      },
    ) => (
      <PipelineCard
        customer={customer}
        ghost={state.ghost}
        dragging={state.dragging}
        onOpen={handleOpenCustomer}
      />
    ),
    [handleOpenCustomer],
  );

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
      orderPipeline: true,
      documents: true,
      products: true,
      productManagement: true,
      reports: true,
      administration: user?.role === "ADMIN",
      permissions: user?.role === "ADMIN",
      auditLogs: user?.role === "ADMIN",
    };

  const totalVisible = boardCustomers.length;

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

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddCardOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: "8px",
                px: 2,
                bgcolor: "#2563eb",
                "&:hover": {
                  bgcolor: "#1d4ed8",
                },
                flexShrink: 0,
              }}
            >
              {t("addNewCard")}
            </Button>
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
              flex: { xs: "1 1 100%", sm: "1 1 auto" },
              minWidth: { sm: "280px" },
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
          <CustomersKanbanBoard
            customers={boardCustomers}
            stages={stages}
            onStageChange={persistStatus}
            renderCard={renderCard}
            emptyColumnLabel={t("noCustomers")}
            cardHeight={148}
            columnWidth={280}
          />
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

      <AddCardDialog
        open={addCardOpen}
        customers={customers}
        stages={stages}
        onClose={() => setAddCardOpen(false)}
        onSave={(data) => {
          // Mock-up: ยังไม่เรียก API จริง
          console.log("Add card:", data);
          setNotice(t("cardAdded"));
          setAddCardOpen(false);
        }}
      />

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
