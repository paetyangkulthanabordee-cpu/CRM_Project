"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import GridViewIcon from "@mui/icons-material/GridView";
import InboxIcon from "@mui/icons-material/Inbox";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import TableViewIcon from "@mui/icons-material/TableView";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import CustomerBoard from "@/components/CustomerBoard";
import DashboardSidebar from "@/components/DashboardSidebar";

import { useRouter } from "next/navigation";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import {
  CUSTOMER_COLUMNS,
  CUSTOMER_STATUSES,
  STATUS_CHIP_STYLES,
  STATUS_LABELS,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

import type {
  Customer,
  CustomerStatus,
} from "@/lib/types";

type ViewMode =
  | "kanban"
  | "table"
  | "grid"
  | "summary";

type DateFilter =
  | "all"
  | "today"
  | "7d"
  | "30d";

const DATE_OPTIONS: {
  value: DateFilter;
  label: string;
}[] = [
  { value: "all", label: "All Date" },
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วันที่ผ่านมา" },
  { value: "30d", label: "30 วันที่ผ่านมา" },
];

const customerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อบริษัท"),

  email: z
    .string()
    .trim()
    .email("รูปแบบ Email ไม่ถูกต้อง")
    .or(z.literal("")),

  phone: z.string().trim(),
});

interface CustomerForm {
  companyName: string;
  email: string;
  phone: string;
  status: string;
}

const emptyForm: CustomerForm = {
  companyName: "",
  email: "",
  phone: "",
  status: "lead",
};

const statusColors: Record<CustomerStatus, string> =
  Object.fromEntries(
    CUSTOMER_COLUMNS.map((column) => [
      column.status,
      column.color,
    ]),
  ) as Record<CustomerStatus, string>;

