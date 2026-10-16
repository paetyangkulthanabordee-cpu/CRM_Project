"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PeopleIcon from "@mui/icons-material/People";
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

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Card
        data-stage-key={stage.stageKey}
        variant="outlined"
        sx={{
          p: 0,
          borderRadius: "16px",
          borderColor: isDragging ? stage.color : "#e7ebf2",
          bgcolor: "#ffffff",
          boxShadow: isDragging
            ? `0 20px 40px ${stage.color}30, 0 0 0 2px ${stage.color}`
            : "0 1px 3px rgba(15,23,42,0.04)",
          opacity: isDragging ? 0.85 : 1,
          transition: "box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease",
          overflow: "hidden",
          "&:hover": {
            boxShadow: canManage
              ? `0 8px 24px ${stage.color}18, 0 0 0 1px ${stage.color}40`
              : "0 4px 12px rgba(15,23,42,0.08)",
            borderColor: canManage ? `${stage.color}60` : "#e7ebf2",
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: "stretch" }}>
          <Box
            sx={{
              width: 5,
              bgcolor: stage.color,
              flexShrink: 0,
            }}
          />

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", flex: 1, p: 2 }}
          >
            {canManage && (
              <Tooltip title={t("dragToReorder")} placement="top" arrow>
                <Box
                  {...attributes}
                  {...listeners}
                  aria-label={t("dragToReorder")}
                  sx={{
                    display: "flex",
                    color: "#cbd5e1",
                    cursor: "grab",
                    touchAction: "none",
                    p: 0.5,
                    borderRadius: "8px",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                    "&:hover": {
                      color: "#64748b",
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
            )}

            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: `${stage.color}15`,
                color: stage.color,
                fontWeight: 800,
                fontSize: 16,
                border: `2px solid ${stage.color}30`,
              }}
            >
              {stage.position}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center" }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: stage.color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${stage.color}50`,
                  }}
                />

                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#0f172a",
                    fontSize: 16,
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
              label={t("customers", { count: stage.customerCount })}
              sx={{
                fontWeight: 700,
                borderRadius: "10px",
                height: 28,
                bgcolor: stage.customerCount > 0 ? `${stage.color}12` : "#f8fafc",
                color: stage.customerCount > 0 ? stage.color : "#94a3b8",
                "& .MuiChip-icon": {
                  color: stage.customerCount > 0 ? stage.color : "#94a3b8",
                },
              }}
            />

            {canManage && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center" }}
              >
                <Tooltip title={t("editColumn")} placement="top" arrow>
                  <IconButton
                    size="small"
                    aria-label={t("editColumn")}
                    onClick={onEdit}
                    sx={{
                      color: "#64748b",
                      transition: "all 0.15s ease",
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
                      color: "#dc2626",
                      transition: "all 0.15s ease",
                      "&:hover": {
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
    </Box>
  );
}

function SkeletonCard() {
  return (
    <Card
      variant="outlined"
      sx={{
        p: 0,
        borderRadius: "16px",
        borderColor: "#e7ebf2",
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

export default function ManagePipelinePage() {
  const t = useTranslations("managePipeline");
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineStage | null>(null);
  const [form, setForm] = useState<StageForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = permissions?.administration === true;

  const totalCustomers = stages.reduce((sum, s) => sum + s.customerCount, 0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  useEffect(() => {
    if (!ready) return;

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
        await api.patch(`/pipeline-stages/${editing.stageId}`, {
          label,
          stageKey,
          color: form.color,
        });
        setNotice(t("columnUpdated", { name: editing.label }));
      } else {
        await api.post("/api/pipeline-stages", {
          label,
          stageKey,
          color: form.color,
        });
        setNotice(t("columnAdded", { name: form.label }));
      }

      setDialogOpen(false);
      await reloadStages();
    } catch (err) {
      setFormError(getErrorMessage(err, t("columnSaveError")));
    } finally {
      setSaving(false);
    }
  }

  function handleReorder(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    void performReorder(event);
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

    setSaving(true);

    try {
      await api.patch("/api/pipeline-stages/order", {
        stageIds: next.map((stage) => stage.stageId),
      });
      await reloadStages();
      setNotice(t("reorderSuccess"));
    } catch (err) {
      setNotice(getErrorMessage(err, t("columnReorderError")));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;

    void performDelete();
  }

  async function performDelete() {
    setDeleting(true);

    try {
      await api.delete(`/pipeline-stages/${deleteTarget!.stageId}`);
      setNotice(t("columnDeleted", { name: deleteTarget!.label }));
      setDeleteTarget(null);
      await reloadStages();
    } catch (err) {
      setNotice(getErrorMessage(err, t("columnDeleteError")));
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

  const _fallbackPermissions: Permissions = permissions ?? {
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
        <Card
          elevation={0}
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3.5 },
            borderRadius: "20px",
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.06)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: -60,
              left: -20,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.04)",
            },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "flex-start" }, position: "relative", zIndex: 1 }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <ViewColumnOutlinedIcon sx={{ fontSize: 18, opacity: 0.8 }} />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 1.5,
                    opacity: 0.85,
                  }}
                >
                  {t("administration")}
                </Typography>
              </Stack>

              <Typography
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 22, md: 28 },
                  color: "#ffffff",
                  lineHeight: 1.2,
                }}
              >
                {t("title")}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  opacity: 0.85,
                  fontSize: { xs: 13, md: 14 },
                }}
              >
                {t("subtitle")}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <Chip
                icon={<ViewColumnOutlinedIcon />}
                label={t("columns", { count: stages.length })}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontWeight: 700,
                  backdropFilter: "blur(8px)",
                  "& .MuiChip-icon": { color: "#ffffff" },
                }}
              />
              <Chip
                icon={<PeopleIcon />}
                label={t("customers", { count: totalCustomers })}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontWeight: 700,
                  backdropFilter: "blur(8px)",
                  "& .MuiChip-icon": { color: "#ffffff" },
                }}
              />
            </Stack>
          </Stack>

          <Box sx={{ mt: 2.5, position: "relative", zIndex: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!canManage}
              onClick={openCreate}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#ffffff",
                color: "#1e3a8a",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                "&:hover": {
                  bgcolor: "#f0f4ff",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                },
                "&.Mui-disabled": {
                  bgcolor: "rgba(255,255,255,0.3)",
                  color: "rgba(255,255,255,0.5)",
                },
              }}
            >
              {t("addColumnButton")}
            </Button>
          </Box>
        </Card>

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
                    borderRadius: "20px",
                    border: "2px dashed #cbd5e1",
                    bgcolor: "#fafbfc",
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <ViewColumnOutlinedIcon sx={{ fontSize: 40, color: "#3b82f6" }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
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
                <Card
                  elevation={0}
                  sx={{
                    mb: 2,
                    px: 2.5,
                    py: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: "14px",
                    bgcolor: "#ffffff",
                    border: "1px solid #e7ebf2",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                  }}
                >
                  <SettingsSuggestIcon sx={{ fontSize: 20, color: "#64748b" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569" }}>
                    {t("columnsCount", { count: stages.length })}
                    {canManage && ` · ${t("dragToReorder")}`}
                  </Typography>
                  {saving && (
                    <CircularProgress size={18} sx={{ ml: "auto" }} />
                  )}
                </Card>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleReorder}
                >
                  <SortableContext
                    items={stages.map((stage) => String(stage.stageId))}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack spacing={1.5}>
                      {stages.map((stage) => (
                        <StageRow
                          key={stage.stageId}
                          stage={stage}
                          canManage={canManage}
                          onEdit={() => openEdit(stage)}
                          onDelete={() => setDeleteTarget(stage)}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>

                <Card
                  elevation={0}
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: "14px",
                    bgcolor: "#f0f4ff",
                    border: "1px solid #dbeafe",
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 20, color: "#3b82f6", flexShrink: 0, mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6 }}>
                    <strong>{t("note")}</strong>
                  </Typography>
                </Card>
              </>
            )}
          </>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ borderRadius: "20px", overflow: "hidden" }}
      >
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}dd 100%)`,
            color: "#ffffff",
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, p: 0, color: "#ffffff" }}>
            {editing ? t("editColumn") : t("addNewColumn")}
          </DialogTitle>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
            {editing ? t("editingColumn", { name: editing.label }) : t("newColumnHint")}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3} sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error" icon={<WarningAmberIcon />}>
                  {formError}
                </Alert>
              )}

              <Card
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "14px",
                  border: "1px solid #e7ebf2",
                  bgcolor: "#fafbfc",
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
                      bgcolor: `${form.color}15`,
                      color: form.color,
                      fontWeight: 800,
                      fontSize: 14,
                      border: `2px solid ${form.color}30`,
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
              {saving ? t("save") : editing ? t("save") : t("addColumnButton")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
        sx={{ borderRadius: "20px", overflow: "hidden" }}
      >
        <Box
          sx={{
            p: 3,
            background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 32 }} />
          </Box>
          <DialogTitle sx={{ fontWeight: 800, p: 0, color: "#ffffff" }}>
            {t("deleteConfirmTitle")}
          </DialogTitle>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Typography component="div" variant="body1" sx={{ textAlign: "center", mb: 2 }}>
            {t("deleteConfirmMessage", { name: deleteTarget?.label ?? "" })}
          </Typography>

          {deleteTarget && (
            <Card
              elevation={0}
              sx={{
                p: 2,
                borderRadius: "12px",
                border: "1px solid #fecaca",
                bgcolor: "#fef2f2",
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
                  bgcolor: `${deleteTarget.color}15`,
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
                label={t("customers", { count: deleteTarget.customerCount })}
                sx={{
                  fontWeight: 700,
                  borderRadius: "8px",
                  bgcolor:
                    deleteTarget.customerCount > 0
                      ? "#fee2e2"
                      : "#f8fafc",
                  color:
                    deleteTarget.customerCount > 0
                      ? "#dc2626"
                      : "#94a3b8",
                }}
              />
            </Card>
          )}

          {(deleteTarget?.customerCount ?? 0) > 0 && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2, borderRadius: "10px" }}>
              {t("hasCustomers", { count: deleteTarget?.customerCount ?? 0 })}
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
            disabled={deleting || (deleteTarget?.customerCount ?? 0) > 0}
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
    </Box>
  );
}
