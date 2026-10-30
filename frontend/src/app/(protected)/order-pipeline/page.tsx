"use client";

import { useCallback, useMemo, useState } from "react";

import type { ReactNode } from "react";

import { useLocale, useTranslations } from "next-intl";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import AddIcon from "@mui/icons-material/Add";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SearchOffIcon from "@mui/icons-material/SearchOff";

import KanbanBoard from "@/components/KanbanBoard";
import OrderDetailDialog from "@/components/OrderDetailDialog";
import OrderFormDialog from "@/components/OrderFormDialog";

import type { NewIssueOrder } from "@/components/OrderFormDialog";

import { api, getErrorCode, getErrorMessage, getErrorPayload } from "@/lib/api";
import { withQuery } from "@/lib/listQuery";
import { useApi } from "@/lib/swr";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useSession } from "@/lib/useSession";
import { useAgingStatus } from "@/lib/useAgingStatus";
import { formatMoney } from "@/lib/format";

import type { AgingInfo } from "@/lib/useAgingStatus";

import type {
  AgingRule,
  Customer,
  IssueOrder,
  OrderPipelineStage,
  PendingStageMove,
  Product,
  WorkflowRuleBlockedError,
  WorkflowRuleCheck,
} from "@/lib/types";

/* =====================================================
   CARD (การ์ดใบสั่งซื้อหนึ่งใบ)
===================================================== */

