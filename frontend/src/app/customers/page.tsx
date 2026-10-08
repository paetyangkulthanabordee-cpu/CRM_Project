"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestoreIcon from "@mui/icons-material/Restore";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
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
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import CustomerDetailDialog, {
  formatBaht,
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";
import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import type {
  Customer,
  DocumentItem,
  PipelineStage,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

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

const customerSchema = z.object({
  companyName: z
    .string()
    .min(1, "กรุณากรอกชื่อบริษัท"),

  email: z
    .string()
    .refine(
      (value) =>
        value.trim() === "" ||
        z.string().email().safeParse(value).success,
      "รูปแบบ Email ไม่ถูกต้อง",
    ),

  phone: z.string(),

  status: z.string().min(1, "กรุณาเลือกสถานะ"),
});

interface DocSummary {
  quotation: { count: number; total: number };
  invoice: { count: number; total: number };
  receipt: { count: number; total: number };
  outstanding: number;
}

function emptySummary(): DocSummary {
  return {
    quotation: { count: 0, total: 0 },
    invoice: { count: 0, total: 0 },
    receipt: { count: 0, total: 0 },
    outstanding: 0,
  };
}

function summarizeDocs(
  docs: DocumentItem[],
): Record<number, DocSummary> {
  const result: Record<number, DocSummary> = {};

  for (const doc of docs) {
    const customerId = doc.customerId;

    if (customerId === null) {
      continue;
    }

    const summary = result[customerId] ?? emptySummary();

    if (
      doc.status === "cancelled" ||
      doc.status === "void"
    ) {
      continue;
    }

    if (doc.docType === "quotation") {
      summary.quotation.count += 1;
      summary.quotation.total += doc.amount;
    }

    if (doc.docType === "invoice") {
      summary.invoice.count += 1;
      summary.invoice.total += doc.amount;
    }

    if (doc.docType === "receipt") {
      summary.receipt.count += 1;
      summary.receipt.total += doc.amount;
    }

    result[customerId] = summary;
  }

  for (const [customerId, summary] of Object.entries(
    result,
  )) {
    summary.outstanding = Math.max(
      summary.invoice.total - summary.receipt.total,
      0,
    );

    result[Number(customerId)] = summary;
  }

  return result;
}

export default function CustomersPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [customers, setCustomers] = useState<
    Customer[]
  >([]);
  const [stages, setStages] = useState<
    PipelineStage[]
  >([]);
  const [docSummary, setDocSummary] =
    useState<Record<number, DocSummary>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");
  const [includeInactive, setIncludeInactive] =
    useState(false);

  /*
   * PAGINATION (คำนวณฝั่ง client)
   * page เริ่มที่ 0 ตามที่ MUI ใช้
   */
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] =
    useState(10);

  const [detailTarget, setDetailTarget] =
    useState<Customer | null>(null);

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editing, setEditing] =
    useState<Customer | null>(null);
  const [form, setForm] =
    useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  /*
   * ปิดใช้งานแทนการลบ
   * ลูกค้าที่ปิดใช้งานจะถูกซ่อน แต่เปิดใช้งานอีกครั้งได้
   */
  const [deactivateTarget, setDeactivateTarget] =
    useState<Customer | null>(null);
  const [deactivating, setDeactivating] =
    useState(false);

  const [reactivateTarget, setReactivateTarget] =
    useState<Customer | null>(null);
  const [reactivating, setReactivating] =
    useState(false);

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [customersRes, stagesRes, docsRes] =
        await Promise.all([
          api.get<Customer[]>("/customers", {
            params: { includeInactive },
          }),
          api.get<PipelineStage[]>(
            "/pipeline-stages",
          ),
          api.get<DocumentItem[]>("/documents"),
        ]);

      setCustomers(customersRes.data);
      setStages(stagesRes.data);
      setDocSummary(
        summarizeDocs(docsRes.data),
      );

      if (stagesRes.data.length > 0) {
        setForm((current) =>
          current.status
            ? current
            : {
                ...current,
                status: stagesRes.data[0].stageKey,
              },
        );
      }
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
  }, [includeInactive]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    void Promise.resolve().then(() => loadAll());
  }, [ready, user, router, loadAll]);

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
          ? now.getTime() - 7 * 24 * 60 * 60 * 1000
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
          customer.assignedUser?.name,
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
  }, [
    customers,
    search,
    statusFilter,
    dateFilter,
  ]);

  /* =====================================================
     PAGINATION
     ====================================================== */

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / rowsPerPage),
  );

  /*
   * กันหน้าค้างตอน render
   * เช่น หลังลบลูกค้าจนหน้าสุดท้ายหายไป
   * ทำตรงนี้แทน useEffect เพราะไม่ต้องเด้ง render ซ้ำ
   */
  const safePage = Math.min(
    page,
    pageCount - 1,
  );

  const pagedCustomers = useMemo(() => {
    const start = safePage * rowsPerPage;

    return filtered.slice(
      start,
      start + rowsPerPage,
    );
  }, [filtered, safePage, rowsPerPage]);

  /*
   * เปลี่ยนตัวกรอง = กลับหน้าแรกเสมอ
   * เพราะข้อมูลหน้าปัจจุบันไม่เกี่ยวข้องกับผลลัพธ์ใหม่
   * (ทำใน handler ที่เปลี่ยนตัวกรอง ไม่ใช่ใน useEffect)
   */
  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function changeStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  function changeDateFilter(value: DateFilter) {
    setDateFilter(value);
    setPage(0);
  }

  const hasFilter =
    Boolean(search.trim()) ||
    Boolean(statusFilter) ||
    dateFilter !== "all" ||
    includeInactive;

  function resetFilters() {
    setSearch("");
    setStatusFilter("");
    setDateFilter("all");
    setIncludeInactive(false);
    setPage(0);
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
    let purchases = 0;

    for (const customer of filtered) {
      purchases += customer.purchaseCount ?? 0;

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

    return {
      quotation,
      invoiced,
      received,
      outstanding,
      purchases,
    };
  }, [filtered, docSummary]);

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
          "ข้อมูลไม่ถูกต้อง",
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
          "อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว",
          "success",
        );
      } else {
        await api.post("/customers", payload);

        showNotice(
          "เพิ่มลูกค้าใหม่เรียบร้อยแล้ว",
          "success",
        );
      }

      setDialogOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกข้อมูลลูกค้าได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ปิดใช้งานลูกค้า (soft delete)
   * ข้อมูลไม่ถูกลบ แค่ถูกซ่อนจากหน้าหลัก
   */
  async function handleDeactivate() {
    if (!deactivateTarget) {
      return;
    }

    setDeactivating(true);

    try {
      await api.delete(
        `/customers/${deactivateTarget.customerId}`,
      );

      showNotice(
        "ปิดใช้งานลูกค้าเรียบร้อยแล้ว",
        "success",
      );
      setDeactivateTarget(null);
      await loadAll();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถปิดใช้งานลูกค้าได้",
        ),
        "error",
      );
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  /*
   * เปิดใช้งานลูกค้าที่ปิดไว้กลับมา
   */
  async function handleReactivate() {
    if (!reactivateTarget) {
      return;
    }

    setReactivating(true);

    try {
      await api.patch(
        `/customers/${reactivateTarget.customerId}/restore`,
      );

      showNotice(
        "เปิดใช้งานลูกค้าอีกครั้งเรียบร้อยแล้ว",
        "success",
      );
      setReactivateTarget(null);
      await loadAll();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถเปิดใช้งานลูกค้าได้",
        ),
        "error",
      );
      setReactivateTarget(null);
    } finally {
      setReactivating(false);
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
      "Purchase Count",
      "Created",
    ];

    const body = filtered.map((customer) => {
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
        customer.purchaseCount,
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
              CUSTOMER DATABASE
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
              ลูกค้าทั้งหมด
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              คลิกแถวเพื่อดูรายละเอียด
              เอกสาร และสถานะใน
              Pipeline ของลูกค้า
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.25}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={filtered.length === 0}
              onClick={downloadCsv}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
                borderColor: "#bfdbfe",
                borderRadius: 2,
              }}
            >
              Export
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
              เพิ่มลูกค้าใหม่
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
              xl: "repeat(5, 1fr)",
            },
            gap: 2,
          }}
        >
          {[
            {
              label: "ลูกค้าที่แสดง",
              value: `${filtered.length}`,
              sub: `จากทั้งหมด ${customers.length} ราย`,
              color: "#2563eb",
            },
            {
              label: "Quotation รวม",
              value: formatBaht(totals.quotation),
              sub: "มูลค่าใบเสนอราคาทั้งหมด",
              color: "#0f62fe",
            },
            {
              label: "Invoice รวม",
              value: formatBaht(totals.invoiced),
              sub: `รับแล้ว ${formatBaht(
                totals.received,
              )}`,
              color: "#f97316",
            },
            {
              label: "ค้างชำระ",
              value: formatBaht(totals.outstanding),
              sub: "Invoice ที่ยังไม่มี Receipt",
              color: "#dc2626",
            },
            {
              label: "จำนวนการซื้อ",
              value: `${totals.purchases}`,
              sub: "Receipt สำเร็จของลูกค้าที่แสดง",
              color: "#16a34a",
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
              changeSearch(event.target.value)
            }
            placeholder="ค้นหาบริษัท อีเมล เบอร์โทร หรือชื่อ Sales..."
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
                      onClick={() =>
                        changeSearch("")
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
              changeStatusFilter(
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
              ทุกสถานะ
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
              changeDateFilter(
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

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={includeInactive}
                onChange={(event) =>
                  setIncludeInactive(
                    event.target.checked,
                  )
                }
              />
            }
            label="แสดงลูกค้าที่ปิดใช้งาน"
            sx={{
              mr: 0,
              "& .MuiFormControlLabel-label": {
                fontSize: 13,
                fontWeight: 700,
                color: "#475569",
                whiteSpace: "nowrap",
              },
            }}
          />

          {hasFilter && (
            <Button
              onClick={resetFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#64748b",
              }}
            >
              ล้างตัวกรอง
            </Button>
          )}

          <Typography
            variant="body2"
            sx={{
              ml: "auto",
              fontWeight: 700,
              color: "#64748b",
              whiteSpace: "nowrap",
            }}
          >
            แสดง {filtered.length} /{" "}
            {customers.length} รายการ
          </Typography>
        </Card>

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
            TABLE
        ================================================== */}

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
                    บริษัท / ลูกค้า
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    Sales ผู้รับผิดชอบ
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    สถานะใน Pipeline
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    เอกสาร
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: 500,
                        color: "#94a3b8",
                      }}
                    >
                      QT / IV / RC
                    </Typography>
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    จำนวนการซื้อ
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: 500,
                        color: "#94a3b8",
                      }}
                    >
                      Receipt สำเร็จ
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    ค้างชำระ
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    วันที่เพิ่ม
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    จัดการ
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({
                    /*
                     * ให้ความสูงตารางนิ่ง
                     * ไม่ว่าจะเลือกกี่แถวต่อหน้า
                     */
                    length: Math.min(
                      rowsPerPage,
                      10,
                    ),
                  }).map((_, row) => (
                    <TableRow key={`skeleton-${row}`}>
                      {[
                        220,
                        150,
                        140,
                        170,
                        130,
                        90,
                        140,
                      ].map(
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                        <TableCell colSpan={8}>
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
                            ? "ไม่พบผลลัพธ์"
                            : "ยังไม่มีลูกค้า"}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            color: "#94a3b8",
                          }}
                        >
                          {hasFilter
                            ? "ไม่พบลูกค้าที่ตรงกับตัวกรอง"
                            : "เริ่มเพิ่มลูกค้าตัวแรกได้จากปุ่มเพิ่มลูกค้าใหม่"}
                        </Typography>

                        {hasFilter && (
                          <Button
                            onClick={resetFilters}
                            sx={{
                              mt: 1.5,
                              textTransform: "none",
                            }}
                          >
                            ล้างตัวกรอง
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedCustomers.map((customer) => {
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
                          /*
                           * ลูกค้าที่ปิดใช้งานให้จางลง
                           * เพื่อแยกความแตกต่างจากลูกค้าปกติ
                           */
                          opacity: customer.isActive
                            ? 1
                            : 0.55,
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

                          {!customer.isActive && (
                            <Chip
                              size="small"
                              label="ปิดใช้งาน"
                              sx={{
                                mt: 0.5,
                                fontWeight: 800,
                                fontSize: 10,
                                height: 18,
                                borderRadius: "5px",
                                bgcolor: "#f1f5f9",
                                color: "#64748b",
                              }}
                            />
                          )}
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
                              ยังไม่ระบุ
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

                        <TableCell>
                          <Chip
                            size="small"
                            label={`ซื้อแล้ว ${customer.purchaseCount} ครั้ง`}
                            sx={{
                              fontWeight: 800,
                              fontSize: 11,
                              borderRadius: "7px",
                              bgcolor:
                                customer.purchaseCount > 0
                                  ? "#16a34a14"
                                  : "#f4f6f9",
                              color:
                                customer.purchaseCount > 0
                                  ? "#16a34a"
                                  : "#94a3b8",
                            }}
                          />
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
                              aria-label="ดูรายละเอียด"
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
                              aria-label="แก้ไขลูกค้า"
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
                              aria-label={
                                customer.isActive
                                  ? "ปิดใช้งานลูกค้า"
                                  : "เปิดใช้งานลูกค้าอีกครั้ง"
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                if (customer.isActive) {
                                  setDeactivateTarget(
                                    customer,
                                  );
                                } else {
                                  setReactivateTarget(
                                    customer,
                                  );
                                }
                              }}
                              sx={{
                                color: customer.isActive
                                  ? "#dc2626"
                                  : "#16a34a",
                              }}
                            >
                              {customer.isActive ? (
                                <BlockIcon fontSize="small" />
                              ) : (
                                <RestoreIcon fontSize="small" />
                              )}
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

          {/* =================================================
              PAGINATION
          ================================================== */}

          <TablePagination
            component="div"
            data-testid="customers-pagination"
            count={filtered.length}
            page={safePage}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, nextPage) =>
              setPage(nextPage)
            }
            onRowsPerPageChange={(event) => {
              setRowsPerPage(
                Number(event.target.value),
              );
              setPage(0);
            }}
            labelRowsPerPage="แถวต่อหน้า"
            labelDisplayedRows={({
              from,
              to,
              count,
            }) =>
              count === 0
                ? "ไม่มีรายการ"
                : `${from}-${to} จากทั้งหมด ${count} รายการ`
            }
            getItemAriaLabel={(type) => {
              switch (type) {
                case "first":
                  return "ไปหน้าแรก";
                case "last":
                  return "ไปหน้าสุดท้าย";
                case "next":
                  return "ไปหน้าถัดไป";
                default:
                  return "ไปหน้าก่อนหน้า";
              }
            }}
            sx={{
              borderTop: "1px solid #eef1f6",
              flexGrow: 0,
              "& .MuiTablePagination-toolbar": {
                minHeight: 56,
                px: 2,
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  fontWeight: 700,
                  color: "#64748b",
                },
            }}
          />
        </Card>
      </Box>

      {/* =================================================
          DETAIL DIALOG
      ================================================== */}

      {detailTarget && (
        <CustomerDetailDialog
          customer={detailTarget}
          stages={stages}
          onClose={() => setDetailTarget(null)}
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
                label="สถานะใน Pipeline"
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
          DEACTIVATE DIALOG
      ================================================== */}

      <Dialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ยืนยันการปิดใช้งาน
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            ต้องการปิดใช้งานลูกค้า{" "}
            <strong>
              {deactivateTarget?.companyName}
            </strong>{" "}
            ใช่หรือไม่?
          </Typography>

          <Typography
            component="div"
            variant="body2"
            sx={{
              mt: 1.5,
              color: "#64748b",
            }}
          >
            ลูกค้าที่ปิดใช้งานจะถูกซ่อนจากหน้าหลัก
            แต่ข้อมูลยังอยู่ในระบบ
            และสามารถเปิดใช้งานอีกครั้งได้
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeactivateTarget(null)}
            disabled={deactivating}
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deactivating}
            onClick={() => void handleDeactivate()}
            sx={{ textTransform: "none" }}
          >
            {deactivating
              ? "กำลังปิดใช้งาน..."
              : "ปิดใช้งาน"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================================================
          REACTIVATE DIALOG
      ================================================== */}

      <Dialog
        open={Boolean(reactivateTarget)}
        onClose={() => setReactivateTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ยืนยันการเปิดใช้งานอีกครั้ง
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            ต้องการเปิดใช้งานลูกค้า{" "}
            <strong>
              {reactivateTarget?.companyName}
            </strong>{" "}
            อีกครั้งใช่หรือไม่?
          </Typography>

          <Typography
            component="div"
            variant="body2"
            sx={{
              mt: 1.5,
              color: "#64748b",
            }}
          >
            ลูกค้าจะกลับมาแสดงในหน้าหลัก
            และกลับไปอยู่ใน Sales Pipeline ตามปกติ
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setReactivateTarget(null)}
            disabled={reactivating}
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>

          <Button
            variant="contained"
            disabled={reactivating}
            onClick={() => void handleReactivate()}
            sx={{
              textTransform: "none",
              bgcolor: "#16a34a",
              "&:hover": { bgcolor: "#15803d" },
            }}
          >
            {reactivating
              ? "กำลังเปิดใช้งาน..."
              : "เปิดใช้งานอีกครั้ง"}
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