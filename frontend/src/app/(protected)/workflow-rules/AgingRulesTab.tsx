"use client";

import { useCallback, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RuleIcon from "@mui/icons-material/Rule";
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
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";
import { useSession } from "@/lib/useSession";

import { LabeledSwitch, ZoneTitle } from "./shared";

import type { AgingRule } from "@/lib/types";

/*
 * แท็บ Aging (Time-based Workflow Rules)
 * โครงหน้าและสไตล์ทั้งหมดยึดตามแท็บ "การย้ายการ์ด" (MoveRulesTab):
 *   ปุ่มเพิ่มมุมขวา -> alert -> toolbar ค้นหา/กรอง -> รายการใน container
 *   เดียวแบ่งเป็นแถว + footer note -> ฟอร์มแบ่งโซนด้วย ZoneTitle
 * ต่างกันตรง "เกณฑ์วัน" แสดงเป็นแถบสัดส่วน 3 ส่วน (ปกติ/เหลือง/แดง)
 * ที่คำนวณจากค่าจริงของ rule แต่ละใบ
 */

/*
 * ฟอร์มเก็บเป็น string ทั้งหมด (แบบเดียวกับ minFiles ของแท็บ move)
 * เพื่อให้ช่องว่าง/ค่าระหว่างพิมพ์ไม่ถูกบังคับเป็น number กลางคัน
 */
interface AgingRuleForm {
  ruleName: string;
  warningAfterDays: string;
  criticalAfterDays: string;
  isActive: boolean;
}

const emptyForm: AgingRuleForm = {
  ruleName: "",
  warningAfterDays: "3",
  criticalAfterDays: "7",
  isActive: true,
};

const WARNING_MAX = 365;
const CRITICAL_MAX = 730;

type StatusFilter = "all" | "active" | "inactive";

/* =====================================================
   แถบสัดส่วนเกณฑ์วัน — ใช้ทั้งในแถวรายการและในฟอร์ม
   ความกว้างแต่ละช่วงแปรผันตามจำนวนวันของ rule
   (สีตรงกับสีที่ใช้บนการ์ดในบอร์ด: เทา / #f59e0b / #ef4444)
===================================================== */
function AgingScaleBar({
  warningAfterDays,
  criticalAfterDays,
  height = 10,
}: {
  warningAfterDays: number;
  criticalAfterDays: number;
  height?: number;
}) {
  const t = useTranslations("workflowRules.aging");

  /*
   * ความยาวส่วน:
   * ปกติ = warning วันแรก, เหลือง = ช่วง warning..critical-1,
   * แดง = ตั้งแต่ critical ขึ้นไป (ใช้ความกว้างเท่า critical เพื่อให้เห็นสัดส่วน)
   */
  const normalSpan = Math.max(1, warningAfterDays);
  const warningSpan = Math.max(
    1,
    criticalAfterDays - warningAfterDays,
  );
  const criticalSpan = Math.max(1, criticalAfterDays);
  const total = normalSpan + warningSpan + criticalSpan;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          height,
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            width: `${(normalSpan / total) * 100}%`,
            bgcolor: "#e2e8f0",
          }}
        />

        <Box
          sx={{
            width: `${(warningSpan / total) * 100}%`,
            bgcolor: "#f59e0b",
          }}
        />

        <Box
          sx={{
            width: `${(criticalSpan / total) * 100}%`,
            bgcolor: "#ef4444",
          }}
        />
      </Box>

      <Stack
        direction="row"
        sx={{
          mt: 0.5,
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {t("scaleNormal", {
            max: Math.max(0, warningAfterDays - 1),
          })}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: 11,
            color: "#b45309",
          }}
        >
          {t("scaleWarning", {
            from: warningAfterDays,
            to: Math.max(
              warningAfterDays,
              criticalAfterDays - 1,
            ),
          })}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: 11,
            color: "#b91c1c",
          }}
        >
          {t("scaleCritical", {
            from: criticalAfterDays,
          })}
        </Typography>
      </Stack>
    </Box>
  );
}

