"use client";

import { useCallback, useEffect, useState } from "react";

import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
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

import { PALETTE as GLOBAL_PALETTE } from "@/theme";

import { api, getErrorMessage } from "@/lib/api";

import { DOC_TYPE_LABELS_TH } from "@/lib/types";

import type {
  Customer,
  DocumentItem,
  PipelineStage,
} from "@/lib/types";

const customerDetailTheme = createTheme({
  palette: {
    primary: { main: GLOBAL_PALETTE.action.primary },
    secondary: { main: GLOBAL_PALETTE.text.secondary },
    text: {
      primary: GLOBAL_PALETTE.text.primary,
      secondary: GLOBAL_PALETTE.text.secondary,
      disabled: GLOBAL_PALETTE.text.muted,
    },
    background: {
      default: GLOBAL_PALETTE.background.default,
      paper: GLOBAL_PALETTE.background.subtle,
    },
    divider: GLOBAL_PALETTE.border.default,
  },
  typography: {
    fontFamily: "Roboto, Arial, Helvetica, sans-serif",
    h1: { fontWeight: 300, fontSize: 96, letterSpacing: -1.5 },
    h2: { fontWeight: 300, fontSize: 60, letterSpacing: -0.5 },
    h3: { fontWeight: 400, fontSize: 48, letterSpacing: 0 },
    h4: { fontWeight: 400, fontSize: 34, letterSpacing: 0.25 },
    h5: { fontWeight: 400, fontSize: 24, letterSpacing: 0 },
    h6: { fontWeight: 500, fontSize: 20, letterSpacing: 0.15 },
    subtitle1: { fontWeight: 400, fontSize: 16, letterSpacing: 0.15 },
    subtitle2: { fontWeight: 500, fontSize: 14, letterSpacing: 0.1 },
    body1: { fontWeight: 400, fontSize: 16, letterSpacing: 0.5 },
    body2: { fontWeight: 400, fontSize: 14, letterSpacing: 0.25 },
    button: {
      fontWeight: 500,
      fontSize: 14,
      letterSpacing: 1.25,
      textTransform: "uppercase",
    },
    caption: { fontWeight: 400, fontSize: 12, letterSpacing: 0.4 },
    overline: {
      fontWeight: 400,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
  },
});

function CustomerDetailDialogContent({
  customer,
  stages,
  onClose,
  onMove,
}: Props) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;
  const [detail, setDetail] =
    useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [moveMenuAnchor, setMoveMenuAnchor] =
    useState<null | HTMLElement>(null);

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

      const sumBy = (type: string) =>
        documents
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

  const stageColor = currentStage?.color ?? palette.primary.main;

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
            bgcolor: palette.background.default,
            fontFamily: "Roboto, Arial, Helvetica, sans-serif",
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
            borderBottom: `1px solid ${palette.divider}`,
            bgcolor: palette.background.paper,
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
                  bgcolor: palette.background.paper,
                  color: palette.text.primary,
                  border: `2px solid ${palette.divider}`,
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
                  variant="overline"
                  sx={{
                    color: palette.text.disabled,
                    display: "block",
                  }}
                >
                  {t("title")}
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    mt: 0.25,
                    color: palette.text.primary,
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
                    color: palette.background.default,
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
                  color: palette.text.secondary,
                  border: `1px solid ${palette.divider}`,
                  borderRadius: "10px",
                  "&:hover": { bgcolor: palette.background.paper },
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
            size="small"
            onClick={(e) =>
              setMoveMenuAnchor(e.currentTarget)
            }
            sx={{
              px: 2.5,
              py: 0.75,
              borderRadius: "8px",
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: 1.25,
              textTransform: "uppercase",
              color: palette.background.default,
              bgcolor: palette.secondary.main,
              "&:hover": { bgcolor: palette.primary.main },
            }}
          >
            {t("moveCard")}
          </Button>

          <Menu
            anchorEl={moveMenuAnchor}
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
                  border: `1px solid ${palette.divider}`,
                  fontFamily: "Roboto, Arial, Helvetica, sans-serif",
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
                      bgcolor: palette.background.paper,
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
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500 }}
                  >
                    {stage.label}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      ml: "auto",
                      fontWeight: 600,
                      color: palette.text.disabled,
                      bgcolor: palette.background.paper,
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
              borderBottom: `1px solid ${palette.divider}`,
              "& .MuiTab-root": {
                minHeight: 44,
                px: 2,
                fontWeight: 500,
                fontSize: 14,
                letterSpacing: 0.1,
                color: palette.text.secondary,
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
                  },
                  {
                    icon: <PhoneIcon sx={{ fontSize: 18 }} />,
                    label: t("phone"),
                    value: info.phone || "-",
                    color: "#16a34a",
                  },
                  {
                    icon: <PersonIcon sx={{ fontSize: 18 }} />,
                    label: t("salesResponsible"),
                    value: info.assignedUser?.name ?? t("unassigned"),
                    color: "#7c3aed",
                  },
                  {
                    icon: <EventIcon sx={{ fontSize: 18 }} />,
                    label: t("addedOn"),
                    value: formatDate(info.createdAt),
                    color: "#ea580c",
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
                      border: `1px solid ${palette.divider}`,
                      bgcolor: palette.background.default,
                      transition: "all 150ms ease",
                      "&:hover": {
                        borderColor: palette.text.disabled,
                        bgcolor: palette.background.paper,
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
                        bgcolor: `${item.color}15`,
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
                          color: palette.text.disabled,
                          display: "block",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: palette.text.primary,
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
                  bgcolor: palette.background.default,
                  border: `1px solid ${palette.divider}`,
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
                      bgcolor: palette.background.paper,
                      color: palette.text.secondary,
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 500 }}
                  >
                    {t("purchaseCount")}
                  </Typography>
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    color: (info.purchaseCount ?? 0) > 0
                      ? palette.text.primary
                      : palette.text.disabled,
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
                      icon: (
                        <AccountBalanceWalletIcon
                          sx={{ fontSize: 20 }}
                        />
                      ),
                      color: "#2563eb",
                    },
                    {
                      label: t("invoiceTotal"),
                      value: detail?.totals.invoiced ?? 0,
                      icon: (
                        <ReceiptIcon sx={{ fontSize: 20 }} />
                      ),
                      color: "#f97316",
                    },
                    {
                      label: t("received"),
                      value: detail?.totals.received ?? 0,
                      icon: (
                        <TrendingUpIcon
                          sx={{ fontSize: 20 }}
                        />
                      ),
                      color: "#16a34a",
                    },
                    {
                      label: t("outstanding"),
                      value: detail?.totals.outstanding ?? 0,
                      icon: (
                        <WarningIcon sx={{ fontSize: 20 }} />
                      ),
                      color: "#dc2626",
                    },
                  ].map((row) => (
                    <Box
                      key={row.label}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: `1px solid ${palette.divider}`,
                        bgcolor: palette.background.default,
                        transition: "all 150ms ease",
                        "&:hover": {
                          boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
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
                          variant="subtitle2"
                          sx={{ fontWeight: 500 }}
                        >
                          {row.label}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 500, color: palette.text.primary }}
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
                    border: `1px solid ${palette.divider}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          bgcolor: palette.background.paper,
                          "& th": {
                            borderBottom: `1px solid ${palette.divider}`,
                          },
                        }}
                      >
                        {[
                          t("docNo"),
                          t("type"),
                          t("date"),
                          t("amount"),
                        ].map((head) => (
                          <TableCell
                            key={head}
                            sx={{
                              fontWeight: 500,
                              color: palette.text.secondary,
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
                              bgcolor: palette.background.paper,
                            },
                            "&:last-child td": {
                              borderBottom: 0,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: palette.text.primary,
                              }}
                            >
                              {doc.docNo}
                            </Typography>

                            {doc.refDocNo && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  color: palette.text.disabled,
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
                                color: palette.text.secondary,
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
                              sx={{ color: palette.text.secondary }}
                            >
                              {formatDate(doc.issueDate)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                color: palette.text.primary,
                              }}
                            >
                              {formatBaht(doc.amount)}
                            </Typography>
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
                    border: `1px dashed ${palette.text.disabled}`,
                    borderRadius: "12px",
                  }}
                >
                  <ReceiptIcon
                    sx={{
                      fontSize: 36,
                      color: palette.text.disabled,
                      mb: 1,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: palette.text.disabled }}
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

export default function CustomerDetailDialog(props: Props) {
  return (
    <ThemeProvider theme={customerDetailTheme}>
      <CustomerDetailDialogContent {...props} />
    </ThemeProvider>
  );
}