function downloadCsv(rows: Customer[]) {
  const header = [
    "ID",
    "Company",
    "Email",
    "Phone",
    "Status",
    "Created",
  ];

  const body = rows.map((customer) => [
    customer.customerId,
    customer.companyName,
    customer.email ?? "",
    customer.phone ?? "",
    STATUS_LABELS[customer.status],
    new Date(
      customer.createdAt,
    ).toLocaleDateString("th-TH"),
  ]);

  const escape = (cell: string | number) =>
    `"${String(cell).replace(/"/g, '""')}"`;

  const csv = [header, ...body]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `customers-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [customers, setCustomers] = useState<
    Customer[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] =
    useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editing, setEditing] =
    useState<Customer | null>(null);

  const [form, setForm] =
    useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<
    "success" | "error"
  >("success");

  const showNotice = useCallback(
    (message: string, type: "success" | "error") => {
      setNotice(message);
      setNoticeType(type);
    },
    [],
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get<Customer[]>("/customers");

      setCustomers(response.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถโหลดรายชื่อลูกค้าได้",
        ),
      );
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

  /* =====================================================
     FILTER
  ====================================================== */

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const now = new Date();

    const dateLimit =
      dateFilter === "today"
        ? new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          ).getTime()
        : dateFilter === "7d"
          ? now.getTime() -
            7 * 24 * 60 * 60 * 1000
          : dateFilter === "30d"
            ? now.getTime() -
              30 * 24 * 60 * 60 * 1000
            : null;

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        [
          customer.companyName,
          customer.email,
          customer.phone,
        ].some((value) =>
          (value ?? "")
            .toLowerCase()
            .includes(query),
        );

      const matchesStatus =
        !statusFilter ||
        customer.status === statusFilter;

      const matchesDate =
        dateLimit === null ||
        new Date(
          customer.createdAt,
        ).getTime() >= dateLimit;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [customers, search, statusFilter, dateFilter]);

  const statusCounts = CUSTOMER_STATUSES.map(
    (status) => ({
      status,
      count: filtered.filter(
        (customer) => customer.status === status,
      ).length,
    }),
  );

  const summaryTotal = filtered.length;

  const wonCount =
    statusCounts.find(
      (item) => item.status === "payment",
    )?.count ?? 0;

  const lostCount =
    statusCounts.find(
      (item) =>
        item.status === "not_interested",
    )?.count ?? 0;

  const closedCount = wonCount + lostCount;

  const winRate =
    closedCount === 0
      ? 0
      : Math.round((wonCount / closedCount) * 100);

  /* =====================================================
     MOVE (DRAG & DROP)
  ====================================================== */

  async function handleMove(
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
      await api.patch(
        `/customers/${customerId}`,
        { status },
      );

      showNotice(
        `เปลี่ยนสถานะเป็น ${
          STATUS_LABELS[status]
        } แล้ว`,
        "success",
      );
    } catch (err) {
      setCustomers(previous);

      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถเปลี่ยนสถานะได้",
        ),
        "error",
      );
    }
  }

  /* =====================================================
     CREATE / EDIT
  ====================================================== */

  function openCreate(
    status: CustomerStatus = "lead",
  ) {
    setEditing(null);
    setForm({ ...emptyForm, status });
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      companyName: customer.companyName,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      status: customer.status,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const result = customerSchema.safeParse(form);

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ||
          "ข้อมูลไม่ถูกต้อง",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        companyName: result.data.companyName,
        email: result.data.email || undefined,
        phone: result.data.phone || undefined,
        status: form.status,
      };

      if (editing) {
        await api.patch(
          `/customers/${editing.customerId}`,
          payload,
        );
        showNotice(
          "อัปเดตลูกค้าเรียบร้อยแล้ว",
          "success",
        );
      } else {
        await api.post("/customers", payload);
        showNotice(
          "เพิ่มลูกค้าเรียบร้อยแล้ว",
          "success",
        );
      }

      setDialogOpen(false);
      await loadCustomers();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกข้อมูลได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     DELETE
  ====================================================== */

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await api.delete(
        `/customers/${deleteTarget.customerId}`,
      );

      showNotice(
        "ลบลูกค้าเรียบร้อยแล้ว",
        "success",
      );
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถลบลูกค้าได้",
        ),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /* =====================================================
     FILTER RESET
  ====================================================== */

  const hasFilter =
    Boolean(search.trim()) ||
    statusFilter !== "" ||
    dateFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setDateFilter("all");
  }

  /* =====================================================
     RENDER
  ====================================================== */

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

  const customerPermissions: Permissions =
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
        permissions={customerPermissions}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
        }}
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              Customers
            </Typography>

            <Typography
              component="div"
              variant="body2"
              sx={{ mt: 0.5, color: "#64748b" }}
            >
              จัดการลูกค้าและการขายในมุมมองที่คุณต้องการ
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* VIEW SWITCH */}

            <ButtonGroup
              variant="outlined"
              sx={{
                "& .MuiButton-root": {
                  borderColor: "#e2e8f0",
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 700,
                  px: 1.5,
                  bgcolor: "#ffffff",
                  "&.active": {
                    bgcolor: "#f1f5f9",
                    color: "#0f172a",
                  },
                },
              }}
            >
              <Button
                className={
                  view === "kanban"
                    ? "active"
                    : undefined
                }
                startIcon={<ViewKanbanIcon />}
                onClick={() => setView("kanban")}
              >
                KANBAN
              </Button>

              <Button
                className={
                  view === "table"
                    ? "active"
                    : undefined
                }
                startIcon={<TableViewIcon />}
                onClick={() => setView("table")}
              >
                TABLE
              </Button>

              <Button
                className={
                  view === "grid"
                    ? "active"
                    : undefined
                }
                startIcon={<GridViewIcon />}
                onClick={() => setView("grid")}
              >
                GRID
              </Button>

              <Button
                className={
                  view === "summary"
                    ? "active"
                    : undefined
                }
                startIcon={<InsertChartIcon />}
                onClick={() => setView("summary")}
              >
                SUMMARY
              </Button>
            </ButtonGroup>

            {/* EXPORT */}

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadCsv(filtered)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
                borderColor: "#bfdbfe",
                bgcolor: "#ffffff",
                px: 2,
                borderRadius: 2,
                "&:hover": {
                  borderColor: "#2563eb",
                  bgcolor: "#f8fbff",
                },
              }}
            >
              Export
            </Button>

            {/* CREATE */}

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreate()}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                borderRadius: 2,
                bgcolor: "#2563eb",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#1d4ed8",
                  boxShadow: "none",
                },
              }}
            >
              เพิ่มลูกค้าใหม่
            </Button>
          </Box>
        </Box>

        {/* =================================================
            TOOLBAR
        ================================================== */}

        <Card
          sx={{
            mb: 3,
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            p: 1.5,
            border: "1px solid #eceff4",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          <TextField
            select
            size="small"
            value={statusFilter || "all"}
            onChange={(event) =>
              setStatusFilter(
                event.target.value === "all"
                  ? ""
                  : event.target.value,
              )
            }
            sx={{ minWidth: 160 }}
            slotProps={{
              input: {
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            <MenuItem value="all">
              All Status
            </MenuItem>

            {CUSTOMER_STATUSES.map((item) => (
              <MenuItem key={item} value={item}>
                {STATUS_LABELS[item]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value as DateFilter,
              )
            }
            sx={{ minWidth: 170 }}
            slotProps={{
              input: {
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            {DATE_OPTIONS.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            placeholder="ค้นหา ชื่อบริษัท, อีเมล หรือเบอร์โทร..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            autoComplete="off"
            sx={{
              minWidth: 260,
              flex: 1,
              maxWidth: 420,
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ color: "#94a3b8" }}
                    />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="ล้างการค้นหา"
                      onClick={() => setSearch("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          />

          {hasFilter && (
            <Button
              size="small"
              onClick={resetFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              ล้างตัวกรอง
            </Button>
          )}

          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {loading && customers.length === 0 ? (
              <Skeleton width={120} />
            ) : (
              <>
                แสดง {filtered.length} /{" "}
                {customers.length} รายการ
              </>
            )}
          </Typography>
        </Card>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* =================================================
            CONTENT
        ================================================== */}

        {loading && customers.length === 0 ? (
          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Stack
                divider={
                  <Divider flexItem />
                }
              >
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Skeleton
                    width={220}
                    height={30}
                  />
                </Box>

                {Array.from({
                  length: 4,
                }).map((_, index) => (
                  <Box
                    key={`customer-skeleton-${index}`}
                    sx={{
                      px: 3,
                      py: 2.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 2.5,
                    }}
                  >
                    <Skeleton
                      variant="circular"
                      width={40}
                      height={40}
                    />
                    <Skeleton
                      width={160}
                      height={22}
                    />
                    <Skeleton width={200} />
                    <Box sx={{ flex: 1 }} />
                    <Skeleton width={90} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent
              sx={{
                py: 7,
                textAlign: "center",
              }}
            >
              {hasFilter ? (
                <>
                  <SearchOffIcon
                    sx={{
                      fontSize: 44,
                      color: "#cbd5e1",
                    }}
                  />

                  <Typography
                    component="div"
                    variant="body1"
                    sx={{
                      mt: 1.5,
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    ไม่พบผลลัพธ์
                  </Typography>

                  <Typography
                    component="div"
                    variant="body2"
                    sx={{ mt: 0.5, color: "#94a3b8" }}
                  >
                    {search.trim()
                      ? `ไม่มีลูกค้าที่ตรงกับ "${search.trim()}"`
                      : "ไม่มีลูกค้าที่ตรงกับตัวกรองที่เลือก"}
                  </Typography>

                  <Button
                    onClick={resetFilters}
                    sx={{
                      mt: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    ล้างการค้นหา/ตัวกรอง
                  </Button>
                </>
              ) : (
                <>
                  <InboxIcon
                    sx={{
                      fontSize: 44,
                      color: "#cbd5e1",
                    }}
                  />

                  <Typography
                    component="div"
                    variant="body1"
                    sx={{
                      mt: 1.5,
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    ยังไม่มีลูกค้า
                  </Typography>

                  <Typography
                    component="div"
                    variant="body2"
                    sx={{ mt: 0.5, color: "#94a3b8" }}
                  >
                    เริ่มต้นด้วยการเพิ่มลูกค้ารายแรก
                  </Typography>

                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openCreate()}
                    sx={{
                      mt: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: "#2563eb",
                      boxShadow: "none",
                      "&:hover": {
                        bgcolor: "#1d4ed8",
                        boxShadow: "none",
                      },
                    }}
                  >
                    เพิ่มลูกค้าใหม่
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : view === "kanban" ? (
          <CustomerBoard
            customers={filtered}
            onMove={(customerId, status) =>
              void handleMove(
                customerId,
                status,
              )
            }
            onAdd={openCreate}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        ) : view === "grid" ? (
          /* =================================================
              GRID VIEW
          ================================================== */

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
                xl: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {filtered.map((customer) => (
              <Card
                key={customer.customerId}
                sx={{
                  border: "1px solid #e8ecf2",
                  borderRadius: 3,
                  bgcolor: "#ffffff",
                  transition:
                    "border-color 120ms ease, box-shadow 120ms ease",
                  "&:hover": {
                    borderColor: "#c7d2fe",
                    boxShadow:
                      "0 6px 16px rgba(15,23,42,0.08)",
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: 2.5,
                    "&:last-child": { pb: 2.5 },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 1,
                    }}
                  >
                    <Typography
                      component="div"
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        color: "#172033",
                        wordBreak: "break-word",
                      }}
                    >
                      {customer.companyName}
                    </Typography>

                    <Chip
                      size="small"
                      label={
                        STATUS_LABELS[
                          customer.status
                        ]
                      }
                      sx={{
                        fontWeight: 700,
                        borderRadius: "8px",
                        color:
                          STATUS_CHIP_STYLES[
                            customer.status
                          ].fg,
                        bgcolor:
                          STATUS_CHIP_STYLES[
                            customer.status
                          ].bg,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  <Typography
                    component="div"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      wordBreak: "break-word",
                    }}
                  >
                    {customer.email ||
                      "ไม่มีอีเมล"}
                  </Typography>

                  <Typography
                    component="div"
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      wordBreak: "break-word",
                    }}
                  >
                    {customer.phone ||
                      "ไม่มีเบอร์โทร"}
                  </Typography>

                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(
                        customer.createdAt,
                      ).toLocaleDateString(
                        "th-TH",
                      )}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                      <Button
                        size="small"
                        onClick={() =>
                          openEdit(customer)
                        }
                        sx={{
                          minHeight: 26,
                          px: 1,
                          fontSize: 12,
                          textTransform: "none",
                          color: "#475569",
                        }}
                      >
                        แก้ไข
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setDeleteTarget(
                            customer,
                          )
                        }
                        sx={{
                          minHeight: 26,
                          px: 1,
                          fontSize: 12,
                          textTransform: "none",
                        }}
                      >
                        ลบ
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : view === "summary" ? (
          /* =================================================
              SUMMARY VIEW
          ================================================== */

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  xl: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {[
                {
                  label: "ลูกค้าทั้งหมด",
                  value: summaryTotal,
                  suffix: "ราย",
                  color: "#2563eb",
                },
                {
                  label: "Close Won",
                  value: wonCount,
                  suffix: "ราย",
                  color: "#16a34a",
                },
                {
                  label: "Close Lost",
                  value: lostCount,
                  suffix: "ราย",
                  color: "#dc2626",
                },
                {
                  label: "Win Rate",
                  value: winRate,
                  suffix: "%",
                  color: "#7c3aed",
                },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  sx={{
                    border:
                      "1px solid #e8ecf2",
                    borderRadius: 3,
                    bgcolor: "#ffffff",
                  }}
                >
                  <CardContent>
                    <Typography
                      component="div"
                      variant="body2"
                      color="text.secondary"
                    >
                      {stat.label}
                    </Typography>

                    <Typography
                      component="div"
                      variant="h4"
                      sx={{
                        mt: 1,
                        fontWeight: 800,
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          ml: 0.5,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        {stat.suffix}
                      </Typography>
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Card
              sx={{
                border: "1px solid #e8ecf2",
                borderRadius: 3,
                bgcolor: "#ffffff",
              }}
            >
              <CardContent
                sx={{ p: 3 }}
              >
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mb: 2.5,
                  }}
                >
                  จำนวนลูกค้าตามสถานะ
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {statusCounts.map(
                    ({ status, count }) => {
                      const percent =
                        summaryTotal === 0
                          ? 0
                          : Math.round(
                              (count /
                                summaryTotal) *
                                100,
                            );

                      return (
                        <Box key={status}>
                          <Box
                            sx={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              mb: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius:
                                    "50%",
                                  bgcolor:
                                    statusColors[
                                      status
                                    ],
                                }}
                              />

                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                }}
                              >
                                {
                                  STATUS_LABELS[
                                    status
                                  ]
                                }
                              </Typography>
                            </Box>

                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              {count} ราย (
                              {percent}%)
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              bgcolor:
                                "#eef1f6",
                              overflow:
                                "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                height:
                                  "100%",
                                width: `${percent}%`,
                                borderRadius: 5,
                                bgcolor:
                                  statusColors[
                                    status
                                  ],
                                transition:
                                  "width 200ms ease",
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    },
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : (
          /* =================================================
              TABLE VIEW
          ================================================== */

          <Card
            sx={{
              border: "1px solid #e8ecf2",
              borderRadius: 3,
              bgcolor: "#ffffff",
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontWeight: 800 }}
                      >
                        บริษัท
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 800 }}
                      >
                        อีเมล
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 800 }}
                      >
                        เบอร์โทร
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 800 }}
                      >
                        สถานะ
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 800 }}
                      >
                        วันที่เพิ่ม
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        จัดการ
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filtered.map((customer) => (
                      <TableRow
                        key={customer.customerId}
                        hover
                      >
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 700 }}
                          >
                            {customer.companyName}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {customer.email || "-"}
                        </TableCell>

                        <TableCell>
                          {customer.phone || "-"}
                        </TableCell>

                        <TableCell>
                      <Chip
                        size="small"
                        label={
                          STATUS_LABELS[
                            customer.status
                          ]
                        }
                        sx={{
                          fontWeight: 700,
                          borderRadius: "8px",
                          color:
                            STATUS_CHIP_STYLES[
                              customer.status
                            ].fg,
                          bgcolor:
                            STATUS_CHIP_STYLES[
                              customer.status
                            ].bg,
                        }}
                      />
                        </TableCell>

                        <TableCell>
                          {new Date(
                            customer.createdAt,
                          ).toLocaleDateString(
                            "th-TH",
                          )}
                        </TableCell>

                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              justifyContent:
                                "flex-end",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                openEdit(customer)
                              }
                              sx={{
                                textTransform:
                                  "none",
                              }}
                            >
                              แก้ไข
                            </Button>

                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() =>
                                setDeleteTarget(
                                  customer,
                                )
                              }
                              sx={{
                                textTransform:
                                  "none",
                              }}
                            >
                              ลบ
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* =================================================
          CREATE / EDIT DIALOG
      ================================================== */}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing
              ? "แก้ไขลูกค้า"
              : "เพิ่มลูกค้าใหม่"}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error">
                  {formError}
                </Alert>
              )}

              <TextField
                fullWidth
                label="ชื่อบริษัท"
                value={form.companyName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    companyName:
                      event.target.value,
                  }))
                }
                disabled={saving}
                required
              />

              <TextField
                fullWidth
                label="อีเมล"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={saving}
              />

              <TextField
                fullWidth
                label="เบอร์โทร"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                disabled={saving}
              />

              <TextField
                fullWidth
                select
                label="สถานะ"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target
                      .value as CustomerStatus,
                  }))
                }
                disabled={saving}
              >
                {CUSTOMER_STATUSES.map((item) => (
                  <MenuItem
                    key={item}
                    value={item}
                  >
                    {STATUS_LABELS[item]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {saving ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : editing ? (
                "บันทึกการแก้ไข"
              ) : (
                "เพิ่มลูกค้า"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =================================================
          DELETE DIALOG
      ================================================== */}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ยืนยันการลบ
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            ต้องการลบลูกค้า{" "}
            <strong>
              {deleteTarget?.companyName}
            </strong>{" "}
            ใช่หรือไม่?
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleDelete()}
            sx={{ textTransform: "none" }}
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTICE */}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() => setNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={noticeType}
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