function OrderCard({
  order,
  aging,
  dragging,
  ghost,
  onOpen,
}: {
  order: IssueOrder;
  /*
   * สถานะอายุจาก Aging Rules (null = ยังไม่คำนวณ/ไม่มี rule)
   * normal -> ปกติ, warning -> border+ป้ายเหลือง, critical -> border+ป้ายแดง
   */
  aging?: AgingInfo | null;
  dragging?: boolean;
  ghost?: boolean;
  onOpen: (order: IssueOrder) => void;
}) {
  const t = useTranslations("orderPipeline");
  const locale = useLocale();

  const lines = order.details ?? [];
  const firstProduct = lines[0]?.product?.name ?? null;
  const stage = order.orderPipeline;

  const aged = aging && aging.status !== "normal";

  /*
   * วันที่ activity อยู่ในอนาคต (ข้อมูลผิด)
   * ระบบไม่ทาสีขอบและไม่นับอายุ แต่โชว์ป้ายเตือนสีส้มแทน
   */
  const futureWarning = aging?.invalidFuture === true;

  /*
   * สีขอบตามสถานะอายุ (Aging Rules)
   * ปกติ = ขอบเทาเดิม / warning = เหลือง / critical = แดง
   * ค่าสถานะชนะ hover เพราะต้องเห็นสีเต็ม ๆ เสมอ
   */
  const borderColor = !aging || aging.status === "normal"
    ? "#e7ebf2"
    : aging.status === "warning"
      ? "#f59e0b"
      : "#ef4444";

  const hoverBorderColor = !aging || aging.status === "normal"
    ? "#c7d2fe"
    : borderColor;

  return (
    <Card
      data-testid="order-card"
      data-order-id={order.id}
      data-aging-status={aging?.status ?? "normal"}
      sx={{
        p: 2,
        borderRadius: "12px",
        border: aged
          ? `2px solid ${borderColor}`
          : "1px solid #e7ebf2",
        bgcolor: "#ffffff",
        boxShadow: dragging
          ? "0 12px 24px rgba(15,23,42,0.15)"
          : aged
            ? `0 1px 3px ${borderColor}33`
            : "0 1px 3px rgba(15,23,42,0.04)",
        cursor: "pointer",
        opacity: ghost ? 0 : 1,
        pointerEvents: ghost ? "none" : undefined,
        transition:
          "box-shadow 150ms ease, opacity 150ms ease, border-color 150ms ease",
        "&:hover": {
          borderColor: hoverBorderColor,
          bgcolor: "#f8fafc",
          boxShadow:
            "0 4px 12px rgba(15,23,42,0.08)",
        },
      }}
      onClick={() => onOpen(order)}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
          <Typography
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: "6px",
              bgcolor: "#f1f5f9",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            #{order.id}
          </Typography>

          {futureWarning && (
            <Tooltip title={t("agingFutureTooltip")}>
              <Typography
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "6px",
                  bgcolor: "#ffedd5",
                  color: "#c2410c",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {t("agingFutureWarning")}
              </Typography>
            </Tooltip>
          )}

          {aged && (
            <Tooltip
              title={t("agingTooltip", {
                days: aging.days,
                date: new Date(
                  aging.since,
                ).toLocaleString(locale),
              })}
            >
              <Typography
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "6px",
                  bgcolor:
                    aging.status === "warning"
                      ? "#fef3c7"
                      : "#fee2e2",
                  color:
                    aging.status === "warning"
                      ? "#b45309"
                      : "#b91c1c",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {t("agingDays", { count: aging.days })}
              </Typography>
            </Tooltip>
          )}
        </Stack>

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 14,
            color: "#2563eb",
          }}
        >
          {formatMoney(order.amount)}
        </Typography>
      </Box>

      <Typography
        sx={{
          mt: 1,
          fontWeight: 800,
          color: "#0f172a",
          fontSize: 14,
          lineHeight: 1.35,
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {order.customer?.companyName ?? `#${order.customerId}`}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 0.5,
          color: "#64748b",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {t("itemCount", { count: lines.length })}
        {firstProduct ? ` · ${firstProduct}` : ""}
      </Typography>

      {order.note && (
        <Typography
          variant="caption"
          sx={{
            display: "-webkit-box",
            mt: 0.5,
            color: "#94a3b8",
            fontSize: 12,
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {order.note}
        </Typography>
      )}

      <Divider sx={{ my: 1 }} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: stage?.color ?? "#94a3b8",
              flexShrink: 0,
            }}
          />

          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {stage?.label ?? "-"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexShrink: 0,
          }}
        >
          {/*
            ป้ายรูปหนีบ: บอกว่าการ์ดนี้มีไฟล์แนบแล้ว
            (ค่ามาจาก relation attachments ตอนโหลดบอร์ด)
          */}
          {(order.attachments?.length ?? 0) > 0 && (
            <Stack
              direction="row"
              spacing={0.4}
              sx={{ alignItems: "center" }}
            >
              <AttachFileIcon
                sx={{ fontSize: 14, color: "#94a3b8" }}
              />

              <Typography
                variant="caption"
                sx={{
                  color: "#94a3b8",
                  fontWeight: 700,
                }}
              >
                {order.attachments?.length ?? 0}
              </Typography>
            </Stack>
          )}

          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              flexShrink: 0,
            }}
          >
            {new Date(order.createdAt).toLocaleDateString(
              locale,
            )}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

/* =====================================================
   PAGE
   ====================================================== */

