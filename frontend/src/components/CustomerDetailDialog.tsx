"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useState,
} from "react";

import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
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
import Tooltip from "@mui/material/Tooltip";
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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useTranslations } from "next-intl";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PALETTE as GLOBAL_PALETTE } from "@/theme";

import { api, getErrorMessage } from "@/lib/api";

import { getPermissionsSnapshot } from "@/lib/auth";

import { DOC_TYPE_LABELS_TH } from "@/lib/types";

import type {
  Customer,
  DocumentItem,
  IssueOrder,
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
  const [orders, setOrders] = useState<IssueOrder[]>([]);
  const [ordersDenied, setOrdersDenied] =
    useState(false);
  const [expandedOrderId, setExpandedOrderId] =
    useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    /*
     * โหลดใบสั่งซื้อแยกต่างหาก เพราะ endpoint นี้ต้องมีสิทธิ์
     * orderPipeline ถ้าผู้ใช้ไม่มีสิทธิ์จะได้ 403
     * จึงต้องกันไม่ให้ error นี้ไปกระทบการโหลดข้อมูลลูกค้า
     */
    const canViewOrders =
      getPermissionsSnapshot()?.orderPipeline ?? false;

    const ordersTask = canViewOrders
      ? api
          .get<IssueOrder[]>("/api/issue-orders", {
            params: {
              customerId: customer.customerId,
            },
          })
          .then((res) => {
            setOrders(res.data);
            setOrdersDenied(false);
          })
          .catch(() => {
            setOrders([]);
            setOrdersDenied(true);
          })
      : Promise.resolve().then(() => {
          setOrders([]);
          setOrdersDenied(true);
        });

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
                limit: 100,
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

      await ordersTask;
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
            width: "960px",
            maxWidth: "94vw",
            height: "min(780px, 88vh)",
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
                  component="div"
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
                gap: 1,
                flexShrink: 0,
              }}
            >
              <Tooltip
                title={t("moveCard")}
                placement="bottom-end"
              >
                <IconButton
                  onClick={(e) =>
                    setMoveMenuAnchor(e.currentTarget)
                  }
                  aria-label={t("moveCard")}
                  size="small"
                  sx={{
                    color: palette.text.secondary,
                    border: `1px solid ${palette.divider}`,
                    borderRadius: "10px",
                    "&:hover": { bgcolor: palette.background.paper },
                  }}
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </Tooltip>

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
            <Tab label={t("dashboardTab")} />
            <Tab label={t("contactTab")} />
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
            <DashboardTab
              customer={info}
              detail={detail}
              orders={orders}
              ordersDenied={ordersDenied}
              expandedOrderId={expandedOrderId}
              onToggleExpand={(orderId) =>
                setExpandedOrderId((prev) =>
                  prev === orderId ? null : orderId,
                )
              }
              loading={loading}
            />
          )}

          {tab === 1 && (
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
              ) : (
                <DocumentsTable
                  documents={detail?.documents ?? []}
                />
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================
   ตารางเอกสาร
   ใช้ซ้ำทั้งในแท็บ "เอกสาร" และแท็บ "แดชบอร์ด"
===================================================== */
function DocumentsTable({
  documents,
}: {
  documents: DocumentItem[];
}) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  if (documents.length === 0) {
    return (
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
    );
  }

  return (
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
          {documents.map((doc) => (
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
                  {DOC_TYPE_LABELS_TH[doc.docType]}
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
  );
}

/* =====================================================
   กล่องข้อความว่าง (ใช้ซ้ำในแท็บแดชบอร์ด)
===================================================== */
function EmptyStateBox({ message }: { message: string }) {
  const palette = useTheme().palette;

  return (
    <Box
      sx={{
        py: 5,
        textAlign: "center",
        border: `1px dashed ${palette.text.disabled}`,
        borderRadius: "12px",
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: palette.text.disabled }}
      >
        {message}
      </Typography>
    </Box>
  );
}

/* แกน Y ของกราฟ ย่อตัวเลขให้สั้น เช่น 125000 -> 125k */
function formatCompactBaht(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `${(
      value / 1000000
    ).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return value.toLocaleString("th-TH");
}

/*
 * ยอดใบสั่งซื้อรายเดือน ย้อนหลัง 6 เดือน
 * คืนค่า label + total พร้อมใช้กับกราฟโดยตรง
 */
function buildMonthlyTotals(orders: IssueOrder[]) {
  const months: {
    key: string;
    label: string;
    total: number;
  }[] = [];

  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1,
    );

    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("th-TH", {
        month: "short",
      }),
      total: 0,
    });
  }

  for (const order of orders) {
    const created = new Date(order.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const month = months.find((item) => item.key === key);

    if (month) {
      month.total += order.amount;
    }
  }

  return months.map(({ label, total }) => ({
    label,
    total,
  }));
}

/* =====================================================
   แท็บแดชบอร์ด
   สรุปทุกอย่างของลูกค้ารายนั้นไว้ในที่เดียว
   สถานะ + KPI + กราฟ + ใบสั่งซื้อ + เอกสาร
===================================================== */
interface DashboardTabProps {
  customer: Customer;
  detail: CustomerDetail | null;
  orders: IssueOrder[];
  ordersDenied: boolean;
  expandedOrderId: number | null;
  onToggleExpand: (orderId: number) => void;
  loading: boolean;
}

function DashboardTab({
  customer,
  detail,
  orders,
  ordersDenied,
  expandedOrderId,
  onToggleExpand,
  loading,
}: DashboardTabProps) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  const totals = detail?.totals;
  const documents = detail?.documents ?? [];

  const orderTotal = orders.reduce(
    (sum, order) => sum + order.amount,
    0,
  );

  const purchaseOrderTotal = documents
    .filter((doc) => doc.docType === "purchase_order")
    .reduce((sum, doc) => sum + doc.amount, 0);

  const docsByType = [
    {
      label: "QT",
      total: totals?.quotation ?? 0,
      color: "#2563eb",
    },
    {
      label: "IV",
      total: totals?.invoiced ?? 0,
      color: "#f97316",
    },
    {
      label: "RC",
      total: totals?.received ?? 0,
      color: "#16a34a",
    },
    {
      label: "PO",
      total: purchaseOrderTotal,
      color: "#7c3aed",
    },
  ];

  const docsHasData = docsByType.some(
    (item) => item.total > 0,
  );

  const monthlyData = buildMonthlyTotals(orders);

  const kpis = [
    {
      label: t("totalPurchasedAmount"),
      value: ordersDenied
        ? "—"
        : formatBaht(orderTotal),
      icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,
      color: "#2563eb",
    },
    {
      label: t("orderCount"),
      value: ordersDenied
        ? "—"
        : `${orders.length} ${t("orderUnit")}`,
      icon: <ShoppingCartIcon sx={{ fontSize: 20 }} />,
      color: "#7c3aed",
    },
    {
      label: t("purchaseCount"),
      value: `${customer.purchaseCount ?? 0} ${t("unit")}`,
      icon: <ReceiptIcon sx={{ fontSize: 20 }} />,
      color: "#0891b2",
    },
    {
      label: t("received"),
      value: formatBaht(totals?.received ?? 0),
      icon: (
        <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
      ),
      color: "#16a34a",
    },
    {
      label: t("outstanding"),
      value: formatBaht(totals?.outstanding ?? 0),
      icon: <WarningIcon sx={{ fontSize: 20 }} />,
      color: "#dc2626",
    },
  ];

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Skeleton
          height={64}
          sx={{ borderRadius: "12px" }}
        />
        <Skeleton
          height={112}
          sx={{ borderRadius: "12px" }}
        />
        <Skeleton
          height={230}
          sx={{ borderRadius: "12px" }}
        />
        <Skeleton
          height={160}
          sx={{ borderRadius: "12px" }}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* KPI การ์ดสรุปยอด */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(5, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {kpis.map((kpi) => (
          <Box
            key={kpi.label}
            sx={{
              p: 1.75,
              borderRadius: "12px",
              border: `1px solid ${palette.divider}`,
              bgcolor: palette.background.default,
              minWidth: 0,
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
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: `${kpi.color}15`,
                  color: kpi.color,
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: palette.text.disabled,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {kpi.label}
              </Typography>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: 18,
                color: palette.text.primary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {kpi.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* กราฟ 2 ตัว: ยอดเอกสารตามประเภท + ยอดซื้อ 6 เดือน */}
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
        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            border: `1px solid ${palette.divider}`,
            bgcolor: palette.background.default,
            minWidth: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            {t("docsByType")}
          </Typography>

          {docsHasData ? (
            <ResponsiveContainer
              width="100%"
              height={180}
            >
              <BarChart
                data={docsByType}
                margin={{
                  top: 0,
                  right: 8,
                  left: -8,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={palette.divider}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactBaht}
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <ChartTooltip
                  cursor={{
                    fill: palette.background.paper,
                  }}
                  formatter={(value) =>
                    formatBaht(Number(value))
                  }
                />
                <Bar
                  dataKey="total"
                  radius={[6, 6, 0, 0]}
                >
                  {docsByType.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyStateBox
              message={t("chartNoData")}
            />
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            border: `1px solid ${palette.divider}`,
            bgcolor: palette.background.default,
            minWidth: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            {t("ordersByMonth")}
          </Typography>

          {!ordersDenied && orders.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={180}
            >
              <BarChart
                data={monthlyData}
                margin={{
                  top: 0,
                  right: 8,
                  left: -8,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={palette.divider}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactBaht}
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <ChartTooltip
                  cursor={{
                    fill: palette.background.paper,
                  }}
                  formatter={(value) =>
                    formatBaht(Number(value))
                  }
                />
                <Bar
                  dataKey="total"
                  fill={palette.primary.main}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyStateBox
              message={
                ordersDenied
                  ? t("noOrderPermission")
                  : t("chartNoData")
              }
            />
          )}
        </Box>
      </Box>

      {/* ใบสั่งซื้อ + รายการสินค้า (คลิกแถวเพื่อขยาย) */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <ShoppingCartIcon
            sx={{
              fontSize: 18,
              color: palette.text.secondary,
            }}
          />

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700 }}
          >
            {t("ordersSection")}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: palette.text.disabled,
              bgcolor: palette.background.paper,
              px: 1,
              py: 0.25,
              borderRadius: "6px",
            }}
          >
            {ordersDenied ? "—" : orders.length}
          </Typography>
        </Box>

        {ordersDenied ? (
          <EmptyStateBox
            message={t("noOrderPermission")}
          />
        ) : orders.length === 0 ? (
          <EmptyStateBox message={t("noOrders")} />
        ) : (
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
                    t("orderNo"),
                    t("date"),
                    t("stageHeader"),
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

                  <TableCell
                    sx={{ width: 56, py: 1.5 }}
                  />
                </TableRow>
              </TableHead>

              <TableBody>
                {orders.map((order) => {
                  const expanded =
                    expandedOrderId === order.id;

                  return (
                    <Fragment key={order.id}>
                      <TableRow
                        hover
                        onClick={() =>
                          onToggleExpand(order.id)
                        }
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            bgcolor:
                              palette.background.paper,
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
                            #{order.id}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                palette.text.secondary,
                            }}
                          >
                            {formatDate(order.createdAt)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            sx={{
                              fontWeight: 600,
                              borderRadius: "8px",
                              color:
                                palette.background
                                  .default,
                              bgcolor:
                                order.orderPipeline
                                  ?.color ??
                                palette.text.disabled,
                            }}
                            label={
                              order.orderPipeline
                                ?.label ?? "—"
                            }
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: palette.text.primary,
                            }}
                          >
                            {formatBaht(order.amount)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <IconButton
                            size="small"
                            aria-label={
                              expanded
                                ? t("collapseProducts")
                                : t("expandProducts")
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleExpand(order.id);
                            }}
                          >
                            {expanded ? (
                              <KeyboardArrowUpIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>

                      {expanded && (
                        <TableRow
                          sx={{
                            bgcolor:
                              palette.background.paper,
                            "& td": { py: 1.5 },
                          }}
                        >
                          <TableCell colSpan={5}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                fontWeight: 700,
                                color:
                                  palette.text.disabled,
                                mb: 0.75,
                                textTransform:
                                  "uppercase",
                                letterSpacing: 1,
                              }}
                            >
                              {t("productsPurchased")}
                            </Typography>

                            {order.details &&
                            order.details.length > 0 ? (
                              <Stack spacing={0.5}>
                                {order.details.map(
                                  (line) => (
                                    <Box
                                      key={
                                        line.id ??
                                        `${order.id}-${line.productId}`
                                      }
                                      sx={{
                                        display: "flex",
                                        justifyContent:
                                          "space-between",
                                        gap: 2,
                                        flexWrap:
                                          "wrap",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color:
                                            palette
                                              .text
                                              .primary,
                                        }}
                                      >
                                        •{" "}
                                        {line.product
                                          ?.name ??
                                          `#${line.productId}`}
                                      </Typography>

                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color:
                                            palette
                                              .text
                                              .secondary,
                                        }}
                                      >
                                        {line.quantity.toLocaleString(
                                          "th-TH",
                                          {
                                            maximumFractionDigits: 3,
                                          },
                                        )}{" "}
                                        ×{" "}
                                        {formatBaht(
                                          line.unitPrice,
                                        )}{" "}
                                        ={" "}
                                        <Box
                                          component="span"
                                          sx={{
                                            fontWeight: 600,
                                            color:
                                              palette
                                                .text
                                                .primary,
                                          }}
                                        >
                                          {formatBaht(
                                            line.quantity *
                                              line.unitPrice,
                                          )}
                                        </Box>
                                      </Typography>
                                    </Box>
                                  ),
                                )}
                              </Stack>
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    palette.text
                                      .disabled,
                                }}
                              >
                                {t("noOrderLines")}
                              </Typography>
                            )}

                            {order.note && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 1,
                                  color:
                                    palette.text
                                      .disabled,
                                }}
                              >
                                {t("orderNote")}:
                                {order.note}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      {/* เอกสารทั้งหมด */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <ReceiptIcon
            sx={{
              fontSize: 18,
              color: palette.text.secondary,
            }}
          />

          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700 }}
          >
            {t("documentsSection")}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: palette.text.disabled,
              bgcolor: palette.background.paper,
              px: 1,
              py: 0.25,
              borderRadius: "6px",
            }}
          >
            {documents.length}
          </Typography>
        </Box>

        <DocumentsTable documents={documents} />
      </Box>
    </Stack>
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
