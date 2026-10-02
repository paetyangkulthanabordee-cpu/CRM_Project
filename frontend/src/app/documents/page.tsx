"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { useRouter } from "next/navigation";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
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
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
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

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import {
  DOC_STATUS_LABELS,
  DOC_STATUS_STYLES,
  DOC_TYPE_LABELS,
  DOC_TYPE_LABELS_TH,
  DOCUMENT_STATUSES,
  DOC_TYPES,
  REF_TYPE,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

import type {
  Customer,
  DocType,
  DocumentItem,
  DocumentStats,
} from "@/lib/types";

type DateFilter = "all" | "today" | "7d" | "30d";

const DATE_OPTIONS: {
  value: DateFilter;
  label: string;
}[] = [
  { value: "all", label: "All Date" },
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วันที่ผ่านมา" },
  { value: "30d", label: "30 วันที่ผ่านมา" },
];

const DEFAULT_DOC_STATUS: Record<DocType, string> = {
  quotation: "draft",
  invoice: "pending",
  receipt: "completed",
};

const NEXT_TYPE: Record<DocType, DocType | null> = {
  quotation: "invoice",
  invoice: "receipt",
  receipt: null,
};

interface DocumentForm {
  docType: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  status: string;
  refDocId: string;
  note: string;
}

const emptyForm: DocumentForm = {
  docType: "quotation",
  customerId: "",
  issueDate: "",
  dueDate: "",
  amount: "",
  status: "draft",
  refDocId: "",
  note: "",
};

const docSchema = z.object({
  docType: z
    .string()
    .refine(
      (value) =>
        (DOC_TYPES as readonly string[]).includes(value),
      "ประเภทเอกสารไม่ถูกต้อง",
    ),

  customerId: z
    .string()
    .min(1, "กรุณาเลือกลูกค้า"),

  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาเลือกวันที่"),

  dueDate: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-\d{2}-\d{2}$/.test(value),
      "รูปแบบวันที่ไม่ถูกต้อง",
    ),

  amount: z
    .string()
    .refine(
      (value) =>
        value !== "" && Number(value) >= 0,
      "กรุณากรอกยอดรวม",
    ),

  status: z.string().min(1, "กรุณาเลือกสถานะ"),

  refDocId: z.string(),

  note: z.string(),
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [stats, setStats] =
    useState<DocumentStats | null>(null);
  const [customers, setCustomers] = useState<
    Customer[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<DocType>("quotation");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<DocumentItem | null>(null);
  const [form, setForm] =
    useState<DocumentForm>(emptyForm);
  const [refOptions, setRefOptions] = useState<
    DocumentItem[]
  >([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewTarget, setViewTarget] =
    useState<DocumentItem | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<DocumentItem | null>(null);
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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [docsRes, statsRes, customersRes] =
        await Promise.all([
          api.get<DocumentItem[]>("/documents"),
          api.get<DocumentStats>("/documents/stats"),
          api.get<Customer[]>("/customers"),
        ]);

      setDocs(docsRes.data);
      setStats(statsRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถโหลดเอกสารได้",
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
          ? now.getTime() -
            7 * 24 * 60 * 60 * 1000
          : dateFilter === "30d"
            ? now.getTime() -
              30 * 24 * 60 * 60 * 1000
            : null;

    return docs.filter((doc) => {
      if (doc.docType !== tab) {
        return false;
      }

      const matchesSearch =
        !query ||
        [
          doc.docNo,
          doc.refDocNo,
          doc.customerName,
          doc.creatorName,
        ].some((value) =>
          (value ?? "").toLowerCase().includes(query),
        );

      const matchesDate =
        dateLimit === null ||
        new Date(doc.issueDate).getTime() >= dateLimit;

      return matchesSearch && matchesDate;
    });
  }, [docs, search, tab, dateFilter]);

  const hasFilter =
    Boolean(search.trim()) || dateFilter !== "all";

  function resetFilters() {
    setSearch("");
    setDateFilter("all");
  }

  /* =====================================================
     CREATE / EDIT
  ====================================================== */

  async function loadRefOptions(type: DocType) {
    const refType = REF_TYPE[type];

    if (!refType) {
      setRefOptions([]);
      return;
    }

    try {
      const response = await api.get<
        DocumentItem[]
      >("/documents", {
        params: { type: refType },
      });

      setRefOptions(
        response.data.filter(
          (doc) =>
            doc.status !== "cancelled" &&
            doc.status !== "void",
        ),
      );
    } catch {
      setRefOptions([]);
    }
  }

  function openCreate(
    type: DocType = tab,
    refDoc?: DocumentItem,
  ) {
    setEditing(null);
    setForm({
      docType: type,
      customerId: refDoc?.customerId
        ? String(refDoc.customerId)
        : "",
      issueDate: today(),
      dueDate:
        type === "invoice" ? plusDays(30) : "",
      amount: refDoc
        ? String(refDoc.amount)
        : "",
      status: DEFAULT_DOC_STATUS[type],
      refDocId: refDoc
        ? String(refDoc.docId)
        : "",
      note: refDoc?.note ?? "",
    });
    setFormError("");
    setRefOptions([]);
    setDialogOpen(true);
    void loadRefOptions(type);
  }

  function openCreateNext(doc: DocumentItem) {
    const nextType = NEXT_TYPE[doc.docType];

    if (!nextType) {
      return;
    }

    openCreate(nextType, doc);
  }

  function openEdit(doc: DocumentItem) {
    setEditing(doc);
    setForm({
      docType: doc.docType,
      customerId: doc.customerId
        ? String(doc.customerId)
        : "",
      issueDate: doc.issueDate,
      dueDate: doc.dueDate ?? "",
      amount: String(doc.amount),
      status: doc.status,
      refDocId: "",
      note: doc.note ?? "",
    });
    setFormError("");
    setRefOptions([]);
    setDialogOpen(true);
    void loadRefOptions(doc.docType);
  }

  function changeDocType(docType: string) {
    setForm((current) => ({
      ...current,
      docType,
      status: DEFAULT_DOC_STATUS[docType as DocType],
      refDocId: "",
      dueDate:
        docType === "invoice" ? plusDays(30) : "",
    }));

    void loadRefOptions(docType as DocType);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const result = docSchema.safeParse(form);

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
      if (editing) {
        await api.patch(
          `/documents/${editing.docId}`,
          {
            customerId: Number(
              result.data.customerId,
            ),
            issueDate: result.data.issueDate,
            dueDate: result.data.dueDate || null,
            amount: Number(result.data.amount),
            status: result.data.status,
            note: result.data.note || null,
          },
        );

        showNotice(
          "อัปเดตเอกสารเรียบร้อยแล้ว",
          "success",
        );
      } else {
        await api.post("/documents", {
          docType: result.data.docType,
          customerId: Number(
            result.data.customerId,
          ),
          issueDate: result.data.issueDate,
          dueDate: result.data.dueDate || undefined,
          amount: Number(result.data.amount),
          status: result.data.status,
          note: result.data.note || undefined,
          refDocId: result.data.refDocId
            ? Number(result.data.refDocId)
            : undefined,
        });

        showNotice(
          "สร้างเอกสารเรียบร้อยแล้ว",
          "success",
        );
      }

      setDialogOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกเอกสารได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     VIEW / DELETE
  ====================================================== */

  async function openReference(docId: number) {
    try {
      const response = await api.get<DocumentItem>(
        `/documents/${docId}`,
      );

      setViewTarget(response.data);
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่พบเอกสารอ้างอิง",
        ),
        "error",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await api.delete(
        `/documents/${deleteTarget.docId}`,
      );

      showNotice(
        "ลบเอกสารเรียบร้อยแล้ว",
        "success",
      );
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถลบเอกสารได้",
        ),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
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

  const statCards: {
    type: DocType;
    icon: ReactNode;
    color: string;
    sub: string;
  }[] = [
    {
      type: "quotation",
      icon: <DescriptionIcon />,
      color: "#2563eb",
      sub: `รวมยอด ${formatBaht(
        stats?.quotation.total ?? 0,
      )}`,
    },
    {
      type: "invoice",
      icon: <ReceiptLongIcon />,
      color: "#f97316",
      sub: `รอจ่าย ${formatBaht(
        stats?.invoice.pendingAmount ?? 0,
      )}`,
    },
    {
      type: "receipt",
      icon: <PaidIcon />,
      color: "#16a34a",
      sub: `รวมยอด ${formatBaht(
        stats?.receipt.total ?? 0,
      )}`,
    },
  ];

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
        {/* HEADER */}

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
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="div"
              variant="overline"
              sx={{
                color: "#2563eb",
                fontWeight: 800,
                letterSpacing: 1.2,
              }}
            >
              COMMERCIAL DOCUMENTS
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
              จัดการเอกสารทางการค้า (Documents)
            </Typography>

            <Typography
              component="div"
              variant="body2"
              sx={{ mt: 0.5, color: "#64748b" }}
            >
              เอกสารอ้างอิงเชื่อมโยงกัน: ใบเสนอราคา →
              ใบแจ้งหนี้ → ใบเสร็จรับเงิน
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreate(tab)}
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
            สร้างเอกสารใหม่
          </Button>
        </Box>

        {/* STATS */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {statCards.map((card) => (
            <Card
              key={card.type}
              sx={{
                border: "1px solid #eceff4",
                borderRadius: "16px",
                bgcolor: "#ffffff",
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  "&:last-child": { pb: 2.5 },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${card.color}14`,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="div"
                    variant="body2"
                    sx={{ color: "#64748b" }}
                  >
                    {DOC_TYPE_LABELS_TH[card.type]} (
                    {DOC_TYPE_LABELS[card.type]})
                  </Typography>

                  <Typography
                    component="div"
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: "#0f172a",
                      lineHeight: 1.3,
                    }}
                  >
                    {loading ? (
                    <Skeleton
                      width={70}
                      height={34}
                    />
                  ) : (
                    <>
                      {stats?.[card.type].count ?? 0}
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          ml: 0.75,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        ฉบับ
                      </Typography>
                    </>
                  )}
                  </Typography>

                  {loading ? (
                    <Skeleton width={100} />
                  ) : (
                    <Typography
                      component="div"
                      variant="caption"
                      sx={{ color: card.color }}
                    >
                      {card.sub}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* TABS */}

        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 2,
            borderBottom: "1px solid #e8ecf2",
          }}
        >
          {DOC_TYPES.map((type) => (
            <Button
              key={type}
              onClick={() => setTab(type)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 14,
                px: 2,
                py: 1.25,
                borderRadius: 0,
                color:
                  tab === type
                    ? "#2563eb"
                    : "#64748b",
                borderBottom:
                  tab === type
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                "&:hover": {
                  bgcolor: "transparent",
                  color: "#2563eb",
                },
              }}
            >
              {DOC_TYPE_LABELS_TH[type]} (
              {DOC_TYPE_LABELS[type]}){" "}
              {loading ? (
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                >
                  <Skeleton width={20} height={16} />
                </Box>
              ) : (
                (stats?.[type].count ?? 0)
              )}
            </Button>
          ))}
        </Box>

        {/* TOOLBAR */}

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
            size="small"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า หรือผู้สร้าง..."
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
              maxWidth: 460,
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
            แสดง {filtered.length} /{" "}
            {stats?.[tab].count ?? 0} รายการ
          </Typography>
        </Card>

        {/* ERROR */}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* CONTENT */}

        {loading ? (
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
                    width={240}
                    height={30}
                  />
                </Box>

                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <Box
                    key={`row-skeleton-${index}`}
                    sx={{
                      px: 3,
                      py: 2.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 2.5,
                    }}
                  >
                    <Skeleton
                      width={150}
                      height={22}
                    />
                    <Skeleton width={90} />
                    <Skeleton width={130} />
                    <Skeleton width={110} />
                    <Box sx={{ flex: 1 }} />
                    <Skeleton width={90} />
                    <Skeleton
                      variant="circular"
                      width={30}
                      height={30}
                    />
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
                {hasFilter
                  ? "ไม่พบผลลัพธ์"
                  : "ยังไม่มีเอกสาร"}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{ mt: 0.5, color: "#94a3b8" }}
              >
                {hasFilter
                  ? "ไม่มีเอกสารที่ตรงกับการค้นหา/ตัวกรอง"
                  : `เริ่มต้นด้วยการสร้าง${
                      DOC_TYPE_LABELS_TH[tab]
                    } ใบแรก`}
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openCreate(tab)}
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
                สร้างเอกสารใหม่
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* TABLE */

          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: "#f8fafc",
                      }}
                    >
                      <TableCell sx={{ fontWeight: 800 }}>
                        เลขที่เอกสาร
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        ประเภท
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        ลูกค้า / บริษัท
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        วันที่
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        ยอดรวม
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        ผู้สร้าง
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        สถานะ
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
                    {filtered.map((doc) => {
                      const style =
                        DOC_STATUS_STYLES[
                          doc.status
                        ] ??
                        DOC_STATUS_STYLES.draft;

                      return (
                        <TableRow
                          key={doc.docId}
                          hover
                        >
                          <TableCell>
                            <Typography
                              component="button"
                              onClick={() =>
                                setViewTarget(doc)
                              }
                              sx={{
                                display: "block",
                                border: "none",
                                p: 0,
                                bgcolor: "transparent",
                                color: "#2563eb",
                                fontWeight: 800,
                                fontSize: 14,
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {doc.docNo}
                            </Typography>

                            {doc.refDocNo && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 0.25,
                                  color: "#94a3b8",
                                }}
                              >
                                อ้างอิง:{" "}
                                {doc.refDocNo}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                DOC_TYPE_LABELS[
                                  doc.docType
                                ]
                              }
                              sx={{
                                borderRadius: "8px",
                                fontWeight: 700,
                                bgcolor: "#eef2f7",
                                color: "#475569",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography
                              component="span"
                              sx={{ fontWeight: 700 }}
                            >
                              {doc.customerName ??
                                "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              doc.issueDate,
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                              }}
                            >
                              {formatBaht(doc.amount)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {doc.creatorName ?? "-"}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                DOC_STATUS_LABELS[
                                  doc.status
                                ] ?? doc.status
                              }
                              sx={{
                                borderRadius: "8px",
                                fontWeight: 700,
                                bgcolor: style.bg,
                                color: style.fg,
                              }}
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                justifyContent:
                                  "flex-end",
                                alignItems: "center",
                              }}
                            >
                              {NEXT_TYPE[
                                doc.docType
                              ] && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  endIcon={
                                    <ArrowForwardIcon />
                                  }
                                  onClick={() =>
                                    openCreateNext(
                                      doc,
                                    )
                                  }
                                  sx={{
                                    textTransform:
                                      "none",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color: "#2563eb",
                                    borderColor:
                                      "#bfdbfe",
                                    "&:hover": {
                                      borderColor:
                                        "#2563eb",
                                      bgcolor:
                                        "#f8fbff",
                                    },
                                  }}
                                >
                                  {doc.docType ===
                                  "quotation"
                                    ? "สร้างใบแจ้งหนี้"
                                    : "สร้างใบเสร็จ"}
                                </Button>
                              )}

                              <IconButton
                                size="small"
                                aria-label="ดูรายละเอียด"
                                onClick={() =>
                                  setViewTarget(doc)
                                }
                                sx={{ color: "#64748b" }}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label="แก้ไข"
                                onClick={() =>
                                  openEdit(doc)
                                }
                                sx={{ color: "#64748b" }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label="ลบ"
                                onClick={() =>
                                  setDeleteTarget(
                                    doc,
                                  )
                                }
                                sx={{ color: "#dc2626" }}
                              >
                                  <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
              ? `แก้ไขเอกสาร ${editing.docNo}`
              : "สร้างเอกสารใหม่"}
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
                select
                label="ประเภทเอกสาร"
                value={form.docType}
                onChange={(event) =>
                  changeDocType(
                    event.target.value,
                  )
                }
                disabled={saving || Boolean(editing)}
                helperText={
                  editing
                    ? "ไม่สามารถเปลี่ยนประเภทเอกสารได้"
                    : undefined
                }
              >
                {DOC_TYPES.map((type) => (
                  <MenuItem
                    key={type}
                    value={type}
                  >
                    {DOC_TYPE_LABELS_TH[type]} (
                    {DOC_TYPE_LABELS[type]})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                select
                label="ลูกค้า / บริษัท"
                value={form.customerId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customerId:
                      event.target.value,
                  }))
                }
                disabled={saving}
                required
              >
                <MenuItem value="">
                  <em>กรุณาเลือกลูกค้า</em>
                </MenuItem>

                {customers.map((customer) => (
                  <MenuItem
                    key={customer.customerId}
                    value={String(
                      customer.customerId,
                    )}
                  >
                    {customer.companyName}
                  </MenuItem>
                ))}
              </TextField>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2.5}
              >
                <TextField
                  fullWidth
                  label="วันที่ออกเอกสาร"
                  type="date"
                  value={form.issueDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      issueDate:
                        event.target.value,
                    }))
                  }
                  disabled={saving}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  required
                />

                {form.docType === "invoice" && (
                  <TextField
                    fullWidth
                    label="กำหนดชำระ"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dueDate:
                          event.target.value,
                      }))
                    }
                    disabled={saving}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />
                )}
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2.5}
              >
                <TextField
                  fullWidth
                  label="ยอดรวม (฿)"
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  disabled={saving}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  required
                />

                <TextField
                  fullWidth
                  select
                  label="สถานะ"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  disabled={saving}
                  required
                >
                  {(
                    DOCUMENT_STATUSES[
                      form.docType as DocType
                    ] ?? []
                  ).map((status) => (
                    <MenuItem
                      key={status}
                      value={status}
                    >
                      {DOC_STATUS_LABELS[status] ??
                        status}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {!editing &&
              REF_TYPE[
                form.docType as DocType
              ] && (
                <TextField
                  fullWidth
                  select
                  label={`เอกสารอ้างอิง (${
                    DOC_TYPE_LABELS[
                      REF_TYPE[
                        form.docType as DocType
                      ] as DocType
                    ]
                  })`}
                  value={
                    form.refDocId || "none"
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      refDocId:
                        event.target.value ===
                        "none"
                          ? ""
                          : event.target.value,
                    }))
                  }
                  disabled={saving}
                  helperText={
                    editing
                      ? "เอกสารที่สร้างไปแล้วไม่สามารถเปลี่ยนเอกสารอ้างอิงได้"
                      : "เว้นว่างไว้เพื่อสร้างเอกสารอิสระ หรือเลือกเอกสารที่ต้องการอ้างอิง"
                  }
                >
                  <MenuItem value="none">
                    <em>
                      ไม่อ้างอิง (สร้างอิสระ)
                    </em>
                  </MenuItem>

                  {refOptions.map((doc) => (
                    <MenuItem
                      key={doc.docId}
                      value={String(doc.docId)}
                    >
                      {doc.docNo} ·{" "}
                      {doc.customerName ?? "-"} ·{" "}
                      {formatBaht(doc.amount)}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                fullWidth
                label="หมายเหตุ"
                multiline
                minRows={2}
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                disabled={saving}
              />
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
                "สร้างเอกสาร"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =================================================
          VIEW DIALOG
      ================================================== */}

      <Dialog
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        {viewTarget && (
          <>
            <DialogTitle
              sx={{ pb: 1 }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    component="div"
                    variant="overline"
                    sx={{
                      color: "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {
                      DOC_TYPE_LABELS_TH[
                        viewTarget.docType
                      ]
                    }{" "}
                    (
                    {
                      DOC_TYPE_LABELS[
                        viewTarget.docType
                      ]
                    }
                    )
                  </Typography>

                  <Typography
                    component="div"
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {viewTarget.docNo}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={
                    DOC_STATUS_LABELS[
                      viewTarget.status
                    ] ?? viewTarget.status
                  }
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 700,
                    bgcolor:
                      (
                        DOC_STATUS_STYLES[
                          viewTarget.status
                        ] ??
                        DOC_STATUS_STYLES.draft
                      ).bg,
                    color:
                      (
                        DOC_STATUS_STYLES[
                          viewTarget.status
                        ] ??
                        DOC_STATUS_STYLES.draft
                      ).fg,
                  }}
                />
              </Box>
            </DialogTitle>

            <DialogContent>
              <Divider sx={{ mb: 2.5 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8" }}
                  >
                    ลูกค้า / บริษัท
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1a2233",
                    }}
                  >
                    {viewTarget.customerName ??
                      "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8" }}
                  >
                    ผู้สร้าง
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1a2233",
                    }}
                  >
                    {viewTarget.creatorName ??
                      "-"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8" }}
                  >
                    วันที่ออกเอกสาร
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1a2233",
                    }}
                  >
                    {formatDate(
                      viewTarget.issueDate,
                    )}
                  </Typography>
                </Box>

                {viewTarget.dueDate && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      กำหนดชำระ
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: "#1a2233",
                      }}
                    >
                      {formatDate(
                        viewTarget.dueDate,
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  mt: 2.5,
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "#f8fafc",
                  border:
                    "1px solid #eceff4",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  ยอดรวม
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {formatBaht(
                    viewTarget.amount,
                  )}
                </Typography>
              </Box>

              {viewTarget.refDocNo && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#64748b" }}
                  >
                    เอกสารอ้างอิง:{" "}
                    <strong>
                      {viewTarget.refDocNo}
                    </strong>
                  </Typography>

                  {viewTarget.refDocId && (
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={
                        <ArrowForwardIcon />
                      }
                      onClick={() =>
                        void openReference(
                          viewTarget.refDocId!,
                        )
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 12,
                        color: "#2563eb",
                        borderColor: "#bfdbfe",
                      }}
                    >
                      ดูเอกสารอ้างอิง
                    </Button>
                  )}
                </Box>
              )}

              {viewTarget.note && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "#94a3b8" }}
                  >
                    หมายเหตุ
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#475569" }}
                  >
                    {viewTarget.note}
                  </Typography>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() =>
                  setViewTarget(null)
                }
                sx={{ textTransform: "none" }}
              >
                ปิด
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  const doc = viewTarget;
                  setViewTarget(null);
                  openEdit(doc);
                }}
                sx={{ textTransform: "none" }}
              >
                แก้ไข
              </Button>
            </DialogActions>
          </>
        )}
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
            ต้องการลบเอกสาร{" "}
            <strong>
              {deleteTarget?.docNo}
            </strong>{" "}
            ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
