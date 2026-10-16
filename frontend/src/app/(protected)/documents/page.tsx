"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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

import DocumentFormDialog from "@/components/DocumentFormDialog";
import type { DocumentForm } from "@/components/DocumentFormDialog";

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import {
  DOC_STATUS_LABELS,
  DOC_STATUS_STYLES,
  DOC_TYPE_LABELS,
  DOC_TYPE_LABELS_TH,
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

function getDateOptions(
  t: (
    key:
      | "dateFilter.all"
      | "dateFilter.today"
      | "dateFilter.7d"
      | "dateFilter.30d",
  ) => string,
) {
  return [
    { value: "all" as DateFilter, label: t("dateFilter.all") },
    { value: "today" as DateFilter, label: t("dateFilter.today") },
    { value: "7d" as DateFilter, label: t("dateFilter.7d") },
    { value: "30d" as DateFilter, label: t("dateFilter.30d") },
  ];
}

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

const emptyForm = {
  docType: "quotation",
  customerId: "",
  issueDate: "",
  dueDate: "",
  amount: "",
  status: "draft",
  refDocId: "",
  note: "",
};



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
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const { user, permissions, ready } = useSession();

  const docSchema = z.object({
    docType: z
      .string()
      .refine(
        (value) =>
          (DOC_TYPES as readonly string[]).includes(value),
        t("invalidDocType"),
      ),

    customerId: z
      .string()
      .min(1, t("selectCustomer")),

    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("dateRequired")),

    dueDate: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          /^\d{4}-\d{2}-\d{2}$/.test(value),
        t("invalidDateFormat"),
      ),

    amount: z
      .string()
      .refine(
        (value) =>
          value !== "" && Number(value) >= 0,
        t("amountRequired"),
      ),

    status: z.string().min(1, t("statusRequired")),

    refDocId: z.string(),

    note: z.string(),
  });

  const [tab, setTab] = useState<DocType>("quotation");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const docsUrl = useMemo(() => {
    if (!ready || !user) return null;

    const params = new URLSearchParams();
    params.set("type", tab);
    params.set("limit", String(rowsPerPage));
    params.set("page", String(page));

    if (search.trim()) {
      params.set("search", search.trim());
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

    return `/api/documents?${params.toString()}`;
  }, [ready, user, tab, page, search, dateFilter, rowsPerPage]);

  const {
    data: docsData,
    isLoading: loading,
    error: loadError,
    mutate: reloadDocs,
  } = useApi<{ data: DocumentItem[]; total: number }>(docsUrl);
  const { data: statsData } = useApi<DocumentStats>(
    ready && user ? "/api/documents/stats" : null,
  );
  const { data: customersData } = useApi<{ data: Customer[] }>(
    ready && user ? "/api/customers?limit=100" : null,
  );

  const docs = useMemo(
    () => docsData?.data ?? [],
    [docsData],
  );
  const stats = statsData ?? null;
  const customers = customersData?.data ?? [];

  const total = docsData?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(total / rowsPerPage),
  );

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

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  /* =====================================================
     FILTER (server-side)
  ====================================================== */

  const hasFilter =
    Boolean(search.trim()) || dateFilter !== "all";

  function resetFilters() {
    setSearch("");
    setDateFilter("all");
    setPage(1);
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

  function handleFormChange(
    updates: Partial<{
      docType: string;
      customerId: string;
      issueDate: string;
      dueDate: string;
      amount: string;
      status: string;
      refDocId: string;
      note: string;
    }>,
  ) {
    if (updates.docType) {
      changeDocType(updates.docType);
      return;
    }
    setForm((current) => ({ ...current, ...updates }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const result = docSchema.safeParse(form);

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
          t("documentUpdated"),
          "success",
        );
      } else {
        await api.post("/api/documents", {
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
          t("documentCreated"),
          "success",
        );
      }

      setDialogOpen(false);
      await reloadDocs();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          t("documentSaveError"),
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
          t("referenceDocNotFound"),
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
        t("documentDeleted"),
        "success",
      );
      setDeleteTarget(null);
      await reloadDocs();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          t("documentDeleteError"),
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

  const _fallbackPermissions: Permissions =
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
      sub: t("stats.quotationTotal", {
        amount: formatBaht(
          stats?.quotation.total ?? 0,
        ),
      }),
    },
    {
      type: "invoice",
      icon: <ReceiptLongIcon />,
      color: "#f97316",
      sub: t("stats.invoicePending", {
        amount: formatBaht(
          stats?.invoice.pendingAmount ?? 0,
        ),
      }),
    },
    {
      type: "receipt",
      icon: <PaidIcon />,
      color: "#16a34a",
      sub: t("stats.receiptTotal", {
        amount: formatBaht(
          stats?.receipt.total ?? 0,
        ),
      }),
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
              {t("commercialDocuments")}
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
              component="div"
              variant="body2"
              sx={{ mt: 0.5, color: "#64748b" }}
            >
              {t("subtitle")}
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
            {t("createNew")}
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
                        {t("unit")}
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
            placeholder={t("searchPlaceholder")}
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
                      aria-label={t("searchClearAria")}
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
            {getDateOptions(t).map((option) => (
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
              {t("clearFilters")}
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
            {t("showing")} {docs.length} {t("of")}{" "}
            {total} {t("entries")}
          </Typography>
        </Card>

        {/* ERROR */}

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("loadError")}
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
        ) : docs.length === 0 ? (
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
                  ? t("noResults")
                  : t("noDocuments")}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{ mt: 0.5, color: "#94a3b8" }}
              >
                {hasFilter
                  ? t("noResultsHint")
                  : t("noDocumentsHint", {
                      type: DOC_TYPE_LABELS_TH[tab],
                    })}
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
                {t("createNew")}
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
                        {t("docNo")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("type")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("customer")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("date")}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        {t("amount")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("creator")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("status")}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        {t("actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {docs.map((doc) => {
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
                                {t("reference")}{" "}
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
                                    ? t("createInvoice")
                                    : t("createReceipt")}
                                </Button>
                              )}

                              <IconButton
                                size="small"
                                aria-label={t("viewDetailsAria")}
                                onClick={() =>
                                  setViewTarget(doc)
                                }
                                sx={{ color: "#64748b" }}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label={t("editAria")}
                                onClick={() =>
                                  openEdit(doc)
                                }
                                sx={{ color: "#64748b" }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label={t("deleteAria")}
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

              {total > rowsPerPage && (
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

                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);

                      if (page > 3) {
                        pages.push("...");
                      }

                      const start = Math.max(2, page - 1);
                      const end = Math.min(
                        totalPages - 1,
                        page + 1,
                      );

                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }

                      if (page < totalPages - 2) {
                        pages.push("...");
                      }

                      pages.push(totalPages);
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
                              p === page
                                ? "#ffffff"
                                : "#475569",
                            bgcolor:
                              p === page
                                ? "#2563eb"
                                : "transparent",
                            "&:hover": {
                              bgcolor:
                                p === page
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
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      <DocumentFormDialog
        open={dialogOpen}
        editing={editing}
        form={form}
        customers={customers}
        refOptions={refOptions}
        formError={formError}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onFormChange={handleFormChange}
        onSubmit={handleSubmit}
      />

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
                    {t("customer")}
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
                    {t("creator")}
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
                    {t("issueDate")}
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
                      {t("dueDate")}
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
                  {t("amount")}
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
                    {t("reference")}{" "}
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
                      {t("viewDetails")}
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
                    {t("note")}
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
                {t("close")}
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
                {t("edit")}
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
          {t("deleteConfirmTitle")}
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            {t("deleteConfirmMessage", { docNo: deleteTarget?.docNo ?? "" })}
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