export default function OrderPipelinePage() {
  const t = useTranslations("orderPipeline");

  const { user, ready } = useSession();

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  /*
   * severity ของ Snackbar
   * ข้อความพลาด (เช่น ติด Workflow Rule หรืออัปโหลดไม่สำเร็จ)
   * ต้องแสดงเป็นสีแดง ไม่ใช่ success สีเขียวเหมือนเดิม
   */
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
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeOrder, setActiveOrder] =
    useState<IssueOrder | null>(null);

  /*
   * การย้ายขั้นตอนที่ถูก Workflow Rule บล็อกเพราะยังไม่ได้แนบไฟล์
   * เก็บไว้เพื่อเปิดฟอร์มรายละเอียดพร้อมแถบ mark
   * ว่าต้องแนบไฟล์อะไร (ล้างเมื่อบันทึกสำเร็จหรือผู้ใช้ปิด dialog)
   */
  const [pendingMove, setPendingMove] =
    useState<PendingStageMove | null>(null);

  /*
   * ข้อมูลทั้งหมดมาจากฝั่ง Order Pipeline
   * คอลัมน์ = /api/order-pipeline, การ์ด = /api/issue-orders
   * ไม่ได้แตะตาราง pipeline_stages ของฝั่ง Contact Pipeline
   *
   * base = ชุดเต็มไว้นับจำนวนรวม
   * list = ชุดที่ backend ค้นให้ (หน่วงคำค้นก่อนยิง)
   */
  const baseUrl =
    ready && user ? "/api/issue-orders" : null;

  const debouncedSearch = useDebouncedValue(
    search,
    300,
  );

  const listUrl = useMemo(
    () =>
      withQuery(baseUrl, {
        search: debouncedSearch,
      }),
    [baseUrl, debouncedSearch],
  );

  const {
    data: allOrdersData,
    isLoading: allLoading,
    mutate: reloadBase,
  } = useApi<IssueOrder[]>(baseUrl);

  const {
    data: ordersData,
    isLoading: listLoading,
    error: ordersError,
    mutate: reloadList,
  } = useApi<IssueOrder[]>(listUrl);

  const loading = allLoading || listLoading;

  const reloadOrders = useCallback(async () => {
    await Promise.all([
      reloadBase(),
      reloadList(),
    ]);
  }, [reloadBase, reloadList]);

  const {
    data: stagesData,
    isLoading: stagesLoading,
    mutate: reloadStages,
  } = useApi<OrderPipelineStage[]>(
    ready && user ? "/api/order-pipeline" : null,
  );

  /*
   * Aging Rules (Time-based Workflow Rules) จากหน้า
   * Administration -> Workflow Rules -> แท็บ Aging
   * เก็บ Threshold ให้เปลี่ยนสีการ์ดเมื่อไม่มี activity
   * อ่านได้ทุกคนที่ login (ไม่จำกัดสิทธิ์ administration)
   *
   * หน้านี้ refocus/refreshInterval เอง (override default ของ useApi)
   * เพราะถ้า Admin แก้ Threshold ขณะบอร์ดเปิดค้างอยู่
   * ต้องเห็นสีใหม่ทันทีโดยไม่ต้องกด Refresh หน้า
   */
  const { data: agingRulesData } = useApi<AgingRule[]>(
    ready && user ? "/api/aging-rules" : null,
    {
      revalidateOnFocus: true,
      refreshInterval: 60 * 1000,
    },
  );

  /*
   * ดึงลูกค้า/สินค้าเฉพาะตอนเปิดฟอร์มเพิ่มใบสั่งซื้อ
   * เพื่อไม่ให้หน้านี้ยิง API เปล่า ๆ ทุกครั้งที่เข้า
   */
  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
  } = useApi<{ data: Customer[]; total: number }>(
    addOpen && ready && user
      ? "/api/customers?limit=100"
      : null,
  );

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useApi<{ data: Product[]; total: number }>(
    addOpen && ready && user
      ? "/api/products?limit=100"
      : null,
  );

  const orders = useMemo(
    () => allOrdersData ?? [],
    [allOrdersData],
  );
  const stages = useMemo(
    () => stagesData ?? [],
    [stagesData],
  );
  const customers = useMemo(
    () => customersData?.data ?? [],
    [customersData],
  );
  const products = useMemo(
    () => productsData?.data ?? [],
    [productsData],
  );

  const hasSearch = search.trim().length > 0;

  /*
   * ใบสั่งซื้อที่ผ่านการค้นหาแล้ว
   * ค้นได้ทั้งเลขที่ ชื่อบริษัท หมายเหตุ และชื่อสินค้า
   * ทั้งหมดกรองจาก backend แล้ว
   */
  const boardOrders = useMemo(
    () => ordersData ?? [],
    [ordersData],
  );

  const agingRules = useMemo(
    () => agingRulesData ?? [],
    [agingRulesData],
  );

  /*
   * สถานะอายุของทุกการ์ด (Map<orderId, AgingInfo>)
   * คำนวณจาก last_activity_at เทียบกับ threshold ของ rule
   * แล้วสุ่มคำนวณใหม่เองทุก 1 นาที/ตอนแท็บกลับมาแสดงผล
   * -> การ์ดเปลี่ยน Day 3 -> Day 7 ได้โดยไม่ต้องกด Refresh
   */
  const agingMap = useAgingStatus(boardOrders, agingRules);

  /*
   * บันทึกขั้นตอนใหม่ของการ์ด
   * คอลัมน์บนบอร์ดเป็น stage_key แต่ API ต้องการ stage id
   * จึงแปลงกลับก่อนยิง
   */
  const persistStage = useCallback(
    async (
      orderId: number,
      stageKey: string,
    ): Promise<boolean> => {
      const stage = stages.find(
        (item) => item.stageKey === stageKey,
      );

      if (!stage) {
        showNotice(t("stageUpdateError"), "error");
        await reloadOrders();
        return false;
      }

      try {
        await api.patch(
          `/api/issue-orders/${orderId}/stage`,
          { orderPipelineId: stage.stageId },
        );

        /*
         * ย้ายสำเร็จ -> เลิกติดตามการย้ายที่ถูกบล็อกไว้ก่อนหน้า
         * (การย้ายอัตโนมัติจากฟอร์มรายละเอียดก็ใช้เส้นทางนี้)
         */
        setPendingMove(null);

        showNotice(t("stageUpdated"), "success");
      } catch (err) {
        /*
         * ถูก Workflow Rule บล็อก (เงื่อนไขใดก็ได้:
         * แนบไฟล์/เอกสาร/กรอกข้อมูล)
         * -> เปิดฟอร์มรายละเอียด ให้เห็น inline error ใต้ field
         * ที่เกี่ยวข้องว่าต้องทำอะไร แล้วระบบจะย้ายขั้นตอนให้เอง
         * เมื่อผ่านครบ (ตราบใดที่ฟอร์มนี้ยังเปิดอยู่)
         */
        const unmetRules: WorkflowRuleCheck[] =
          getErrorCode(err) === "WORKFLOW_RULE_BLOCKED"
            ? getErrorPayload<WorkflowRuleBlockedError>(err)
                ?.unmetRules ?? []
            : [];

        const blockedOrder = orders.find(
          (item) => item.id === orderId,
        );

        if (blockedOrder && unmetRules.length > 0) {
          setPendingMove({
            orderId: blockedOrder.id,
            toStageKey: stage.stageKey,
            toStageLabel: stage.label,
            rules: unmetRules,
          });

          setActiveOrder(blockedOrder);
        }

        showNotice(
          getErrorMessage(
            err,
            t("stageUpdateError"),
          ),
          "error",
        );

        await Promise.all([
          reloadOrders(),
          reloadStages(),
        ]);

        return false;
      }

      await Promise.all([
        reloadOrders(),
        reloadStages(),
      ]);

      return true;
    },
    [
      stages,
      orders,
      t,
      showNotice,
      reloadOrders,
      reloadStages,
    ],
  );

  /*
   * บอร์ดไม่สนใจค่าที่คืนมา เขาแค่รอให้ refetch เสร็จ
   * ส่วน dialog จะใช้ค่า bool ตอนนี้เพื่อดีดขั้นตอนกลับเมื่อบันทึกไม่สำเร็จ
   */
  const handleColumnChange = useCallback(
    async (
      orderId: number,
      stageKey: string,
    ): Promise<void> => {
      await persistStage(orderId, stageKey);
    },
    [persistStage],
  );

  const handleCreate = useCallback(
    async (
      payload: NewIssueOrder,
      files: File[],
    ): Promise<void> => {
      setSaving(true);

      try {
        /*
         * สร้างใบสั่งซื้อก่อน เพื่อได้ id สำหรับอัปโหลดไฟล์แนบ
         * (ตารางไฟล์แนบผูกกับ issue_order.id)
         */
        const created = await api.post<IssueOrder>(
          "/api/issue-orders",
          payload,
        );

        const orderId = created.data.id;

        /*
         * อัปโหลดทีละไฟล์ต่อทันที
         * ใบสั่งซื้อสร้างสำเร็จแล้ว จึงไม่ย้อนกลับถึงแม้ไฟล์บางไฟล์พลาด
         * แค่แจ้งชื่อไฟล์ที่พลาดให้ไปเพิ่มทีหลังจากหน้ารายละเอียด
         */
        const failedNames: string[] = [];

        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          try {
            await api.post(
              `/api/issue-orders/${orderId}/attachments`,
              formData,
            );
          } catch {
            failedNames.push(file.name);
          }
        }

        if (failedNames.length > 0) {
          showNotice(
            t("orderCreatedUploadError", {
              names: failedNames.join(", "),
            }),
            "error",
          );
        } else {
          showNotice(t("orderAdded"), "success");
        }

        setAddOpen(false);

        await Promise.all([
          reloadOrders(),
          reloadStages(),
        ]);
      } catch (err) {
        /*
         * ปิดฟอร์มเฉพาะตอนสำเร็จ
         * ถ้าไม่สำเร็จต้องให้ผู้ใช้แก้ข้อมูลต่อ
         */
        showNotice(
          getErrorMessage(err, t("orderAddError")),
          "error",
        );
      } finally {
        setSaving(false);
      }
    },
    [t, showNotice, reloadOrders, reloadStages],
  );

  const handleDelete = useCallback(
    async (orderId: number): Promise<void> => {
      setDeleting(true);

      try {
        await api.delete(`/api/issue-orders/${orderId}`);

        showNotice(t("orderDeleted"), "success");
        setActiveOrder(null);

        await Promise.all([
          reloadOrders(),
          reloadStages(),
        ]);
      } catch (err) {
        showNotice(
          getErrorMessage(
            err,
            t("orderDeleteError"),
          ),
          "error",
        );

        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [t, showNotice, reloadOrders, reloadStages],
  );

  const renderCard = useCallback(
    (
      order: IssueOrder,
      state: { ghost: boolean; dragging: boolean },
    ): ReactNode => (
      <OrderCard
        order={order}
        aging={agingMap.get(order.id) ?? null}
        ghost={state.ghost}
        dragging={state.dragging}
        onOpen={setActiveOrder}
      />
    ),
    [agingMap],
  );

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

  const emptyState = (
    icon: ReactNode,
    title: string,
    hint: string,
  ) => (
    <Card
      sx={{
        py: 8,
        textAlign: "center",
        border: "1px solid #e7ebf2",
        borderRadius: "16px",
      }}
    >
      {icon}

      <Typography
        sx={{
          mt: 1.5,
          fontWeight: 800,
          color: "#172033",
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{ mt: 0.5, color: "#94a3b8" }}
      >
        {hint}
      </Typography>
    </Card>
  );

  let board: ReactNode;

  /*
   * stages กับ orders มาคนละ request
   * ต้องรอทั้งคู่เสร็จก่อนค่อยตัดสินใจว่า "ไม่มีคอลัมน์"
   * ไม่งั้นจะกระพริบข้อความว่าไม่มีขั้นตอน ทั้งที่ stages ยังมาไม่ถึง
   */
  if (loading || stagesLoading) {
    /*
     * ระหว่างรอ stages ยังว่างอยู่ จึงต้องมีโครง skeleton สำรอง
     * ไม่ให้เหลือพื้นที่ว่างเปล่า
     */
    const skeletonKeys =
      stages.length > 0
        ? stages.map((stage) => stage.stageId)
        : [0, 1, 2, 3];

    board = (
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 2,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
            width: 0,
            height: 0,
          },
        }}
      >
        {skeletonKeys.map((key) => (
          <Box
            key={key}
            sx={{ width: 272, flexShrink: 0 }}
          >
            <Skeleton
              height={44}
              sx={{
                mb: 1.25,
                borderRadius: "12px",
              }}
            />

            <Stack spacing={1.25}>
              {[0, 1, 2].map((row) => (
                <Skeleton
                  key={row}
                  height={132}
                  sx={{ borderRadius: "14px" }}
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    );
  } else if (ordersError && !ordersData) {
    board = (
      <Alert severity="error" variant="outlined">
        {getErrorMessage(ordersError, t("loadError"))}
      </Alert>
    );
  } else if (stages.length === 0) {
    board = emptyState(
      <SearchOffIcon
        sx={{ fontSize: 40, color: "#cbd5e1" }}
      />,
      t("noStages"),
      t("noStagesHint"),
    );
  } else {
    /*
     * ถึงจะไม่มีใบสั่งซื้อเลย หรือค้นไม่เจอสักใบ
     * ก็ต้องแสดงคอลัมน์ไว้เสมอ เพื่อให้เห็นโครงบอร์ดจริง
     * คอลัมน์ว่างจะมีข้อความกำกับจาก emptyColumnLabel ของแต่ละกรณี
     */
    board = (
      <KanbanBoard
        items={boardOrders}
        stages={stages}
        getId={(order) => order.id}
        getColumnKey={(order) =>
          order.orderPipeline?.stageKey ?? ""
        }
        onColumnChange={handleColumnChange}
        renderCard={renderCard}
        emptyColumnLabel={
          hasSearch && orders.length > 0
            ? t("noResults")
            : t("emptyColumn")
        }
        cardHeight={172}
        columnWidth={280}
      />
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        bgcolor: "#f6f8fb",
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          overflowX: "hidden",
          overflowY: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ---- header ---- */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "#172033",
                lineHeight: 1.2,
              }}
            >
              {t("title")}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: "#64748b", mt: 0.5 }}
            >
              {t("subtitle")}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center" }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#64748b" }}
            >
              {t("showing")} {boardOrders.length}{" "}
              {t("of")} {orders.length} {t("entries")}
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                borderRadius: "8px",
                px: 2,
                bgcolor: "#2563eb",
                "&:hover": { bgcolor: "#1d4ed8" },
                flexShrink: 0,
              }}
            >
              {t("addOrder")}
            </Button>
          </Stack>
        </Box>

        {/* ---- search ---- */}
        <TextField
          size="small"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder={t("searchPlaceholder")}
          sx={{
            mb: 2.5,
            maxWidth: 420,
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              bgcolor: "#ffffff",
            },
          }}
        />

        {/* ---- board ---- */}
        {board}
      </Box>

      {activeOrder && (
        <OrderDetailDialog
          key={activeOrder.id}
          order={activeOrder}
          stages={stages}
          deleting={deleting}
          pendingMove={pendingMove}
          onStageChange={persistStage}
          onDelete={handleDelete}
          onAttachmentsChange={reloadOrders}
          onClose={() => {
            setActiveOrder(null);
            setPendingMove(null);
          }}
        />
      )}

      {/*
        * key ทำหน้าที่ล้างแบบฟอร์มเมื่อเปิดใหม่
        * ไม่ต้องพึ่ง effect ที่ setState ตอนเปิด
        */}
      <OrderFormDialog
        key={addOpen ? "order-form-open" : "order-form-closed"}
        open={addOpen}
        stages={stages}
        customers={customers}
        products={products}
        customersLoading={customersLoading}
        productsLoading={productsLoading}
        customersError={Boolean(customersError)}
        productsError={Boolean(productsError)}
        saving={saving}
        onSave={handleCreate}
        onClose={() => setAddOpen(false)}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={
          noticeType === "error" ? 5000 : 2500
        }
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
