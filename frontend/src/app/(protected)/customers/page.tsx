"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

import CustomerDetailDialog, {
  formatBaht,
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";
import CustomersKanbanView from "@/components/CustomersKanbanView";
import { api, getErrorMessage } from "@/lib/api";
import {
  emptySummary,
  summarizeDocs,
} from "@/lib/customerDocs";
import { useApi } from "@/lib/swr";
import { useStoredPreference } from "@/lib/useStoredPreference";

import { useSession } from "@/lib/useSession";

import type {
  Customer,
  DocumentItem,
  PipelineStage,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

import { useTranslations } from "next-intl";

type DateFilter =
  | "all"
  | "today"
  | "7d"
  | "30d";

/*
 * มุมมองการแสดงผลของหน้าลูกค้า
 */
const VIEW_OPTIONS = ["table", "kanban"] as const;

type CustomerView = (typeof VIEW_OPTIONS)[number];

const VIEW_STORAGE_KEY = "customers-view";

/*
 * จำนวนสูงสุดที่บอร์ด Kanban ดึงมาได้
 * (backend จำกัด limit ไว้ที่ 100)
 */
const BOARD_LIMIT = 100;

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
  status: "",
};



export default function CustomersPage() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");

  const customerSchema = z.object({
    companyName: z
      .string()
      .min(1, t("companyNameRequired")),

    email: z
      .string()
      .refine(
        (value) =>
          value.trim() === "" ||
          z.string().email().safeParse(value).success,
        t("invalidEmailFormat"),
      ),

    phone: z.string(),

    status: z.string().min(1, t("statusRequired")),
  });

  const DATE_OPTIONS: {
    value: DateFilter;
    label: string;
  }[] = [
    { value: "all", label: t("dateFilter.all") },
    { value: "today", label: t("dateFilter.today") },
    { value: "7d", label: t("dateFilter.7d") },
    { value: "30d", label: t("dateFilter.30d") },
  ];

  const { user, permissions, ready } = useSession();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  /*
   * มุมมองที่ผู้ใช้เลือก (ตาราง / บอร์ด) จำค่าไว้ข้ามการเปิดหน้าใหม่
   */
  const [view, setView] = useStoredPreference<CustomerView>(
    VIEW_STORAGE_KEY,
    "table",
    VIEW_OPTIONS,
  );

  /*
   * ตัวกรองที่ใช้ร่วมกันทั้งสองมุมมอง
   */
  const baseQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      if (dateFilter === "7d") {
        from.setDate(from.getDate() - 7);
      } else if (dateFilter === "30d") {
        from.setDate(from.getDate() - 30);
      }

      params.set(
        "dateFrom",
        from.toISOString().slice(0, 10),
      );
    }

    return params.toString();
  }, [search, statusFilter, dateFilter]);

  /*
   * ตาราง = paginate จาก server
   */
  const tableUrl = useMemo(() => {
    if (!ready || !user) return null;

    const params = new URLSearchParams(baseQuery);
    params.set("limit", String(rowsPerPage));
    params.set("page", String(page));

    return `/api/customers?${params.toString()}`;
  }, [ready, user, baseQuery, page, rowsPerPage]);

  /*
   * บอร์ด = ดึงมาทั้งหมดในครั้งเดียว (ไม่ paginate)
   */
  const boardUrl = useMemo(() => {
    if (!ready || !user) return null;

    const params = new URLSearchParams(baseQuery);
    params.set("limit", String(BOARD_LIMIT));

    return `/api/customers?${params.toString()}`;
  }, [ready, user, baseQuery]);

  const {
    data: tableData,
    isLoading: tableLoading,
    error: tableError,
    mutate: reloadTable,
  } = useApi<{ data: Customer[]; total: number }>(tableUrl);

  const {
    data: boardData,
    isLoading: boardLoading,
    error: boardError,
    mutate: reloadBoard,
  } = useApi<{ data: Customer[]; total: number }>(boardUrl);

  /*
   * อ่านค่าจากมุมมองที่กำลังแสดงอยู่เท่านั้น
   */
  const customersData =
    view === "table" ? tableData : boardData;
  const loading =
    view === "table" ? tableLoading : boardLoading;
  const loadError =
    view === "table" ? tableError : boardError;

  const { data: stagesData } = useApi<PipelineStage[]>(
    ready && user ? "/api/pipeline-stages" : null,
  );
  const { data: docsData } = useApi<{ data: DocumentItem[]; total: number }>(
    ready && user ? "/api/documents?limit=100" : null,
  );

  /*
   * แก้ไขข้อมูลแล้วต้องรีเฟรชทั้งสองมุมมอง
   * เพื่อไม่ให้ข้อมูลเก่าค้างอยู่ตอนสลับมุมมอง
   */
  const reloadCustomers = useCallback(async () => {
    await Promise.all([
      reloadTable(),
      reloadBoard(),
    ]);
  }, [reloadTable, reloadBoard]);

  const customers = useMemo(
    () => customersData?.data ?? [],
    [customersData],
  );
  const stages = useMemo(
    () => stagesData ?? [],
    [stagesData],
  );

  const [detailTarget, setDetailTarget] =
    useState<Customer | null>(null);

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editing, setEditing] =
    useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>({
    ...emptyForm,
    status: stages[0]?.stageKey ?? "",
  });
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

  /*
   * เปลี่ยนสถานะของลูกค้า
   * ต้องรีเฟรชข้อมูลจริงกลับมาให้เสร็จก่อนจบ
   * เพื่อให้บอร์ดอัปเดตตามข้อมูลล่าสุด
   */
  const handleMoveCustomer = useCallback(
    async (
      customerId: number,
      status: string,
    ): Promise<void> => {
      try {
        await api.patch(`/api/customers/${customerId}`, { status });
        showNotice(t("statusUpdated"), "success");
        await reloadCustomers();
      } catch (err) {
        showNotice(getErrorMessage(err, t("statusUpdateError")), "error");
        await reloadCustomers();
      }
    },
    [t, showNotice, reloadCustomers],
  );

  const docSummary = useMemo(
    () => summarizeDocs(docsData?.data ?? []),
    [docsData],
  );

  /* =====================================================
     PAGINATION (server-side)
     ====================================================== */

  const total = customersData?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(total / rowsPerPage),
  );

  const hasFilter =
    Boolean(search.trim()) ||
    Boolean(statusFilter) ||
    dateFilter !== "all";

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setDateFilter("all");
    setPage(1);
  }

  const stageByKey = useMemo(() => {
    const map: Record<string, PipelineStage> =
      {};

    for (const stage of stages) {
      map[stage.stageKey] = stage;
    }

    return map;
  }, [stages]);

  const totals = useMemo(() => {
    let quotation = 0;
    let invoiced = 0;
    let received = 0;
    let outstanding = 0;

    for (const customer of customers) {
      const summary =
        docSummary[customer.customerId];

      if (!summary) {
        continue;
      }

      quotation += summary.quotation.total;
      invoiced += summary.invoice.total;
      received += summary.receipt.total;
      outstanding += summary.outstanding;
    }

    return { quotation, invoiced, received, outstanding };
  }, [customers, docSummary]);

  /* =====================================================
     ACTIONS
     ====================================================== */

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      status: stages[0]?.stageKey ?? "",
    });
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
          tCommon("error"),
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        companyName:
          result.data.companyName.trim(),
        email: result.data.email.trim() || null,
        phone: result.data.phone.trim() || null,
        status: result.data.status,
      };

      if (editing) {
        await api.patch(
          `/customers/${editing.customerId}`,
          payload,
        );

        showNotice(
          t("customerUpdated"),
          "success",
        );
      } else {
        await api.post("/api/customers", payload);

        showNotice(
          t("customerAdded"),
          "success",
        );
      }

      setDialogOpen(false);
      await reloadCustomers();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          editing
            ? t("customerUpdateError")
            : t("customerAddError"),
        ),
      );
    } finally {
      setSaving(false);
    }
  }

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
        t("customerDeleted"),
        "success",
      );
      setDeleteTarget(null);
      await reloadCustomers();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          t("customerDeleteError"),
        ),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function downloadCsv() {
    const header = [
      "Company",
      "Email",
      "Phone",
      "Sales",
      "Stage",
      "Quotation",
      "Invoice",
      "Receipt",
      "Created",
    ];

    const body = customers.map((customer) => {
      const summary =
        docSummary[customer.customerId];

      return [
        customer.companyName,
        customer.email ?? "",
        customer.phone ?? "",
        customer.assignedUser?.name ?? "",
        stageByKey[customer.status]?.label ??
          customer.status,
        summary?.quotation.total ?? 0,
        summary?.invoice.total ?? 0,
        summary?.receipt.total ?? 0,
        formatDate(customer.createdAt),
      ];
    });

    const csv = [header, ...body]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "customers.csv";
    link.click();

    URL.revokeObjectURL(url);
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

  const _fallbackPermissions: Permissions =
    permissions ?? {
      dashboard: true,
      customers: true,
      orderPipeline: true,
      documents: true,
      products: true,
      productManagement: true,
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
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          maxHeight: "100vh",
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
              {t("customerDatabase")}
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
              {t("title")}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              {t("subtitle")}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={customers.length === 0}
              onClick={downloadCsv}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
                borderColor: "#bfdbfe",
                borderRadius: 2,
              }}
            >
              {t("export")}
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: "#2563eb",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#1d4ed8",
                  boxShadow: "none",
                },
              }}
            >
              {t("addNew")}
            </Button>
          </Stack>
        </Box>

        {/* =================================================
            STAT CARDS
        ================================================== */}

        <Box
          sx={{
            mb: 3,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {[
            {
              label: t("stats.showing"),
              value: `${total}`,
              sub: t("stats.fromTotal", {
                total: total,
              }),
              color: "#2563eb",
            },
            {
              label: t("stats.quotationTotal"),
              value: formatBaht(totals.quotation),
              sub: t("stats.quotationSub"),
              color: "#0f62fe",
            },
            {
              label: t("stats.invoiceTotal"),
              value: formatBaht(totals.invoiced),
              sub: t("stats.invoiceSub", {
                amount: formatBaht(totals.received),
              }),
              color: "#f97316",
            },
            {
              label: t("stats.outstanding"),
              value: formatBaht(totals.outstanding),
              sub: t("stats.outstandingSub"),
              color: "#dc2626",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              sx={{
                border: "1px solid #e7ebf2",
                borderRadius: "16px",
                boxShadow:
                  "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              <CardContent
                sx={{
                  "&:last-child": { pb: 2.25 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "#64748b" }}
                >
                  {stat.label}
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1.3,
                  }}
                >
                  {stat.value}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  {stat.sub}
                </Typography>
              </CardContent>
            </Card>
          ))}
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
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={t("searchPlaceholder")}
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
                      aria-label={t("clearFilters")}
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              minWidth: 260,
              flex: 1,
              maxWidth: 420,
              "& .MuiOutlinedInput-root": {
                bgcolor: "#f8fafc",
                borderRadius: "10px",
              },
            }}
          />

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
            sx={{ minWidth: 170 }}
            slotProps={{
              input: {
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                },
              },
            }}
          >
            <MenuItem value="all">
              {t("allStatuses")}
            </MenuItem>

            {stages.map((stage) => (
              <MenuItem
                key={stage.stageId}
                value={stage.stageKey}
              >
                {stage.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target
                  .value as DateFilter,
              )
            }
            sx={{ minWidth: 150 }}
            slotProps={{
              input: {
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
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

          {hasFilter && (
            <Button
              onClick={resetFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              {t("clearFilters")}
            </Button>
          )}

          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(
              event,
              next: CustomerView | null,
            ) => {
              if (!next) {
                return;
              }

              setView(next);
            }}
            aria-label={t("viewLabel")}
            sx={{
              ml: "auto",
              bgcolor: "#f1f5f9",
              borderRadius: "10px",
              p: 0.4,
              gap: 0.4,
              "& .MuiToggleButtonGroup-grouped": {
                border: "none",
                borderRadius: "8px !important",
                px: 1.25,
                py: 0.6,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.2,
              },
              "& .Mui-selected": {
                bgcolor: "#ffffff !important",
                color: "#2563eb !important",
                boxShadow:
                  "0 1px 3px rgba(15,23,42,0.12)",
              },
            }}
          >
            <ToggleButton
              value="table"
              aria-label={t("viewTable")}
            >
              <TableViewOutlinedIcon
                sx={{ fontSize: 18, mr: 0.75 }}
              />
              {t("viewTable")}
            </ToggleButton>

            <ToggleButton
              value="kanban"
              aria-label={t("viewKanban")}
            >
              <ViewKanbanOutlinedIcon
                sx={{ fontSize: 18, mr: 0.75 }}
              />
              {t("viewKanban")}
            </ToggleButton>
          </ToggleButtonGroup>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "#64748b",
              whiteSpace: "nowrap",
            }}
          >
            {t("showing")} {customers.length}{" "}
            {t("of")} {total}{" "}
            {t("entries")}
          </Typography>
        </Card>

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("loadError")}
          </Alert>
        )}

        {/* =================================================
            TABLE / KANBAN
        ================================================== */}

        {view === "table" ? (
          <Card
            sx={{
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
              boxShadow:
                "0 1px 3px rgba(15,23,42,0.04)",
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{ bgcolor: "#fafcff" }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("companyCustomer")}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("salesResponsible")}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("pipelineStatus")}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("documentsColumn")}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          display: "block",
                          fontWeight: 500,
                          color: "#94a3b8",
                        }}
                      >
                        {t("documentsSub")}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("outstanding")}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("dateAdded")}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {t("actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    Array.from({
                      length: 6,
                    }).map((_, row) => (
                      <TableRow key={`skeleton-${row}`}>
                        {[220, 150, 140, 170, 110, 90, 140].map(
                          (width, cell) => (
                            <TableCell key={cell}>
                              <Skeleton
                                width={width}
                                height={26}
                              />
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    ))
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Box
                          sx={{
                            py: 7,
                            textAlign: "center",
                          }}
                        >
                          <SearchOffIcon
                            sx={{
                              fontSize: 38,
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
                            {hasFilter
                              ? t("noResults")
                              : t("noCustomers")}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              mt: 0.5,
                              color: "#94a3b8",
                            }}
                          >
                            {hasFilter
                              ? t("noResultsHint")
                              : t("noCustomersHint")}
                          </Typography>

                          {hasFilter && (
                            <Button
                              onClick={resetFilters}
                              sx={{
                                mt: 1.5,
                                textTransform: "none",
                              }}
                            >
                              {t("clearFilters")}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const stage =
                        stageByKey[customer.status];

                      const summary =
                        docSummary[customer.customerId] ??
                        emptySummary();

                      const assigned =
                        customer.assignedUser?.name ??
                        null;

                      return (
                        <TableRow
                          key={customer.customerId}
                          hover
                          onClick={() =>
                            setDetailTarget(customer)
                          }
                          sx={{
                            cursor: "pointer",
                            "&:last-child td": {
                              borderBottom: 0,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                              }}
                            >
                              {
                                customer.companyName
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                color: "#64748b",
                              }}
                            >
                              {customer.email ||
                                "-"}
                              {" · "}
                              {customer.phone || "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {assigned ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    bgcolor: "#e8f1ff",
                                    color: "#1d4ed8",
                                  }}
                                >
                                  {initials(assigned)}
                                </Avatar>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    color: "#334155",
                                  }}
                                >
                                  {assigned}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ color: "#94a3b8" }}
                              >
                                {t("unassigned")}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                stage?.label ??
                                customer.status
                              }
                              sx={{
                                fontWeight: 700,
                                borderRadius: "8px",
                                color: "#ffffff",
                                bgcolor:
                                  stage?.color ??
                                  "#94a3b8",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.75}
                            >
                              {[
                                {
                                  label: "QT",
                                  count:
                                    summary.quotation
                                      .count,
                                  color: "#2563eb",
                                },
                                {
                                  label: "IV",
                                  count:
                                    summary.invoice
                                      .count,
                                  color: "#f97316",
                                },
                                {
                                  label: "RC",
                                  count:
                                    summary.receipt
                                      .count,
                                  color: "#16a34a",
                                },
                              ].map((item) => (
                                <Chip
                                  key={item.label}
                                  size="small"
                                  label={`${item.label} ${item.count}`}
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: 11,
                                    borderRadius: "7px",
                                    bgcolor:
                                      item.count > 0
                                        ? `${item.color}14`
                                        : "#f4f6f9",
                                    color:
                                      item.count > 0
                                        ? item.color
                                        : "#94a3b8",
                                  }}
                                />
                              ))}
                            </Stack>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              sx={{
                                fontWeight: 800,
                                color:
                                  summary.outstanding >
                                  0
                                    ? "#dc2626"
                                    : "#94a3b8",
                              }}
                            >
                              {formatBaht(
                                summary.outstanding,
                              )}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ color: "#475569" }}
                            >
                              {formatDate(
                                customer.createdAt,
                              )}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                justifyContent:
                                  "flex-end",
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label={t("viewDetails")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDetailTarget(
                                    customer,
                                  );
                                }}
                                sx={{
                                  color: "#64748b",
                                }}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label={t("editCustomer")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEdit(customer);
                                }}
                                sx={{
                                  color: "#64748b",
                                }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label={t("deleteCustomer")}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget(
                                    customer,
                                  );
                                }}
                                sx={{ color: "#dc2626" }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 0.5,
                py: 2,
                borderTop: "1px solid #eef1f6",
              }}
            >
              <IconButton
                size="small"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                aria-label={t("previousPage")}
                sx={{
                  color: "#64748b",
                  "&.Mui-disabled": {
                    color: "#cbd5e1",
                  },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>

              {(() => {
                const pages: (number | "...")[] = [];
                const total = totalPages;
                const current = page;

                if (total <= 7) {
                  for (let i = 1; i <= total; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push(1);

                  if (current > 3) {
                    pages.push("...");
                  }

                  const start = Math.max(2, current - 1);
                  const end = Math.min(
                    total - 1,
                    current + 1,
                  );

                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }

                  if (current < total - 2) {
                    pages.push("...");
                  }

                  pages.push(total);
                }

                return pages.map((p, idx) =>
                  p === "..." ? (
                    <Typography
                      key={`ellipsis-${idx}`}
                      sx={{
                        px: 1,
                        color: "#94a3b8",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      ...
                    </Typography>
                  ) : (
                    <Button
                      key={p}
                      size="small"
                      onClick={() => setPage(p)}
                      sx={{
                        minWidth: 32,
                        height: 32,
                        borderRadius: "50%",
                        fontWeight: 700,
                        fontSize: 14,
                        color:
                          p === current
                            ? "#ffffff"
                            : "#475569",
                        bgcolor:
                          p === current
                            ? "#2563eb"
                            : "transparent",
                        "&:hover": {
                          bgcolor:
                            p === current
                              ? "#2563eb"
                              : "#f1f5f9",
                        },
                      }}
                    >
                      {p}
                    </Button>
                  ),
                );
              })()}

              <IconButton
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                aria-label={t("nextPage")}
                sx={{
                  color: "#64748b",
                  "&.MuiDisabled": {
                    color: "#cbd5e1",
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Card>
        ) : (
          <CustomersKanbanView
            customers={customers}
            stages={stages}
            docSummary={docSummary}
            onOpen={setDetailTarget}
            onStageChange={handleMoveCustomer}
            emptyColumnLabel={t("kanbanEmpty")}
            unassignedLabel={t("unassigned")}
          />
        )}
      </Box>

      {/* =================================================
          DETAIL DIALOG
      ================================================== */}

      {detailTarget && (
        <CustomerDetailDialog
          customer={detailTarget}
          stages={stages}
          onClose={() => setDetailTarget(null)}
          onMove={handleMoveCustomer}
        />
      )}

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
              ? t("editCustomerTitle")
              : t("addCustomerTitle")}
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
                label={t("companyName")}
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
                label={t("email")}
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
                label={t("phone")}
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
                label={t("pipelineStatusLabel")}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                disabled={saving}
              >
                {stages.map((stage) => (
                  <MenuItem
                    key={stage.stageId}
                    value={stage.stageKey}
                  >
                    {stage.label}
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
              {t("cancel")}
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
                t("save")
              ) : (
                t("addCustomer")
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
          {t("deleteConfirmTitle")}
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            {t("deleteConfirmMessage", {
              name: deleteTarget?.companyName ?? "",
            })}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            {t("cancel")}
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleDelete()}
            sx={{ textTransform: "none" }}
          >
            {deleting ? t("deleting") : t("delete")}
          </Button>
        </DialogActions>
      </Dialog>

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
