"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  DndContext,
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

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import { STAGE_COLOR_PRESETS } from "@/lib/types";

import type { PipelineStage } from "@/lib/types";

import type { Permissions } from "@/lib/auth";

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

function StageRow({
  stage,
  canManage,
  onEdit,
  onDelete,
}: {
  stage: PipelineStage;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform,
        ),
        transition,
      }}
    >
<Card
        data-stage-key={stage.stageKey}
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: "14px",
          borderColor: "#e7ebf2",
          bgcolor: "#ffffff",
          boxShadow: isDragging
            ? "0 18px 36px rgba(15,23,42,0.16)"
            : "0 1px 2px rgba(15,23,42,0.04)",
          opacity: isDragging ? 0.7 : 1,
        }}
      >
<Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center" }}
        >
          {canManage && (
            <Box
              {...attributes}
              {...listeners}
              aria-label={`ลากเพื่อจัดลำดับ ${stage.label}`}
              sx={{
                display: "flex",
                color: "#cbd5e1",
                cursor: "grab",
                touchAction: "none",
                "&:active": {
                  cursor: "grabbing",
                },
              }}
            >
              <DragIndicatorIcon />
            </Box>
          )}

          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${stage.color}1a`,
              color: stage.color,
              fontWeight: 900,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {stage.position}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
<Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
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
                  fontWeight: 800,
                  color: "#0f172a",
                  fontSize: 15,
                }}
              >
                {stage.label}
              </Typography>
            </Stack>

            <Typography
              variant="caption"
              sx={{ color: "#94a3b8" }}
            >
              stage_key: {stage.stageKey}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={`${stage.customerCount} ลูกค้า`}
            sx={{
              fontWeight: 700,
              borderRadius: "8px",
              bgcolor:
                stage.customerCount > 0
                  ? "#eef2f7"
                  : "#f8fafc",
              color:
                stage.customerCount > 0
                  ? "#475569"
                  : "#94a3b8",
            }}
          />

          {canManage && (
<Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <IconButton
                size="small"
                aria-label={`แก้ไข ${stage.label}`}
                onClick={onEdit}
                sx={{ color: "#64748b" }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                aria-label={`ลบ ${stage.label}`}
                onClick={onDelete}
                sx={{ color: "#dc2626" }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Card>
    </Box>
  );
}

export default function ManagePipelinePage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const {
    data: stagesData,
    isLoading: loading,
    mutate: reloadStages,
  } = useApi<PipelineStage[]>(
    ready && user && permissions?.administration === true
      ? "/api/pipeline-stages"
      : null,
  );

  const stages = stagesData ?? [];
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [dialogOpen, setDialogOpen] =
    useState(false);
  const [editing, setEditing] =
    useState<PipelineStage | null>(null);
const [form, setForm] = useState<StageForm>(
    emptyForm,
  );
  const [formError, setFormError] =
    useState("");
  const [keyTouched, setKeyTouched] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<PipelineStage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage =
    permissions?.administration === true;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setKeyTouched(false);
    setDialogOpen(true);
  }

  function openEdit(stage: PipelineStage) {
    setEditing(stage);
    setForm({
      stageKey: stage.stageKey,
      label: stage.label,
      color: stage.color,
    });
    setFormError("");
    setKeyTouched(true);
    setDialogOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const label = form.label.trim();
    const stageKey = form.stageKey.trim();

    if (!label) {
      setFormError("กรุณากรอกชื่อคอลัมน์");
      return;
    }

    if (!KEY_PATTERN.test(stageKey)) {
      setFormError(
        "stage_key ต้องเป็นตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.patch(
          `/pipeline-stages/${editing.stageId}`,
          {
            label,
            stageKey,
            color: form.color,
          },
        );

        setNotice(
          "บันทึกการแก้ไขคอลัมน์เรียบร้อยแล้ว",
        );
      } else {
        await api.post("/api/pipeline-stages", {
          label,
          stageKey,
          color: form.color,
        });

        setNotice("เพิ่มคอลัมน์ใหม่เรียบร้อยแล้ว");
      }

      setDialogOpen(false);
      await reloadStages();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกคอลัมน์ได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(
    event: DragEndEvent,
  ) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const from = stages.findIndex(
      (stage) => stage.stageKey === active.id,
    );
    const to = stages.findIndex(
      (stage) => stage.stageKey === over.id,
    );

    if (from < 0 || to < 0) {
      return;
    }

    const next = arrayMove(stages, from, to).map(
      (stage, index) => ({
        ...stage,
        position: index + 1,
      }),
    );

    setSaving(true);

    try {
      await api.patch("/api/pipeline-stages/order", {
        stageIds: next.map((stage) => stage.stageKey),
      });

      await reloadStages();
      setNotice("จัดลำดับคอลัมน์เรียบร้อยแล้ว");
    } catch (err) {
      setNotice(
        getErrorMessage(
          err,
          "ไม่สามารถจัดลำดับได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await api.delete(
        `/pipeline-stages/${deleteTarget.stageId}`,
      );

      setNotice(
        `ลบคอลัมน์ "${deleteTarget.label}" แล้ว`,
      );
      setDeleteTarget(null);
      await reloadStages();
    } catch (err) {
      setNotice(
        getErrorMessage(
          err,
          "ไม่สามารถลบคอลัมน์ได้",
        ),
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
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
      dashboard: false,
      customers: false,
      salesPipeline: false,
      documents: false,
      reports: false,
      administration: false,
      permissions: false,
      auditLogs: false,
    };

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
          overflowY: "auto",
          maxHeight: "100vh",
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
              ADMINISTRATION
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
              Management Pipeline
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              เพิ่ม แก้ไข ลบ และจัดลำดับ
              คอลัมน์ของบอร์ด Sales
              Pipeline
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!canManage}
            onClick={openCreate}
            sx={{
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
            เพิ่มคอลัมน์
          </Button>
        </Box>

        {!canManage && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
          >
            หน้านี้ดูได้แบบอ่านอย่างเดียว
            เฉพาะผู้ดูแลระบบ (Admin)
            เท่านั้นที่จะเพิ่ม แก้ไข
            หรือลบคอลัมน์ได้
          </Alert>
        )}

        {!loading && stages.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            ยังไม่มีคอลัมน์ในระบบ
          </Alert>
        )}

        {/* ---- list ---- */}
        {loading ? (
          <Stack spacing={1.5}>
            {[0, 1, 2].map((row) => (
              <CircularProgress
                key={row}
                size={28}
              />
            ))}
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                mb: 2,
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                borderRadius: "12px",
                bgcolor: "#ffffff",
                border: "1px solid #e7ebf2",
              }}
            >
              <SettingsSuggestIcon
                sx={{
                  fontSize: 20,
                  color: "#64748b",
                }}
              />

              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                มี {stages.length} คอลัมน์
                {canManage &&
                  " · ลากที่ไอคอนซ้ายของแต่ละแถวเพื่อจัดลำดับ"}
              </Typography>

              {saving && (
                <CircularProgress
                  size={18}
                  sx={{ ml: "auto" }}
                />
              )}
            </Box>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) =>
                void handleReorder(event)
              }
            >
              <SortableContext
                items={stages.map(
                  (stage) => stage.stageKey,
                )}
                strategy={
                  verticalListSortingStrategy
                }
              >
                <Stack spacing={1.5}>
                  {stages.map((stage) => (
                    <StageRow
                      key={stage.stageId}
                      stage={stage}
                      canManage={canManage}
                      onEdit={() =>
                        openEdit(stage)
                      }
                      onDelete={() =>
                        setDeleteTarget(stage)
                      }
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            <Divider sx={{ my: 3 }} />

            <Typography
              variant="caption"
              sx={{ color: "#94a3b8" }}
            >
              หมายเหตุ: คอลัมน์ที่ยังมีลูกค้าอยู่
              จะลบไม่ได้ ต้องย้ายลูกค้าออกให้หมดก่อน
              และการเปลี่ยน stage_key
              จะย้ายลูกค้าในคอลัมน์นั้นตาม
              อัตโนมัติ
            </Typography>
          </>
        )}
      </Box>

      {/* ---- create / edit ---- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing
              ? "แก้ไขคอลัมน์"
              : "เพิ่มคอลัมน์ใหม่"}
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
                label="ชื่อคอลัมน์ที่แสดง"
                value={form.label}
                onChange={(event) => {
                  const label =
                    event.target.value;

                  setForm((current) => ({
                    ...current,
                    label,
                    // สร้าง key อัตโนมัติจากชื่อ
                    // จนกว่าผู้ใช้จะพิมพ์ key เอง
                    stageKey: keyTouched
                      ? current.stageKey
                      : toSlug(label),
                  }));
                }}
                disabled={saving}
                required
              />

              <TextField
                fullWidth
                label="stage_key (รหัสในระบบ)"
                value={form.stageKey}
                onChange={(event) => {
                  setKeyTouched(true);
                  setForm((current) => ({
                    ...current,
                    stageKey: toSlug(
                      event.target.value,
                    ),
                  }));
                }}
                disabled={saving}
                helperText="ใช้ตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (เว้นว่างไว้ ระบบจะสร้างให้จากชื่อคอลัมน์)"
                required
              />

              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "#475569",
                    mb: 1,
                  }}
                >
                  สีประจำคอลัมน์
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                  >
                  {STAGE_COLOR_PRESETS.map(
                    (color) => (
                      <Box
                        key={color}
                        component="button"
                        type="button"
                        aria-label={`เลือกสี ${color}`}
                        aria-pressed={
                          form.color === color
                        }
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            color,
                          }))
                        }
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "9px",
                          bgcolor: color,
                          border:
                            form.color === color
                              ? "2px solid #0f172a"
                              : "2px solid transparent",
                          cursor: "pointer",
                          p: 0,
                        }}
                      />
                    ),
                  )}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() =>
                setDialogOpen(false)
              }
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
              {saving
                ? "กำลังบันทึก..."
                : editing
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มคอลัมน์"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ---- delete ---- */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ยืนยันการลบ
        </DialogTitle>

        <DialogContent>
          <Typography
            component="div"
            variant="body2"
          >
            ต้องการลบคอลัมน์{" "}
            <strong>
              {deleteTarget?.label}
            </strong>{" "}
            ใช่หรือไม่?
          </Typography>

          {(deleteTarget?.customerCount ?? 0) >
            0 && (
              <Alert
                severity="warning"
                sx={{ mt: 2 }}
              >
                คอลัมน์นี้ยังมีลูกค้าอยู่{" "}
                {deleteTarget?.customerCount}{" "}
                ราย ระบบจะไม่อนุญาตให้ลบ
                กรุณาย้ายลูกค้าออกให้หมดก่อน
              </Alert>
            )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() =>
              setDeleteTarget(null)
            }
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={
              deleting ||
              (deleteTarget?.customerCount ?? 0) > 0
            }
            onClick={() => void handleDelete()}
            sx={{ textTransform: "none" }}
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
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