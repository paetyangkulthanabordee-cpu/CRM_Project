"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
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

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import {
  DOC_STATUS_LABELS,
  DOC_STATUS_STYLES,
  DOC_TYPE_LABELS_TH,
} from "@/lib/types";

import type {
  Customer,
  DocumentItem,
  PipelineStage,
} from "@/lib/types";

/* สีพื้นหลังการ์ดนับในหัวคอลัมน์ */
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

import type { Permissions } from "@/lib/auth";

interface CustomerDetail {
  customer: Customer;
  documents: DocumentItem[];
  totals: {
    quotation: number;
    invoice: number;
    receipt: number;
    invoiced: number;
    received: number;
    outstanding: number;
  };
}

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "th-TH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function initials(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "—";
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

  return (
    <Box
      data-testid="pipeline-column"
      data-status={stage.stageKey}
      sx={{
        width: 272,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 250px)",
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
        ref={setNodeRef}
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
          {customers.map((customer) => (
            <SortableCard
              key={customer.customerId}
              customer={customer}
              onOpen={onOpen}
            />
          ))}
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
   DETAIL DIALOG
   ====================================================== */

function DetailDialog({
  customer,
  stages,
  onClose,
  onChanged,
}: {
  customer: Customer;
  stages: PipelineStage[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] =
    useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [customerRes, docsRes] =
        await Promise.all([
          api.get<Customer>(
            `/customers/${customer.customerId}`,
          ),
          api.get<DocumentItem[]>(
            "/documents",
            {
              params: {
                customerId: customer.customerId,
              },
            },
          ),
        ]);

      const documents = docsRes.data;

      const sumBy = (
        type: string,
      ) =>
        documents
          .filter(
            (doc) =>
              doc.docType === type &&
              doc.status !== "cancelled" &&
              doc.status !== "void",
          )
          .reduce(
            (sum, doc) => sum + doc.amount,
            0,
          );

      const invoiced = sumBy("invoice");

      setDetail({
        customer: customerRes.data,
        documents,
        totals: {
          quotation: sumBy("quotation"),
          invoice: invoiced,
          receipt: sumBy("receipt"),
          invoiced,
          received: sumBy("receipt"),
          outstanding: Math.max(
            invoiced - sumBy("receipt"),
            0,
          ),
        },
      });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถโหลดรายละเอียดลูกค้าได้",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [customer.customerId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function changeStatus(
    status: string,
  ) {
    setSaving(true);

    try {
      await api.patch(
        `/customers/${customer.customerId}`,
        { status },
      );

      await load();
      onChanged();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถเปลี่ยนสถานะได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const info = detail?.customer ?? customer;

  const currentStage = stages.find(
    (stage) => stage.stageKey === info.status,
  );

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 13,
                color: "#94a3b8",
                letterSpacing: 0.6,
              }}
            >
              CUSTOMER DETAIL
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                fontWeight: 800,
                fontSize: 22,
                color: "#0f172a",
                lineHeight: 1.25,
              }}
            >
              {info.companyName}
            </Typography>

            <Chip
              size="small"
              sx={{
                mt: 1,
                fontWeight: 700,
                borderRadius: "8px",
                color: "#ffffff",
                bgcolor: currentStage
                  ? currentStage.color
                  : "#94a3b8",
              }}
              label={
                currentStage?.label ??
                info.status
              }
            />
          </Box>

          <IconButton
            onClick={onClose}
            aria-label="ปิด"
            size="small"
            sx={{ color: "#64748b" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() =>
              setError("")
            }
          >
            {error}
          </Alert>
        )}

        {/* ---- pipeline status switcher ---- */}
        <Typography
          sx={{
            fontWeight: 800,
            color: "#172033",
            mb: 1.25,
          }}
        >
          สถานะใน Pipeline
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 3,
          }}
        >
          {stages.map((stage) => {
            const active =
              info.status === stage.stageKey;

            return (
              <Button
                key={stage.stageId}
                size="small"
                disabled={saving}
                onClick={() =>
                  void changeStatus(
                    stage.stageKey,
                  )
                }
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active
                    ? stage.color
                    : "#dbe2ec",
                  bgcolor: active
                    ? `${stage.color}14`
                    : "#ffffff",
                  color: active
                    ? stage.color
                    : "#64748b",
                }}
              >
                {stage.label}
              </Button>
            );
          })}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* ---- info + totals ---- */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
            },
            gap: 3,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                color: "#172033",
                mb: 1.5,
              }}
            >
              ข้อมูลติดต่อ
            </Typography>

            <Stack spacing={1.25}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  อีเมล
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#1a2233",
                  }}
                >
                  {info.email || "-"}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  เบอร์โทร
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#1a2233",
                  }}
                >
                  {info.phone || "-"}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  Sales ผู้รับผิดชอบ
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 26,
                      height: 26,
                      fontSize: 11,
                      fontWeight: 800,
                      bgcolor: "#e8f1ff",
                      color: "#1d4ed8",
                    }}
                  >
                    {info.assignedUser?.name
                      ? initials(
                          info.assignedUser.name,
                        )
                      : "?"}
                  </Avatar>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1a2233",
                    }}
                  >
                    {info.assignedUser?.name ??
                      "ยังไม่ระบุ"}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  เพิ่มเมื่อ
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#1a2233",
                  }}
                >
                  {formatDate(info.createdAt)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                color: "#172033",
                mb: 1.5,
              }}
            >
              สรุปยอดเอกสาร
            </Typography>

            {loading ? (
              <Stack spacing={1}>
                {[0, 1, 2].map((row) => (
                  <Skeleton
                    key={row}
                    height={34}
                  />
                ))}
              </Stack>
            ) : (
              <Stack spacing={1}>
                {[
                  {
                    label: "Quotation ทั้งหมด",
                    value:
                      detail?.totals.quotation ?? 0,
                    color: "#2563eb",
                  },
                  {
                    label: "Invoice ทั้งหมด",
                    value:
                      detail?.totals.invoiced ?? 0,
                    color: "#f97316",
                  },
                  {
                    label: "รับแล้ว (Receipt)",
                    value:
                      detail?.totals.received ?? 0,
                    color: "#16a34a",
                  },
                  {
                    label: "ค้างชำระ",
                    value:
                      detail?.totals.outstanding ??
                      0,
                    color: "#dc2626",
                  },
                ].map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      bgcolor: "#fafcff",
                      border: "1px solid #eef1f6",
                      borderRadius: "10px",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      {row.label}
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: row.color,
                      }}
                    >
                      {formatBaht(row.value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* ---- documents ---- */}
        <Typography
          sx={{
            fontWeight: 800,
            color: "#172033",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DescriptionIcon fontSize="small" />
          เอกสารทั้งหมดของลูกค้า
        </Typography>

        {loading ? (
          <Stack spacing={1}>
            {[0, 1, 2].map((row) => (
              <Skeleton
                key={row}
                height={44}
              />
            ))}
          </Stack>
        ) : detail &&
          detail.documents.length > 0 ? (
          <Box
            sx={{
              border: "1px solid #e7ebf2",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "#fafcff",
                  }}
                >
                  {[
                    "เลขที่",
                    "ประเภท",
                    "วันที่",
                    "ยอดรวม",
                    "สถานะ",
                  ].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        fontWeight: 800,
                        color: "#475569",
                        py: 1.25,
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {detail.documents.map((doc) => (
                  <TableRow
                    key={doc.docId}
                    hover
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: "#2563eb",
                          fontSize: 13,
                        }}
                      >
                        {doc.docNo}
                      </Typography>

                      {doc.refDocNo && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "#94a3b8",
                          }}
                        >
                          อ้างอิง: {doc.refDocNo}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        {
                          DOC_TYPE_LABELS_TH[
                            doc.docType
                          ]
                        }
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: "#475569" }}
                      >
                        {formatDate(doc.issueDate)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {formatBaht(doc.amount)}
                      </Typography>
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
                          fontWeight: 700,
                          borderRadius: "8px",
                          fontSize: 11,
                          color:
                            (DOC_STATUS_STYLES[
                              doc.status
                            ]?.fg) ?? "#475569",
                          bgcolor:
                            (DOC_STATUS_STYLES[
                              doc.status
                            ]?.bg) ?? "#f1f5f9",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box
            sx={{
              py: 5,
              textAlign: "center",
              border: "1px dashed #d7dee8",
              borderRadius: "12px",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#94a3b8" }}
            >
              ยังไม่มีเอกสารของลูกค้ารายนี้
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
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
  const [activeId, setActiveId] =
    useState<Customer | null>(null);
  const [dragging, setDragging] =
    useState<Customer | null>(null);
  const [notice, setNotice] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
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

  const byColumn = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = customers.filter(
      (customer) =>
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
        ),
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
  }, [customers, stages, search]);

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
          "ไม่สามารถอัปเดตสถานะได้",
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

  const searching = search.trim().length > 0;

  const totalVisible = stages.reduce(
    (sum, stage) =>
      sum + (byColumn[stage.stageKey]?.length ?? 0),
    0,
  );

  /*
   * ระหว่างค้นหา แสดงเฉพาะคอลัมน์ที่มีผลลัพธ์
   * ถ้าไม่เจอเลย แสดงข้อความว่าไม่พบผลลัพธ์
   */
  const visibleStages = searching
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
              คลิกการ์ดเพื่อดูรายละเอียดและเอกสารของลูกค้า
            </Typography>
          </Box>

          <TextField
            size="small"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="ค้นหาลูกค้า หรือชื่อ Sales..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="ล้างการค้นหา"
                      onClick={() => setSearch("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              width: { xs: "100%", sm: 320 },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#ffffff",
                borderRadius: "12px",
              },
            }}
          />
        </Box>

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
                  {[0, 1].map((row) => (
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
        ) : searching &&
          totalVisible === 0 ? (
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
              ไม่พบลูกค้าที่ตรงกับคำค้นหานี้
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
              {visibleStages.map((stage, index) => (
                <Column
                  key={stage.stageId}
                  stage={stage}
                  index={index}
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
        <DetailDialog
          customer={activeId}
          stages={stages}
          onClose={() => setActiveId(null)}
          onChanged={() => {
            void loadCustomers();
          }}
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