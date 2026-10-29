"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { useTranslations } from "next-intl";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import { STAGE_COLOR_PRESETS } from "@/lib/types";

import type {
  OrderPipelineStage,
  PipelineStage,
} from "@/lib/types";

/*
 * component กลางสำหรับจัดการคอลัมน์ของทุกบอร์ด
 * ทำงานเหมือนกันทุกอย่าง ต่างกันแค่ endpoint กับข้อความ
 * - contact = บอร์ดลูกค้า (ตาราง pipeline_stages, นับด้วย customerCount)
 * - order   = บอร์ดใบสั่งซื้อ (ตาราง order_pipeline, นับด้วย issueOrderCount)
 */
export type PipelineKind = "contact" | "order";

type RawStage = PipelineStage | OrderPipelineStage;

interface ManagedStage {
  stageId: number;
  stageKey: string;
  label: string;
  color: string;
  position: number;
  count: number;
}

const ENDPOINTS: Record<PipelineKind, string> = {
  contact: "/api/pipeline-stages",
  order: "/api/order-pipeline",
};

function toManagedStage(raw: RawStage): ManagedStage {
  return {
    stageId: raw.stageId,
    stageKey: raw.stageKey,
    label: raw.label,
    color: raw.color,
    position: raw.position,
    // สองตารางเก็บจำนวนการ์ดคนละชื่อฟิลด์
    count:
      "customerCount" in raw
        ? raw.customerCount
        : raw.issueOrderCount,
  };
}

interface StageForm {
  stageKey: string;
  label: string;
  color: string;
}

const emptyForm: StageForm = {
  stageKey: "",
  label: "",
  color: "#64748b",
};

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/*
 * ส่วน visual ของแถว แยกออกจาก hook ของ dnd-kit
 * เพื่อให้ DragOverlay ใช้ซ้ำได้ และ memo ได้ง่าย
 */
