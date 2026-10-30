"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useTranslations } from "next-intl";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PALETTE as GLOBAL_PALETTE } from "@/theme";

import { api, getErrorMessage } from "@/lib/api";

import { getPermissionsSnapshot } from "@/lib/auth";

import FilePreviewDialog from "@/components/FilePreviewDialog";

import type { Palette } from "@mui/material/styles";

import type {
  Customer,
  IssueOrder,
  IssueOrderAttachment,
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
  const [customerInfo, setCustomerInfo] =
    useState<Customer | null>(null);
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

  /*
   * ป้ายประเภทเอกสาร (id -> ชื่อ) ใช้ทั้งแท็บเอกสาร
   * endpoint นี้ไม่ต้องมีสิทธิ์พิเศษ แค่ล็อกอิน
   */
  const [docTypeLabels, setDocTypeLabels] = useState<
    Record<number, string>
  >({});

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

    const docTypesTask = api
      .get<{ id: number; documentType: string }[]>(
        "/api/document-types",
      )
      .then((res) => {
        setDocTypeLabels(
          Object.fromEntries(
            res.data.map((row) => [
              row.id,
              row.documentType,
            ]),
          ),
        );
      })
      .catch(() => setDocTypeLabels({}));

    try {
      const customerRes = await api.get<Customer>(
        `/api/customers/${customer.customerId}`,
      );

      setCustomerInfo(customerRes.data);

      await Promise.all([ordersTask, docTypesTask]);
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

  const info = customerInfo ?? customer;

  /*
   * ไฟล์แนบจากทุกใบสั่งซื้อของลูกค้ารายนี้ (เรียงล่าสุดก่อน)
   * ใช้ทั้งแท็บเอกสารและ KPI "ไฟล์แนบทั้งหมด" บนแดชบอร์ด
   */
  const attachments = useMemo(
    () =>
      orders
        .flatMap((order) =>
          (order.attachments ?? []).map((att) => ({
            ...att,
            /*
             * /api/issue-orders ส่ง attachment เป็น raw entity (id)
             * ส่วน endpoint /attachments ส่งเป็น view (attachmentId)
             * normalize ให้ใช้ร่วมกันได้ทั้งสองแบบ
             */
            attachmentId: att.attachmentId ?? att.id ?? 0,
            orderId: order.id,
          })),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [orders],
  );

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
            <Tab label={t("ordersTab")} />
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
              orders={orders}
              ordersDenied={ordersDenied}
              attachments={attachments}
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
                <OrdersTable
                  orders={orders}
                  ordersDenied={ordersDenied}
                  expandedOrderId={expandedOrderId}
                  onToggleExpand={(orderId) =>
                    setExpandedOrderId((prev) =>
                      prev === orderId ? null : orderId,
                    )
                  }
                />
              )}
            </Box>
          )}

          {tab === 3 && (
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
                <AttachmentsTable
                  attachments={attachments}
                  denied={ordersDenied}
                  docTypeLabels={docTypeLabels}
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
   ตารางไฟล์แนบของลูกค้า (รวมจากใบสั่งซื้อทุกใบ)
   คลิกชื่อไฟล์เพื่อเปิดดูใน FilePreviewDialog
===================================================== */
interface AttachmentRow extends IssueOrderAttachment {
  orderId: number;
}

/* ขนาดไฟล์แบบ human-readable เช่น 1.2 MB */
function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })} KB`;
  }

  return `${bytes} B`;
}

/*
 * ดาวน์โหลดไฟล์แนบ (backend ไม่ได้เปิด uploads เป็น static
 * จึงต้องดึงผ่าน axios แบบ blob เพื่อแนบ JWT)
 */
async function downloadAttachmentFile(
  orderId: number,
  attachment: IssueOrderAttachment,
) {
  const response = await api.get<Blob>(
    `/api/issue-orders/${orderId}/attachments/${attachment.attachmentId}/file`,
    { responseType: "blob" },
  );

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = attachment.originalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* =====================================================
   Tooltip ของกราฟ Top Sell
   แสดงจำนวนครั้งที่สั่ง + หน่วยรวม + ยอดเงินรวม
===================================================== */
interface TopSellTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      name: string;
      orderCount: number;
      units: number;
      amount: number;
    };
  }>;
  palette: Palette;
}

function TopSellTooltip({
  active,
  payload,
  palette,
}: TopSellTooltipProps) {
  const t = useTranslations("customerDetail");

  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: "8px",
        bgcolor: palette.background.paper,
        border: `1px solid ${palette.divider}`,
        boxShadow:
          "0 4px 12px rgba(15,23,42,0.12)",
        maxWidth: 240,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          display: "block",
        }}
      >
        {row.name}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: palette.text.secondary,
        }}
      >
        {row.orderCount} {t("unit")}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: palette.text.secondary,
        }}
      >
        {row.units.toLocaleString("th-TH")}{" "}
        {t("units")}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: palette.text.primary,
          fontWeight: 600,
        }}
      >
        {formatBaht(row.amount)}
      </Typography>
    </Box>
  );
}

function AttachmentsTable({
  attachments,
  denied,
  docTypeLabels,
}: {
  attachments: AttachmentRow[];
  denied: boolean;
  docTypeLabels: Record<number, string>;
}) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  const [preview, setPreview] =
    useState<AttachmentRow | null>(null);
  const [downloadError, setDownloadError] =
    useState("");

  const handleDownload = async (row: AttachmentRow) => {
    try {
      setDownloadError("");
      await downloadAttachmentFile(row.orderId, row);
    } catch {
      setDownloadError(t("downloadError"));
    }
  };

  if (denied) {
    return (
      <EmptyStateBox
        message={t("noOrderPermission")}
      />
    );
  }

  if (attachments.length === 0) {
    return (
      <EmptyStateBox message={t("noDocuments")} />
    );
  }

  return (
    <Box>
      {downloadError && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          onClose={() => setDownloadError("")}
        >
          {downloadError}
        </Alert>
      )}

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
                t("fileName"),
                t("type"),
                t("orderNo"),
                t("attachedDate"),
                t("fileSize"),
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
                sx={{ width: 96, py: 1.5 }}
              />
            </TableRow>
          </TableHead>

          <TableBody>
            {attachments.map((row) => (
              <TableRow
                key={`${row.orderId}-${row.attachmentId}`}
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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                    }}
                  >
                    <AttachFileIcon
                      sx={{
                        fontSize: 16,
                        color: palette.text.disabled,
                        flexShrink: 0,
                      }}
                    />

                    <Typography
                      variant="body2"
                      onClick={() => setPreview(row)}
                      sx={{
                        fontWeight: 500,
                        color: palette.text.primary,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        "&:hover": {
                          color: palette.primary.main,
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {row.originalName}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: palette.text.secondary,
                    }}
                  >
                    {row.documentTypeId
                      ? docTypeLabels[
                          row.documentTypeId
                        ] ?? "—"
                      : "—"}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: palette.text.secondary,
                    }}
                  >
                    #{row.orderId}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: palette.text.secondary,
                    }}
                  >
                    {formatDate(row.createdAt)}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: palette.text.secondary,
                    }}
                  >
                    {formatFileSize(row.sizeBytes)}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <IconButton
                    size="small"
                    aria-label={t("openFile")}
                    onClick={() => setPreview(row)}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    aria-label={t("download")}
                    onClick={() =>
                      void handleDownload(row)
                    }
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {preview && (
        <FilePreviewDialog
          open
          title={preview.originalName}
          mimeType={preview.mimeType}
          fileUrl={`/api/issue-orders/${preview.orderId}/attachments/${preview.attachmentId}/file`}
          onDownload={() =>
            void handleDownload(preview)
          }
          onClose={() => setPreview(null)}
        />
      )}
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
 * คืนค่า year + month + label + total
 * (year/month ใช้ตอน drill-down คลิกแท่งกราฟ)
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

  return months.map(({ key, label, total }) => {
    const [year, month] = key
      .split("-")
      .map(Number);

    return { year, month, label, total };
  });
}

/* =====================================================
   ตารางใบสั่งซื้อ + รายการสินค้า (คลิกแถวเพื่อขยาย)
   ใช้ในแท็บ "ใบสั่งซื้อ"
===================================================== */
function OrdersTable({
  orders,
  ordersDenied,
  expandedOrderId,
  onToggleExpand,
}: {
  orders: IssueOrder[];
  ordersDenied: boolean;
  expandedOrderId: number | null;
  onToggleExpand: (orderId: number) => void;
}) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  if (ordersDenied) {
    return (
      <EmptyStateBox
        message={t("noOrderPermission")}
      />
    );
  }

  if (orders.length === 0) {
    return <EmptyStateBox message={t("noOrders")} />;
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
  );
}

/* =====================================================
   Drill-down ของกราฟบนแท็บแดชบอร์ด
   คลิกแท่ง Top Sell -> ดูสินค้านั้นของลูกค้ารายนี้
   คลิกแท่งเดือน -> ดูใบสั่งซื้อของเดือนนั้น
===================================================== */
type Drilldown =
  | {
      kind: "product";
      productId: number;
      name: string;
    }
  | {
      kind: "month";
      year: number;
      month: number;
      label: string;
    };

interface ChartDrilldownDialogProps {
  drilldown: Drilldown;
  orders: IssueOrder[];
  onClose: () => void;
}

function ChartDrilldownDialog({
  drilldown,
  orders,
  onClose,
}: ChartDrilldownDialogProps) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  /*
   * โหมดสินค้า: ทุกบรรทัดของสินค้านั้นในทุกใบสั่งซื้อ
   * โหมดเดือน: ใบสั่งซื้อที่สร้างในเดือนนั้น
   */
  const rows =
    drilldown.kind === "product"
      ? orders.flatMap((order) =>
          (order.details ?? [])
            .filter(
              (line) =>
                line.productId === drilldown.productId,
            )
            .map((line) => ({ order, line })),
        )
      : orders
          .filter((order) => {
            const created = new Date(order.createdAt);
            return (
              created.getFullYear() ===
                drilldown.year &&
              created.getMonth() === drilldown.month
            );
          })
          .map((order) => ({ order, line: null }));

  rows.sort(
    (a, b) =>
      new Date(b.order.createdAt).getTime() -
      new Date(a.order.createdAt).getTime(),
  );

  const title =
    drilldown.kind === "product"
      ? drilldown.name
      : new Date(
          drilldown.year,
          drilldown.month,
        ).toLocaleDateString("th-TH", {
          month: "long",
          year: "numeric",
        });

  const summary =
    drilldown.kind === "product"
      ? [
          `${rows.length} ${t("unit")}`,
          `${rows
            .reduce(
              (sum, row) =>
                sum + (row.line?.quantity ?? 0),
              0,
            )
            .toLocaleString("th-TH")} ${t("units")}`,
          formatBaht(
            rows.reduce(
              (sum, row) =>
                sum +
                (row.line
                  ? row.line.quantity *
                    row.line.unitPrice
                  : 0),
              0,
            ),
          ),
        ].join(" · ")
      : [
          `${rows.length} ${t("orderUnit")}`,
          formatBaht(
            rows.reduce(
              (sum, row) => sum + row.order.amount,
              0,
            ),
          ),
        ].join(" · ");

  const headers =
    drilldown.kind === "product"
      ? [
          t("orderNo"),
          t("date"),
          t("stageHeader"),
          t("quantity"),
          t("lineTotal"),
        ]
      : [
          t("orderNo"),
          t("date"),
          t("stageHeader"),
          t("amount"),
          t("attachedFiles"),
        ];

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: "640px",
            maxWidth: "94vw",
            maxHeight: "80vh",
            borderRadius: "16px",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
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
              variant="h6"
              sx={{
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: palette.text.disabled,
              }}
            >
              {summary}
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            aria-label={t("closeAria")}
            size="small"
            sx={{
              color: palette.text.secondary,
              border: `1px solid ${palette.divider}`,
              borderRadius: "10px",
              flexShrink: 0,
              "&:hover": {
                bgcolor: palette.background.paper,
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>
        {rows.length === 0 ? (
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
                  {headers.map((head) => (
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
                {rows.map(({ order, line }) => (
                  <TableRow
                    key={
                      line
                        ? `${order.id}-${line.id ?? line.productId}`
                        : `${order.id}`
                    }
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor:
                          palette.background.paper,
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
                        #{order.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: palette.text.secondary,
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
                            palette.background.default,
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

                    {drilldown.kind === "product" ? (
                      <>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                palette.text.secondary,
                            }}
                          >
                            {(line?.quantity ?? 0).toLocaleString(
                              "th-TH",
                              {
                                maximumFractionDigits: 3,
                              },
                            )}{" "}
                            ×{" "}
                            {formatBaht(
                              line?.unitPrice ?? 0,
                            )}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color:
                                palette.text.primary,
                            }}
                          >
                            {formatBaht(
                              (line?.quantity ?? 0) *
                                (line?.unitPrice ?? 0),
                            )}
                          </Typography>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color:
                                palette.text.primary,
                            }}
                          >
                            {formatBaht(order.amount)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                palette.text.secondary,
                            }}
                          >
                            {order.attachments?.length ??
                              0}
                          </Typography>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================
   แท็บแดชบอร์ด
   สรุปข้อมูลของลูกค้ารายนั้นไว้ในที่เดียว
   KPI + กราฟ
===================================================== */
interface DashboardTabProps {
  orders: IssueOrder[];
  ordersDenied: boolean;
  attachments: AttachmentRow[];
  loading: boolean;
}

function DashboardTab({
  orders,
  ordersDenied,
  attachments,
  loading,
}: DashboardTabProps) {
  const t = useTranslations("customerDetail");
  const palette = useTheme().palette;

  /*
   * แท่งกราฟที่ผู้ใช้คลิก (Top Sell หรือเดือน)
   * ค่าไม่ null = เปิด drill-down dialog
   */
  const [drilldown, setDrilldown] =
    useState<Drilldown | null>(null);

  const orderTotal = orders.reduce(
    (sum, order) => sum + order.amount,
    0,
  );

  const monthlyData = buildMonthlyTotals(orders);

  /*
   * Top Sell: สินค้าที่ลูกค้าสั่งซื้อบ่อยที่สุด (Top 5)
   * เกณฑ์หลักคือจำนวนใบสั่งซื้อที่มีสินค้านั้น
   * tie-break ด้วยจำนวนหน่วยรวม
   */
  const topProducts = (() => {
    const map = new Map<
      number,
      {
        name: string;
        orderIds: Set<number>;
        units: number;
        amount: number;
      }
    >();

    for (const order of orders) {
      for (const line of order.details ?? []) {
        const entry = map.get(line.productId) ?? {
          name:
            line.product?.name ?? `#${line.productId}`,
          orderIds: new Set<number>(),
          units: 0,
          amount: 0,
        };

        entry.orderIds.add(order.id);
        entry.units += line.quantity;
        entry.amount +=
          line.quantity * line.unitPrice;

        map.set(line.productId, entry);
      }
    }

    return [...map.entries()]
      .map(([productId, entry]) => ({
        productId,
        name: entry.name,
        orderCount: entry.orderIds.size,
        units: entry.units,
        amount: entry.amount,
      }))
      .sort(
        (a, b) =>
          b.orderCount - a.orderCount ||
          b.units - a.units,
      )
      .slice(0, 5);
  })();

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
      label: t("totalFiles"),
      value: ordersDenied
        ? "—"
        : `${attachments.length}`,
      icon: <AttachFileIcon sx={{ fontSize: 20 }} />,
      color: "#0891b2",
    },
    {
      label: t("ordersByMonth"),
      value: ordersDenied
        ? "—"
        : formatBaht(
            monthlyData.reduce(
              (sum, month) => sum + month.total,
              0,
            ),
          ),
      icon: (
        <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
      ),
      color: "#16a34a",
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
            md: "repeat(4, 1fr)",
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

      {/* กราฟ 2 ตัว: Top Sell + ยอดซื้อ 6 เดือน */}
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
            "& .recharts-rectangle": {
              cursor: "pointer",
            },
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            {t("topSell")}
          </Typography>

          {!ordersDenied && topProducts.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={180}
            >
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{
                  top: 0,
                  right: 16,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={palette.divider}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string) =>
                    value.length > 16
                      ? `${value.slice(0, 15)}…`
                      : value
                  }
                  tick={{
                    fontSize: 11,
                    fill: palette.text.disabled,
                  }}
                />
                <ChartTooltip
                  cursor={{
                    fill: palette.background.paper,
                  }}
                  content={
                    <TopSellTooltip palette={palette} />
                  }
                />
                <Bar
                  dataKey="orderCount"
                  fill={palette.primary.main}
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                  onClick={(entry) => {
                    const row = (
                      entry as {
                        payload?: {
                          productId: number;
                          name: string;
                        };
                      }
                    ).payload;

                    if (row) {
                      setDrilldown({
                        kind: "product",
                        productId: row.productId,
                        name: row.name,
                      });
                    }
                  }}
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

        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            border: `1px solid ${palette.divider}`,
            bgcolor: palette.background.default,
            minWidth: 0,
            "& .recharts-rectangle": {
              cursor: "pointer",
            },
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
                  onClick={(entry) => {
                    const row = (
                      entry as {
                        payload?: {
                          year: number;
                          month: number;
                          label: string;
                        };
                      }
                    ).payload;

                    if (row) {
                      setDrilldown({
                        kind: "month",
                        year: row.year,
                        month: row.month,
                        label: row.label,
                      });
                    }
                  }}
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

      {drilldown && (
        <ChartDrilldownDialog
          drilldown={drilldown}
          orders={orders}
          onClose={() => setDrilldown(null)}
        />
      )}
    </Stack>
  );
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
