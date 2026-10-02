"use client";

import { useCallback, useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";

import { api, getErrorMessage } from "@/lib/api";

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

interface CustomerDetail {
  customer: Customer;
  documents: DocumentItem[];
  totals: {
    quotation: number;
    invoiced: number;
    received: number;
    outstanding: number;
  };
}

interface Props {
  customer: Customer;
  stages: PipelineStage[];
  onClose: () => void;
}

export function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "th-TH",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export function initials(name: string) {
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

export default function CustomerDetailDialog({
  customer,
  stages,
  onClose,
}: Props) {
  const [detail, setDetail] =
    useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const valid = documents.filter(
        (doc) =>
          doc.status !== "cancelled" &&
          doc.status !== "void",
      );

      const sumBy = (type: string) =>
        valid
          .filter((doc) => doc.docType === type)
          .reduce((sum, doc) => sum + doc.amount, 0);

      const invoiced = sumBy("invoice");
      const received = sumBy("receipt");

      setDetail({
        customer: customerRes.data,
        documents,
        totals: {
          quotation: sumBy("quotation"),
          invoiced,
          received,
          outstanding: Math.max(
            invoiced - received,
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
                currentStage?.label ?? info.status
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
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

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
                      ? initials(info.assignedUser.name)
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
                {[0, 1, 2, 3].map((row) => (
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
                      detail?.totals.outstanding ?? 0,
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
                  sx={{ bgcolor: "#fafcff" }}
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
                  <TableRow key={doc.docId} hover>
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
                            DOC_STATUS_STYLES[
                              doc.status
                            ]?.fg ?? "#475569",
                          bgcolor:
                            DOC_STATUS_STYLES[
                              doc.status
                            ]?.bg ?? "#f1f5f9",
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