function StageRowCard({
  stage,
  countLabel,
  canManage,
  placeholder = false,
  floating = false,
  dragHandle,
  onEdit,
  onDelete,
}: {
  stage: ManagedStage;
  countLabel: string;
  canManage: boolean;
  /** แถวต้นฉบับระหว่างถูกลาก (จางลง ให้ overlay ดูเหมือนยกการ์ดขึ้น) */
  placeholder?: boolean;
  /** การ์ดที่ลอยตาม pointer ใน DragOverlay */
  floating?: boolean;
  dragHandle?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("managePipeline");

  return (
    <Card
      data-stage-key={stage.stageKey}
      variant="outlined"
      sx={{
        p: 0,
        borderRadius: "12px",
        borderColor: floating ? stage.color : "#e2e8f0",
        bgcolor: "#ffffff",
        boxShadow: floating
          ? "0 12px 28px rgba(15,23,42,0.18)"
          : placeholder
            ? "none"
            : "0 1px 2px rgba(15,23,42,0.04)",
        opacity: placeholder ? 0.4 : 1,
        transition:
          "border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        overflow: "hidden",
        "&:hover":
          canManage && !placeholder
            ? {
                borderColor: "#cbd5e1",
                boxShadow: "0 2px 8px rgba(15,23,42,0.07)",
              }
            : undefined,
      }}
    >
      <Stack direction="row" sx={{ alignItems: "stretch" }}>
        <Box
          sx={{
            width: 4,
            bgcolor: stage.color,
            flexShrink: 0,
          }}
        />

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flex: 1, p: 1.75, pl: 2 }}
        >
          {dragHandle}

          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: `${stage.color}14`,
              color: stage.color,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {stage.position}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1.25}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "center" }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: stage.color,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#0f172a",
                  fontSize: 15,
                }}
              >
                {stage.label}
              </Typography>
            </Stack>

            <Typography
              variant="caption"
              sx={{ color: "#94a3b8", fontFamily: "monospace" }}
            >
              {stage.stageKey}
            </Typography>
          </Box>

          <Chip
            size="small"
            icon={<PeopleIcon sx={{ fontSize: 16 }} />}
            label={countLabel}
            sx={{
              fontWeight: 700,
              borderRadius: "8px",
              height: 26,
              bgcolor: stage.count > 0 ? `${stage.color}12` : "#f8fafc",
              color: stage.count > 0 ? stage.color : "#94a3b8",
              "& .MuiChip-icon": {
                color: stage.count > 0 ? stage.color : "#94a3b8",
              },
            }}
          />

          {canManage && (
            <Stack
              direction="row"
              spacing={0.25}
              sx={{ alignItems: "center" }}
            >
              <Tooltip title={t("editColumn")} placement="top" arrow>
                <IconButton
                  size="small"
                  aria-label={t("editColumn")}
                  onClick={onEdit}
                  sx={{
                    color: "#64748b",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      color: "#2563eb",
                      bgcolor: "#eff6ff",
                    },
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={t("deleteColumn")} placement="top" arrow>
                <IconButton
                  size="small"
                  aria-label={t("deleteColumn")}
                  onClick={onDelete}
                  sx={{
                    color: "#94a3b8",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      color: "#dc2626",
                      bgcolor: "#fef2f2",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

const StageRow = memo(function StageRow({
  stage,
  countLabel,
  canManage,
  onEdit,
  onDelete,
}: {
  stage: ManagedStage;
  countLabel: string;
  canManage: boolean;
  onEdit: (stageId: number) => void;
  onDelete: (stageId: number) => void;
}) {
  const t = useTranslations("managePipeline");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.stageId,
    disabled: !canManage,
  });

  const dragHandle = canManage ? (
    <Tooltip title={t("dragToReorder")} placement="top" arrow>
      <Box
        {...attributes}
        {...listeners}
        aria-label={t("dragToReorder")}
        sx={{
          display: "flex",
          color: "#94a3b8",
          cursor: "grab",
          touchAction: "none",
          p: 0.5,
          borderRadius: "8px",
          transition: "color 0.15s ease, background-color 0.15s ease",
          "&:hover": {
            color: "#475569",
            bgcolor: "#f1f5f9",
          },
          "&:active": {
            cursor: "grabbing",
          },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
    </Tooltip>
  ) : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={{
        /*
         * ใช้ Translate (ไม่รวม scale) กันภาพยืด
         * และงดผูก transition ตอนกำลังลาก ไม่งั้น transform ที่ตาม pointer
         * จะถูก transition ดึงตามจนรู้สึกหนืด
         */
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
        willChange: "transform",
      }}
    >
      <StageRowCard
        stage={stage}
        countLabel={countLabel}
        canManage={canManage}
        placeholder={isDragging}
        dragHandle={dragHandle}
        onEdit={canManage ? () => onEdit(stage.stageId) : undefined}
        onDelete={canManage ? () => onDelete(stage.stageId) : undefined}
      />
    </Box>
  );
});

function SkeletonCard() {
  return (
    <Card
      variant="outlined"
      sx={{
        p: 0,
        borderRadius: "12px",
        borderColor: "#e2e8f0",
        bgcolor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "stretch" }}>
        <Box sx={{ width: 5, bgcolor: "#f1f5f9", flexShrink: 0 }} />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flex: 1, p: 2 }}>
          <Skeleton variant="circular" width={42} height={42} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="text" width="25%" height={16} />
          </Box>
          <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 4 }} />
        </Stack>
      </Stack>
    </Card>
  );
}

