"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningIcon from "@mui/icons-material/Warning";

import { useTranslations } from "next-intl";

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
  onMove: (customerId: number, status: string) => void;
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
  onMove,
}: Props) {
  const t = useTranslations("customerDetail");
  const [detail, setDetail] =
    useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [moveMenuAnchor, setMoveMenuAnchor] =
    useState<null | HTMLElement>(null);
  const moveButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [customerRes, docsRes] =
        await Promise.all([
          api.get<Customer>(
            `/api/customers/${customer.customerId}`,
          ),
          api.get<{ data: DocumentItem[]; total: number }>(
            "/api/documents",
            {
              params: {
                customerId: customer.customerId,
              },
            },
          ),
        ]);

      const documents = docsRes.data.data;

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
          t("loadError"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [customer.customerId, t]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const info = detail?.customer ?? customer;

  const currentStage = stages.find(
    (stage) => stage.stageKey === info.status,
  );

  const stageColor = currentStage?.color ?? "#94a3b8";

  const handleMoveSelect = (stageKey: string) => {
    setMoveMenuAnchor(null);
    onMove(info.customerId, stageKey);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: "720px",
            maxWidth: "90vw",
            height: "600px",
            borderRadius: "16px",
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            background: `linear-gradient(135deg, ${stageColor}12 0%, ${stageColor}08 100%)`,
            borderBottom: "1px solid #eef1f6",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                minWidth: 0,
              }}
            >
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  fontSize: 18,
                  fontWeight: 800,
                  bgcolor: `${stageColor}20`,
                  color: stageColor,
                  border: `2px solid ${stageColor}30`,
                  flexShrink: 0,
                }}
              >
                {info.companyName
                  ? info.companyName
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  : "?"}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#94a3b8",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {t("title")}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontWeight: 800,
                    fontSize: 20,
                    color: "#0f172a",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {info.companyName}
                </Typography>

                <Chip
                  size="small"
                  sx={{
                    mt: 0.75,
                    fontWeight: 700,
                    borderRadius: "8px",
                    color: "#ffffff",
                    bgcolor: stageColor,
                  }}
                  label={
                    currentStage?.label ?? info.status
                  }
                />
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <IconButton
                onClick={onClose}
                aria-label={t("closeAria")}
                size="small"
                sx={{
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflowY: "auto" }}>
        {error && (
          <Alert
            severity="error"
            sx={{ m: 2, mb: 0 }}
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            px: 3,
            pt: 2.5,
          }}
        >
          <Button
            ref={moveButtonRef}
            size="small"
            onClick={(e) =>
              setMoveMenuAnchor(e.currentTarget)
            }
            sx={{
              px: 2.5,
              py: 0.75,
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "none",
              color: "#1d4ed8",
              bgcolor: "#e8f1ff",
              "&:hover": { bgcolor: "#dbeafe" },
            }}
          >
            {t("moveCard")}
          </Button>

          <Menu
            anchorEl={moveButtonRef.current}
            open={Boolean(moveMenuAnchor)}
            onClose={() => setMoveMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 220,
                  borderRadius: "12px",
                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            {stages
              .filter(
                (s) => s.stageKey !== info.status,
              )
              .map((stage) => (
                <MenuItem
                  key={stage.stageId}
                  onClick={() =>
                    handleMoveSelect(stage.stageKey)
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.25,
                    px: 2,
                    "&:hover": {
                      bgcolor: "#f8fafc",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "4px",
                      bgcolor: stage.color,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${stage.color}20`,
                    }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#334155",
                    }}
                  >
                    {stage.label}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      ml: "auto",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#94a3b8",
                      bgcolor: "#f1f5f9",
                      px: 1,
                      py: 0.25,
                      borderRadius: "6px",
                    }}
                  >
                    {stage.customerCount}
                  </Typography>
                </MenuItem>
              ))}
          </Menu>
        </Box>

        <Box sx={{ px: 3, pt: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 2.5,
              borderBottom: "1px solid #eef1f6",
              "& .MuiTab-root": {
                minHeight: 44,
                px: 2,
                fontWeight: 700,
                fontSize: 14,
                color: "#64748b",
                textTransform: "none",
              },
            }}
          >
            <Tab label={t("contactTab")} />
            <Tab label={t("summaryTab")} />
            <Tab label={t("documentsTab")} />
          </Tabs>
        </Box>

        <Box
          sx={{
            px: 3,
            pb: 3,
            animation: "fadeIn 200ms ease",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(4px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          {tab === 0 && (
            <Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                  gap: 1.5,
                }}
              >
                {[
                  {
                    icon: <EmailIcon sx={{ fontSize: 18 }} />,
                    label: t("email"),
                    value: info.email || "-",
                    color: "#2563eb",
                    bg: "#eff6ff",
                  },
                  {
                    icon: <PhoneIcon sx={{ fontSize: 18 }} />,
                    label: t("phone"),
                    value: info.phone || "-",
                    color: "#16a34a",
                    bg: "#f0fdf4",
                  },
                  {
                    icon: <PersonIcon sx={{ fontSize: 18 }} />,
                    label: t("salesResponsible"),
                    value: info.assignedUser?.name ?? t("unassigned"),
                    color: "#7c3aed",
                    bg: "#faf5ff",
                  },
                  {
                    icon: <EventIcon sx={{ fontSize: 18 }} />,
                    label: t("addedOn"),
                    value: formatDate(info.createdAt),
                    color: "#ea580c",
                    bg: "#fff7ed",
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: "12px",
                      border: "1px solid #eef1f6",
                      bgcolor: "#fafcff",
                      transition: "all 150ms ease",
                      "&:hover": {
                        borderColor: "#c7d2fe",
                        bgcolor: "#f8fafc",
                        boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: item.bg,
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#94a3b8",
                          fontSize: 11,
                          display: "block",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: "#1a2233",
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  bgcolor: "#fafcff",
                  border: "1px solid #eef1f6",
                  borderRadius: "12px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#e8f1ff",
                      color: "#1d4ed8",
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#475569",
                      fontSize: 14,
                    }}
                  >
                    {t("purchaseCount")}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 18,
                    color:
                      (info.purchaseCount ?? 0) > 0
                        ? "#16a34a"
                        : "#94a3b8",
                  }}
                >
                  {info.purchaseCount ?? 0} {t("unit")}
                </Typography>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              {loading ? (
                <Stack spacing={1.5}>
                  {[0, 1, 2, 3].map((row) => (
                    <Skeleton
                      key={row}
                      height={64}
                      sx={{ borderRadius: "12px" }}
                    />
                  ))}
                </Stack>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                    },
                    gap: 1.5,
                  }}
                >
                  {[
                    {
                      label: t("quotationTotal"),
                      value: detail?.totals.quotation ?? 0,
                      color: "#2563eb",
                      bg: "#eff6ff",
                      icon: (
                        <AccountBalanceWalletIcon
                          sx={{ fontSize: 20 }}
                        />
                      ),
                    },
                    {
                      label: t("invoiceTotal"),
                      value: detail?.totals.invoiced ?? 0,
                      color: "#f97316",
                      bg: "#fff7ed",
                      icon: (
                        <ReceiptIcon sx={{ fontSize: 20 }} />
                      ),
                    },
                    {
                      label: t("received"),
                      value: detail?.totals.received ?? 0,
                      color: "#16a34a",
                      bg: "#f0fdf4",
                      icon: (
                        <TrendingUpIcon
                          sx={{ fontSize: 20 }}
                        />
                      ),
                    },
                    {
                      label: t("outstanding"),
                      value: detail?.totals.outstanding ?? 0,
                      color: "#dc2626",
                      bg: "#fef2f2",
                      icon: (
                        <WarningIcon sx={{ fontSize: 20 }} />
                      ),
                    },
                  ].map((row) => (
                    <Box
                      key={row.label}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: `1px solid ${row.color}20`,
                        bgcolor: row.bg,
                        transition: "all 150ms ease",
                        "&:hover": {
                          boxShadow: `0 4px 12px ${row.color}15`,
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            color: row.color,
                            display: "flex",
                          }}
                        >
                          {row.icon}
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: "#475569",
                            fontSize: 13,
                          }}
                        >
                          {row.label}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: 22,
                          color: row.color,
                        }}
                      >
                        {formatBaht(row.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box>
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
                          bgcolor: "#f8fafc",
                          "& th": {
                            borderBottom:
                              "1px solid #e7ebf2",
                          },
                        }}
                      >
                        {[
                          t("docNo"),
                          t("type"),
                          t("date"),
                          t("amount"),
                          t("status"),
                        ].map((head) => (
                          <TableCell
                            key={head}
                            sx={{
                              fontWeight: 800,
                              color: "#475569",
                              py: 1.5,
                              fontSize: 13,
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
                          sx={{
                            "&:hover": {
                              bgcolor: "#f8fafc",
                            },
                            "&:last-child td": {
                              borderBottom: 0,
                            },
                          }}
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
                                  fontSize: 11,
                                }}
                              >
                                {t("reference")} {doc.refDocNo}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: "#475569",
                                fontSize: 13,
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
                              sx={{
                                color: "#475569",
                                fontSize: 13,
                              }}
                            >
                              {formatDate(doc.issueDate)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                                fontSize: 13,
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
                    py: 6,
                    textAlign: "center",
                    border: "1px dashed #d7dee8",
                    borderRadius: "12px",
                  }}
                >
                  <ReceiptIcon
                    sx={{
                      fontSize: 36,
                      color: "#cbd5e1",
                      mb: 1,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: "#94a3b8" }}
                  >
                    {t("noDocuments")}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