/* =====================================================
   แถว Rule หนึ่งใบ —  Anatomy ตรงกับ RuleRow ของแท็บ move:
   ชื่อ | เงื่อนไข(แถบสัดส่วน) | สวิตช์ | ปุ่มจัดการ
===================================================== */
function AgingRuleRow({
  rule,
  canManage,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  rule: AgingRule;
  canManage: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("workflowRules.aging");
  const tR = useTranslations("workflowRules");
  const tCommon = useTranslations("common");

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: { xs: "flex-start", md: "center" },
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 2.5 },
        py: 1.75,
        borderBottom: "1px solid #eef2f7",
        bgcolor: rule.isActive ? "#ffffff" : "#f8fafc",
        transition: "background-color .15s ease",
        "&:hover": {
          bgcolor: rule.isActive ? "#f8fafc" : "#f1f5f9",
        },
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      {/* 1) ชื่อ Rule (+ chip เมื่อปิดใช้งาน) */}
      <Box
        sx={{
          flex: {
            xs: "1 1 100%",
            md: "1 1 230px",
          },
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            rowGap: 0.5,
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 14,
              color: rule.isActive
                ? "#0f172a"
                : "#64748b",
              wordBreak: "break-word",
            }}
          >
            {rule.ruleName}
          </Typography>

          {!rule.isActive && (
            <Chip
              size="small"
              label={tR("inactiveChip")}
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 800,
                color: "#64748b",
                bgcolor: "#e2e8f0",
              }}
            />
          )}
        </Stack>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            color: "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          {t("rowHint", {
            warning: rule.warningAfterDays,
            critical: rule.criticalAfterDays,
          })}
        </Typography>
      </Box>

      {/* 2) แถบสัดส่วนเกณฑ์วันของ rule ใบนี้ */}
      <Box
        sx={{
          flex: {
            xs: "1 1 100%",
            md: "1 1 300px",
          },
          minWidth: 0,
        }}
      >
        <AgingScaleBar
          warningAfterDays={rule.warningAfterDays}
          criticalAfterDays={rule.criticalAfterDays}
        />
      </Box>

      {/* 3) สวิตช์เปิด/ปิด พร้อม label ใต้ตัว */}
      <LabeledSwitch
        checked={rule.isActive}
        disabled={!canManage}
        labelOn={tR("switchActiveOn")}
        labelOff={tR("switchActiveOff")}
        ariaLabel={tR("switchActive")}
        onChange={onToggleActive}
      />

      {/* 4) ปุ่มจัดการ (มี tooltip บอกชื่อปุ่ม) */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ ml: "auto", flexShrink: 0 }}
      >
        <Tooltip
          title={tR("editRule")}
          placement="top"
          arrow
        >
          <IconButton
            size="small"
            aria-label={tR("editRule")}
            disabled={!canManage}
            onClick={onEdit}
            sx={{
              color: "#64748b",
              "&:hover": {
                bgcolor: "#eef2f7",
                color: "#2563eb",
              },
            }}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip
          title={tCommon("delete")}
          placement="top"
          arrow
        >
          <IconButton
            size="small"
            aria-label={tCommon("delete")}
            disabled={!canManage}
            onClick={onDelete}
            sx={{
              color: "#dc2626",
              "&:hover": {
                bgcolor: "#fef2f2",
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function AgingRulesTab() {
  const t = useTranslations("workflowRules.aging");
  const tR = useTranslations("workflowRules");
  const tCommon = useTranslations("common");
  const { user, permissions, ready } = useSession();

  const canManage =
    permissions?.administration === true;

  /*
   * ดึงเฉพาะตอน login แล้วและมีสิทธิ์ Administration
   * (useApi(null) คือไม่ยิง request)
   */
  const canLoad =
    ready && user && permissions?.administration === true;

  const {
    data: rulesData,
    isLoading: loading,
    error: loadError,
    mutate: reloadRules,
  } = useApi<AgingRule[]>(
    canLoad ? "/api/aging-rules" : null,
  );

  const rules = useMemo(
    () => rulesData ?? [],
    [rulesData],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<AgingRule | null>(null);
  const [form, setForm] =
    useState<AgingRuleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<AgingRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState("");
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

  /*
   * ตัวเลขบน filter chips นับจากข้อมูลทั้งหมด
   * ไม่ขึ้นกับคำค้น เพื่อให้เห็นภาพรวมเสมอ (แบบเดียวกับแท็บ move)
   */
  const counts = useMemo(
    () => ({
      all: rules.length,
      active: rules.filter((rule) => rule.isActive)
        .length,
      inactive: rules.filter(
        (rule) => !rule.isActive,
      ).length,
    }),
    [rules],
  );

  const filterChips: {
    value: StatusFilter;
    label: string;
  }[] = [
    {
      value: "all",
      label: tR("filterAll", { count: counts.all }),
    },
    {
      value: "active",
      label: tR("filterActive", {
        count: counts.active,
      }),
    },
    {
      value: "inactive",
      label: tR("filterInactive", {
        count: counts.inactive,
      }),
    },
  ];

  /* กรอง 2 ชั้น: สถานะ (chips) แล้วค่อยค้นจากชื่อ Rule */
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rules.filter((rule) => {
      if (
        statusFilter === "active" &&
        !rule.isActive
      ) {
        return false;
      }

      if (
        statusFilter === "inactive" &&
        rule.isActive
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return rule.ruleName
        .toLowerCase()
        .includes(keyword);
    });
  }, [rules, search, statusFilter]);

  const hasFilter =
    Boolean(search.trim()) || statusFilter !== "all";

  /*
   * ค่า threshold ปัจจุบันของฟอร์ม (เลขที่พิมพ์อยู่)
   * ใช้แสดงแถบตัวอย่างแบบสด ๆ ในฟอร์ม
   */
  const warningValue = Number(form.warningAfterDays);
  const criticalValue = Number(form.criticalAfterDays);

  const previewReady =
    Number.isInteger(warningValue) &&
    Number.isInteger(criticalValue) &&
    warningValue >= 1 &&
    warningValue <= WARNING_MAX &&
    criticalValue > warningValue &&
    criticalValue <= CRITICAL_MAX;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(target: AgingRule) {
    setEditing(target);
    setForm({
      ruleName: target.ruleName,
      warningAfterDays: String(target.warningAfterDays),
      criticalAfterDays: String(target.criticalAfterDays),
      isActive: target.isActive,
    });
    setFormError("");
    setDialogOpen(true);
  }

  /*
   * validate ฝั่ง client ก่อนยิง API
   * (backend เช็ค critical > warning ซ้ำอีกชั้นเสมอ)
   */
  function validateForm(): string | null {
    if (!form.ruleName.trim()) {
      return tR("ruleNameRequired");
    }

    if (
      !Number.isInteger(warningValue) ||
      warningValue < 1 ||
      warningValue > WARNING_MAX
    ) {
      return t("warningInvalid");
    }

    if (
      !Number.isInteger(criticalValue) ||
      criticalValue < 1 ||
      criticalValue > CRITICAL_MAX
    ) {
      return t("criticalInvalid");
    }

    if (criticalValue <= warningValue) {
      return t("criticalGtWarning");
    }

    return null;
  }

  async function handleSubmit() {
    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      ruleName: form.ruleName.trim(),
      warningAfterDays: warningValue,
      criticalAfterDays: criticalValue,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await api.patch(
          `/api/aging-rules/${editing.ruleId}`,
          payload,
        );

        showNotice(tR("ruleUpdated"), "success");
      } else {
        await api.post("/api/aging-rules", payload);

        showNotice(tR("ruleAdded"), "success");
      }

      setDialogOpen(false);
      await reloadRules();
    } catch (err) {
      setFormError(
        getErrorMessage(err, tR("saveError")),
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
        `/api/aging-rules/${deleteTarget.ruleId}`,
      );

      showNotice(tR("ruleDeleted"), "success");
      setDeleteTarget(null);
      await reloadRules();
    } catch (err) {
      showNotice(
        getErrorMessage(err, tR("deleteError")),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /*
   * เปิด/ปิด rule จากแถวเลย ไม่ต้องเข้าฟอร์มแก้ไข
   * rule ที่ปิดอยู่จะไม่ถูกนำไปคิดสีการ์ดบนบอร์ด
   */
  async function handleToggleActive(rule: AgingRule) {
    try {
      await api.patch(
        `/api/aging-rules/${rule.ruleId}`,
        { isActive: !rule.isActive },
      );

      showNotice(
        rule.isActive
          ? tR("ruleDisabled")
          : tR("ruleEnabled"),
        "success",
      );

      await reloadRules();
    } catch (err) {
      showNotice(
        getErrorMessage(err, tR("toggleError")),
        "error",
      );
    }
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* ปุ่มเพิ่ม Rule ชิดขวา เหนือ toolbar (แบบเดียวกับแท็บ move) */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!canManage}
          onClick={() => openCreate()}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 2,
            bgcolor: "#2563eb",
            boxShadow: "none",
            "&:hover": {
              bgcolor: "#1d4ed8",
              boxShadow: "none",
            },
          }}
        >
          {t("addNew")}
        </Button>
      </Box>

      {!canManage && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {tR("readOnly")}
        </Alert>
      )}

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("loadError")}
        </Alert>
      )}

      {/* =================================================
          TOOLBAR: ค้นหา + กรองสถานะ (ชุดเดียวกับแท็บ move)
      ================================================== */}

      <Card
        sx={{
          mb: 3,
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          p: 1.5,
          border: "1px solid #e7ebf2",
          borderRadius: "16px",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        }}
      >
        <TextField
          size="small"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder={t("searchPlaceholder")}
          sx={{
            minWidth: { xs: "100%", md: 320 },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          {filterChips.map((chip) => {
            const active =
              statusFilter === chip.value;

            return (
              <Chip
                key={chip.value}
                label={chip.label}
                onClick={() =>
                  setStatusFilter(chip.value)
                }
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  bgcolor: active
                    ? "#2563eb"
                    : "#ffffff",
                  color: active
                    ? "#ffffff"
                    : "#475569",
                  border: active
                    ? "none"
                    : "1px solid #e2e8f0",
                  "&:hover": {
                    bgcolor: active
                      ? "#1d4ed8"
                      : "#f8fafc",
                  },
                }}
              />
            );
          })}
        </Stack>
      </Card>

      {/* =================================================
          รายการ RULE: container เดียว + header bar + แถวคั่น
      ================================================== */}

      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={`skeleton-${index}`}
              sx={{
                border: "1px solid #e7ebf2",
                borderRadius: "16px",
                boxShadow: "none",
              }}
            >
              <Skeleton
                variant="rectangular"
                height={84}
                sx={{ borderRadius: "16px" }}
              />
            </Card>
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        /* ว่าง: แยกกรณี "ยังไม่มี rule" กับ "ค้น/กรองไม่เจอ" */
        <Card
          sx={{
            py: 8,
            textAlign: "center",
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
          }}
        >
          <AccessTimeIcon
            sx={{ fontSize: 44, color: "#cbd5e1" }}
          />

          <Typography
            sx={{
              mt: 1.5,
              fontWeight: 800,
              color: "#172033",
            }}
          >
            {hasFilter
              ? tR("noResults")
              : t("empty")}
          </Typography>

          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: "#94a3b8" }}
          >
            {hasFilter
              ? tR("noResultsHint")
              : t("emptyHint")}
          </Typography>

          {!hasFilter && canManage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreate()}
              sx={{
                mt: 2.5,
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
              {t("addNew")}
            </Button>
          )}
        </Card>
      ) : (
        <Box
          sx={{
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            overflow: "hidden",
            bgcolor: "#ffffff",
          }}
        >
          {/* หัวรายการ: ชื่อหัวข้อ + จำนวน rule */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              rowGap: 1,
              px: { xs: 2, md: 2.5 },
              py: 1.25,
              bgcolor: "#f8fafc",
              borderBottom: "1px solid #e7ebf2",
            }}
          >
            <AccessTimeIcon
              sx={{
                fontSize: 16,
                color: "#2563eb",
                flexShrink: 0,
              }}
            />

            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: "#334155",
              }}
            >
              {t("listTitle")}
            </Typography>

            <Chip
              size="small"
              label={tR("countRules", {
                count: filtered.length,
              })}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                bgcolor: "#eef2f7",
              }}
            />
          </Box>

          {filtered.map((rule) => (
            <AgingRuleRow
              key={rule.ruleId}
              rule={rule}
              canManage={canManage}
              onToggleActive={() =>
                void handleToggleActive(rule)
              }
              onEdit={() => openEdit(rule)}
              onDelete={() => setDeleteTarget(rule)}
            />
          ))}
        </Box>
      )}

      {/* FOOTER NOTE: อธิบายกติกา + แทน Alert ตัวใหญ่เดิม */}
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 2.5,
          color: "#94a3b8",
        }}
      >
        {t("note")}
      </Typography>

      {/* =================================================
          CREATE / EDIT DIALOG (แบ่งโซนด้วย ZoneTitle แบบแท็บ move)
      ================================================== */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing ? tR("editRule") : t("addRule")}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error">
                  {formError}
                </Alert>
              )}

              {/* ---- โซน 1: ข้อมูล Rule ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <EditNoteIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("zoneInfo")}
                />

                <TextField
                  fullWidth
                  size="small"
                  label={tR("ruleName")}
                  helperText={t("ruleNameHint")}
                  value={form.ruleName}
                  slotProps={{
                    htmlInput: { maxLength: 150 },
                  }}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      ruleName: event.target.value,
                    }))
                  }
                  disabled={saving}
                  required
                />
              </Box>

              <Divider />

              {/* ---- โซน 2: เกณฑ์เวลา (จำนวนวัน) ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <AccessTimeIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("zoneThresholds")}
                />

                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={1}
                >
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t("warningAfter")}
                    helperText={t("warningHint")}
                    value={form.warningAfterDays}
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: WARNING_MAX,
                      },
                    }}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        warningAfterDays:
                          event.target.value,
                      }))
                    }
                    disabled={saving}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t("criticalAfter")}
                    helperText={t("criticalHint")}
                    value={form.criticalAfterDays}
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: CRITICAL_MAX,
                      },
                    }}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        criticalAfterDays:
                          event.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </Stack>
              </Box>

              {/* ---- PREVIEW: แถบเกณฑ์สด ๆ ขณะกรอก ---- */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "8px",
                  border: "1px solid #dbeafe",
                  bgcolor: "#eff6ff",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontWeight: 800,
                    color: "#1d4ed8",
                  }}
                >
                  {tR("previewTitle")}
                </Typography>

                {previewReady ? (
                  <Box sx={{ mt: 1 }}>
                    <AgingScaleBar
                      warningAfterDays={warningValue}
                      criticalAfterDays={criticalValue}
                      height={12}
                    />
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, color: "#94a3b8" }}
                  >
                    {t("previewInvalid")}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* ---- โซน 3: การบังคับใช้ ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <RuleIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("zoneEnforcement")}
                />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isActive}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            isActive:
                              event.target.checked,
                          }))
                        }
                      />
                    }
                    label={tR("activeLabel")}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      ml: 4.5,
                      color: "#94a3b8",
                    }}
                  >
                    {tR("activeHint")}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {tCommon("cancel")}
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving || !canManage}
              sx={{ textTransform: "none" }}
            >
              {saving ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : editing ? (
                tCommon("save")
              ) : (
                t("addRuleButton")
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =================================================
          DELETE CONFIRM
      ================================================== */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {tR("deleteConfirmTitle")}
        </DialogTitle>

        <DialogContent>
          <Typography component="div" variant="body2">
            {tR("deleteConfirmMessage", {
              name: deleteTarget?.ruleName ?? "",
            })}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            {tCommon("cancel")}
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleDelete()}
            sx={{ textTransform: "none" }}
          >
            {deleting
              ? tR("deleting")
              : tCommon("delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={
          noticeType === "error" ? 5000 : 3000
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
    </>
  );
}