export default function PipelineColumnsManager({
  pipeline,
}: {
  pipeline: PipelineKind;
}) {
  const t = useTranslations("managePipeline");
  const { user, permissions, ready } = useSession();

  const endpoint = ENDPOINTS[pipeline];

  const {
    data: stagesData,
    isLoading: loading,
    mutate: mutateStages,
  } = useApi<RawStage[]>(
    ready && user && permissions?.administration === true
      ? endpoint
      : null,
  );

  // map ใหม่เฉพาะตอนข้อมูลเปลี่ยน กันทุกแถว re-render ระหว่างลาก
  const serverStages = useMemo(
    () => (stagesData ?? []).map(toManagedStage),
    [stagesData],
  );

  /*
   * ลำดับที่ผู้ใช้เพิ่งลากมา (optimistic ด้วย React state ตรงๆ)
   * แสดงทันทีตอนปล่อยเมาส์ ไม่ต้องรอ SWR แล้วค่อยยืนยันกับ server
   * ถ้า API ล้มเหลวจะล้าง draft เพื่อคืนลำดับเดิม
   */
  const [reorderDraft, setReorderDraft] = useState<
    ManagedStage[] | null
  >(null);

  // ลำดับล่าสุดที่เพิ่งลาก กัน request เก่าเคลียร์ draft ของลากใหม่กว่า
  const reorderSeq = useRef(0);

  const stages = reorderDraft ?? serverStages;
  const sortableIds = useMemo(
    () => stages.map((stage) => stage.stageId),
    [stages],
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // การ์ดที่กำลังถูกลาก + ความกว้าง ใช้ render ใน DragOverlay
  const [dragging, setDragging] = useState<ManagedStage | null>(null);
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedStage | null>(null);
  const [form, setForm] = useState<StageForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ManagedStage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = permissions?.administration === true;

  const totalCards = useMemo(
    () => stages.reduce((sum, s) => sum + s.count, 0),
    [stages],
  );

  /*
   * ป้ายนับจำนวนต่อแถว/ต่อหน้า ใช้คำคนละชุดกัน
   * บอร์ดลูกค้านับ "ลูกค้า" บอร์ดใบสั่งซื้อนับ "ใบสั่งซื้อ"
   */
  function countLabel(count: number) {
    return pipeline === "contact"
      ? t("customers", { count })
      : t("orders", { count });
  }

  const noteText =
    pipeline === "contact" ? t("note") : t("noteOrder");

  function hasItemsText(count: number) {
    return pipeline === "contact"
      ? t("hasCustomers", { count })
      : t("hasOrders", { count });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setKeyTouched(false);
    setDialogOpen(true);
  }

  const openEdit = useCallback(
    (stageId: number) => {
      const stage = stages.find((item) => item.stageId === stageId);

      if (!stage) return;

      setEditing(stage);
      setForm({
        stageKey: stage.stageKey,
        label: stage.label,
        color: stage.color,
      });
      setFormError("");
      setKeyTouched(true);
      setDialogOpen(true);
    },
    [stages],
  );

  const openDelete = useCallback(
    (stageId: number) => {
      const stage = stages.find((item) => item.stageId === stageId);

      if (stage) setDeleteTarget(stage);
    },
    [stages],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void submitForm();
  }

  async function submitForm() {
    const label = form.label.trim();
    const stageKey = form.stageKey.trim();

    if (!label) {
      setFormError(t("columnNameRequired"));
      return;
    }

    if (!KEY_PATTERN.test(stageKey)) {
      setFormError(t("stageKeyPattern"));
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.patch(`${endpoint}/${editing.stageId}`, {
          label,
          stageKey,
          color: form.color,
        });
        setNotice(t("columnUpdated", { name: editing.label }));
      } else {
        await api.post(endpoint, {
          label,
          stageKey,
          color: form.color,
        });
        setNotice(t("columnAdded", { name: form.label }));
      }

      setDialogOpen(false);
      // มีการเปลี่ยนข้อมูลจาก server → เลิกใช้ draft ลำดับชั่วคราว
      setReorderDraft(null);
      await mutateStages();
    } catch (err) {
      setFormError(getErrorMessage(err, t("columnSaveError")));
    } finally {
      setSaving(false);
    }
  }

  async function performReorder(event: DragEndEvent) {
    const { active, over } = event;

    const from = stages.findIndex((stage) => String(stage.stageId) === String(active.id));
    const to = over ? stages.findIndex((stage) => String(stage.stageId) === String(over.id)) : -1;

    if (from < 0 || to < 0) return;

    const next = arrayMove(stages, from, to).map((stage, index) => ({
      ...stage,
      position: index + 1,
    }));

    const seq = ++reorderSeq.current;

    // แสดงลำดับใหม่ทันทีตอนปล่อยเมาส์ (ไม่ต้องรอ server)
    setReorderDraft(next);

    try {
      await api.patch(`${endpoint}/order`, {
        stageIds: next.map((stage) => stage.stageId),
      });

      // มีการลากครั้งใหม่กว่าระหว่างรอ → ปล่อยให้ครั้งใหม่จัดการเอง
      if (seq !== reorderSeq.current) return;

      // server บันทึกแล้ว ดึงข้อมูลจริงมาเทียบ แล้วค่อยเลิกใช้ draft
      await mutateStages();
      setReorderDraft(null);
      setNotice(t("reorderSuccess"));
    } catch (err) {
      if (seq !== reorderSeq.current) return;

      // คืนลำดับเดิม + แจ้งเตือน
      setReorderDraft(null);
      setNotice(getErrorMessage(err, t("columnReorderError")));
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;

    void performDelete();
  }

  async function performDelete() {
    setDeleting(true);

    try {
      await api.delete(`${endpoint}/${deleteTarget!.stageId}`);
      setNotice(t("columnDeleted", { name: deleteTarget!.label }));
      setDeleteTarget(null);
      setReorderDraft(null);
      await mutateStages();
    } catch (err) {
      setNotice(getErrorMessage(err, t("columnDeleteError")));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {!canManage && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{
            mb: 2,
            borderRadius: "12px",
            fontWeight: 500,
          }}
        >
          {t("readOnly")}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          mb: 2,
          px: { xs: 2, sm: 2.5 },
          py: 2,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          borderRadius: "12px",
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <SettingsSuggestIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
          {t("columnsCount", { count: stages.length })}
          {canManage && ` · ${t("dragToReorder")}`}
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            ml: "auto",
            alignItems: "center",
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          <Chip
            icon={
              pipeline === "contact" ? (
                <PeopleIcon />
              ) : (
                <ReceiptLongIcon />
              )
            }
            label={countLabel(totalCards)}
            sx={{
              fontWeight: 700,
              borderRadius: "10px",
              bgcolor: "#f1f5f9",
              color: "#475569",
              "& .MuiChip-icon": { color: "#64748b" },
            }}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!canManage}
            onClick={openCreate}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#2563eb",
              "&:hover": {
                bgcolor: "#1d4ed8",
              },
              "&.Mui-disabled": {
                bgcolor: "#e2e8f0",
                color: "#94a3b8",
              },
            }}
          >
            {t("addColumnButton")}
          </Button>
        </Stack>
      </Card>

      {loading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((row) => (
            <SkeletonCard key={row} />
          ))}
        </Stack>
      ) : (
        <>
          {!loading && stages.length === 0 && (
            <Fade in timeout={400}>
              <Card
                elevation={0}
                sx={{
                  textAlign: "center",
                  py: 6,
                  px: 4,
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  bgcolor: "#fafbfc",
                }}
              >
                <ViewColumnOutlinedIcon
                  sx={{ fontSize: 32, color: "#94a3b8", mb: 1.5 }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: "#0f172a",
                    mb: 0.5,
                    fontSize: 17,
                  }}
                >
                  {t("noColumns")}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
                  {t("noColumnsHint")}
                </Typography>
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreate}
                    disabled={!canManage}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: "#2563eb",
                      "&:hover": { bgcolor: "#1d4ed8" },
                    }}
                  >
                    {t("createFirstColumn")}
                  </Button>
                )}
              </Card>
            </Fade>
          )}

          {stages.length > 0 && (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => {
                  const stage = stages.find(
                    (item) => String(item.stageId) === String(event.active.id),
                  );

                  setDragging(stage ?? null);
                  setOverlayWidth(
                    event.active.rect.current?.initial?.width ?? null,
                  );
                }}
                onDragEnd={(event) => {
                  setDragging(null);
                  setOverlayWidth(null);

                  const { active, over } = event;

                  if (!over || active.id === over.id) return;

                  void performReorder(event);
                }}
                onDragCancel={() => {
                  setDragging(null);
                  setOverlayWidth(null);
                }}
              >
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack spacing={1.5}>
                    {stages.map((stage) => (
                      <StageRow
                        key={stage.stageId}
                        stage={stage}
                        countLabel={countLabel(stage.count)}
                        canManage={canManage}
                        onEdit={openEdit}
                        onDelete={openDelete}
                      />
                    ))}
                  </Stack>
                </SortableContext>

                <DragOverlay
                  dropAnimation={{
                    duration: 150,
                    easing: "ease-out",
                  }}
                >
                  {dragging ? (
                    <Box
                      sx={{
                        width: overlayWidth ?? "auto",
                        transform: "rotate(1.2deg)",
                        pointerEvents: "none",
                      }}
                    >
                      <StageRowCard
                        stage={dragging}
                        countLabel={countLabel(dragging.count)}
                        canManage={canManage}
                        floating
                      />
                    </Box>
                  ) : null}
                </DragOverlay>
              </DndContext>

              <Card
                elevation={0}
                sx={{
                  mt: 3,
                  p: 2.5,
                  borderRadius: "12px",
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  gap: 1.5,
                  alignItems: "flex-start",
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, color: "#64748b", flexShrink: 0, mt: 0.2 }} />
                <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
                  <strong>{noteText}</strong>
                </Typography>
              </Card>
            </>
          )}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-paper": { borderRadius: "16px" } }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            {editing ? t("editColumn") : t("addNewColumn")}
          </DialogTitle>

          <DialogContent sx={{ p: 3, pt: "8px !important" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
              {editing
                ? t("editingColumn", { name: editing.label })
                : t("newColumnHint")}
            </Typography>

            <Stack spacing={3}>
              {formError && (
                <Alert severity="error" icon={<WarningAmberIcon />}>
                  {formError}
                </Alert>
              )}

              <Card
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: form.color,
                  }}
                />
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: `${form.color}14`,
                      color: form.color,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {form.label ? form.label.charAt(0) : "?"}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
                      {form.label || t("columnName")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: "monospace" }}>
                      {form.stageKey || t("stageKey")}
                    </Typography>
                  </Box>
                </Stack>
              </Card>

              <TextField
                fullWidth
                label={t("columnName")}
                value={form.label}
                onChange={(event) => {
                  const label = event.target.value;
                  setForm((current) => ({
                    ...current,
                    label,
                    stageKey: keyTouched ? current.stageKey : toSlug(label),
                  }));
                }}
                disabled={saving}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#ffffff",
                  },
                }}
              />

              <TextField
                fullWidth
                label={t("stageKey")}
                value={form.stageKey}
                onChange={(event) => {
                  setKeyTouched(true);
                  setForm((current) => ({
                    ...current,
                    stageKey: toSlug(event.target.value),
                  }));
                }}
                disabled={saving}
                helperText={t("stageKeyHint")}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    fontFamily: "monospace",
                    bgcolor: "#ffffff",
                  },
                }}
              />

              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "#475569", mb: 1.5 }}
                >
                  {t("columnColor")}
                </Typography>

                <Stack direction="row" spacing={1.2} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {STAGE_COLOR_PRESETS.map((color) => (
                    <Tooltip key={color} title={color} placement="top" arrow>
                      <Box
                        component="button"
                        type="button"
                        aria-label={t("selectColorAria", { color })}
                        aria-pressed={form.color === color}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            color,
                          }))
                        }
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: color,
                          border:
                            form.color === color
                              ? "3px solid #0f172a"
                              : "3px solid transparent",
                          cursor: "pointer",
                          p: 0,
                          transition: "all 0.15s ease",
                          boxShadow:
                            form.color === color
                              ? `0 4px 12px ${color}50`
                              : "0 1px 3px rgba(0,0,0,0.1)",
                          "&:hover": {
                            transform: "scale(1.1)",
                            boxShadow: `0 4px 16px ${color}60`,
                          },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Stack>

                <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: "monospace" }}>
                  {form.color}
                </Typography>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: "none", borderRadius: "10px", px: 2.5 }}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                px: 3,
                bgcolor: form.color,
                "&:hover": { bgcolor: form.color, filter: "brightness(0.9)" },
                boxShadow: `0 4px 14px ${form.color}40`,
              }}
            >
              {saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : editing ? (
                t("save")
              ) : (
                t("addColumnButton")
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-paper": { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pb: 1,
          }}
        >
          <WarningAmberIcon color="error" sx={{ fontSize: 22 }} />
          {t("deleteConfirmTitle")}
        </DialogTitle>

        <DialogContent sx={{ p: 3, pt: "8px !important" }}>
          <Typography component="div" variant="body1" sx={{ mb: 2, color: "#475569" }}>
            {t("deleteConfirmMessage", { name: deleteTarget?.label ?? "" })}
          </Typography>

          {deleteTarget && (
            <Card
              elevation={0}
              sx={{
                p: 2,
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: `${deleteTarget.color}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: deleteTarget.color,
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                  {deleteTarget.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: "monospace" }}>
                  {deleteTarget.stageKey}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={countLabel(deleteTarget.count)}
                sx={{
                  fontWeight: 700,
                  borderRadius: "8px",
                  bgcolor:
                    deleteTarget.count > 0
                      ? "#fee2e2"
                      : "#f8fafc",
                  color:
                    deleteTarget.count > 0
                      ? "#dc2626"
                      : "#94a3b8",
                }}
              />
            </Card>
          )}

          {(deleteTarget?.count ?? 0) > 0 && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2, borderRadius: "10px" }}>
              {hasItemsText(deleteTarget?.count ?? 0)}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none", borderRadius: "10px", px: 2.5 }}
          >
            {t("cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting || (deleteTarget?.count ?? 0) > 0}
            onClick={() => void handleDelete()}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              px: 3,
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            {deleting ? t("deleting") : t("deleteColumn")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setNotice("")} sx={{ borderRadius: "10px", fontWeight: 600 }}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
