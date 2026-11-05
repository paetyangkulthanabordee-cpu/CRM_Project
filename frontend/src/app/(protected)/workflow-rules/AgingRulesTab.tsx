"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { useTranslations } from "next-intl";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import ArchiveIcon from "@mui/icons-material/Archive";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlineIcon from "@mui/icons-material/LockOutlined";
import PaletteIcon from "@mui/icons-material/Palette";
import RuleIcon from "@mui/icons-material/Rule";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
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
import MenuItem from "@mui/material/MenuItem";
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

import type {
  AgingAction,
  AgingRule,
  OrderPipelineStage,
  PipelineStage,
} from "@/lib/types";
import type { AgingBoard } from "@/lib/useAgingStatus";

/*
 * แท็บ Aging (Time-based Workflow Rules)
 * โครงหน้าและสไตล์ทั้งหมดยึดตามแท็บ "การย้ายการ์ด" (MoveRulesTab):
 *   ปุ่มเพิ่มมุมขวา -> alert -> toolbar ค้นหา/กรอง -> รายการใน container
 *   เดียวแบ่งเป็นแถว + footer note -> ฟอร์มแบ่งโซนด้วย ZoneTitle
 * ต่างกันตรง "เกณฑ์วัน" แสดงเป็นแถบสัดส่วน 3 ส่วน (ปกติ/เหลือง/แดง)
 * ที่คำนวณจากค่าจริงของ rule แต่ละใบ
 *
 * การแยกแยะ Action (ไม่มีการกระทำ / ล็อกแก้ไข / ลบอัตโนมัติ):
 * - ACTION_META = แหล่งสี/ไอคอน/ข้อความเดียว ใช้ร่วมทุกจุด
 * - legend 3 ช่องบนสุด -> แถบสีซ้าย + ไอคอน + chip ในแถว
 * - chips "การกระทำ" ใน toolbar สำหรับกรอง
 * - ฟอร์มเลือกผ่าน "การ์ด 3 ใบ" (แทน radio) + โซน action อยู่ใต้โซนข้อมูล
 */

/*
 * ฟอร์มเก็บเป็น string ทั้งหมด (แบบเดียวกับ minFiles ของแท็บ move)
 * เพื่อให้ช่องว่าง/ค่าระหว่างพิมพ์ไม่ถูกบังคับเป็น number กลางคัน
 *
 * boardType        = บอร์ดที่ rule มีผล (ตรงกับค่าใน aging_rules.board_type)
 * stageKey         = คอลัมน์บนบอร์ดนั้น, "" = ทุกคอลัมน์ (ส่ง null ขึ้น API)
 *                    (ตอน action = edit_lock ต้องเลือกคอลัมน์ — "ทุกคอลัมน์" ถูกซ่อน)
 * actionType       = การกระทำ เลือกได้อย่างเดียว
 * archiveAfterDays  = จำนวนวันของ auto-delete ที่กำหนดเอง
 *                    (คนละตัวกับ Warning/Critical ที่ใช้ตอน action = none)
 *                    แสดงเฉพาะตอนเลือก auto_archive
 */
interface AgingRuleForm {
  ruleName: string;
  warningAfterDays: string;
  criticalAfterDays: string;
  isActive: boolean;
  boardType: AgingBoard;
  stageKey: string;
  actionType: AgingAction;
  archiveAfterDays: string;
}

const emptyForm: AgingRuleForm = {
  ruleName: "",
  warningAfterDays: "3",
  criticalAfterDays: "7",
  isActive: true,
  boardType: "order_pipeline",
  stageKey: "",
  actionType: "none",
  archiveAfterDays: "7",
};

const WARNING_MAX = 365;
const CRITICAL_MAX = 730;

/* จำนวนวันของ auto-delete (จำกัดเท่ากับ warning เพื่อให้อ่านง่าย) */
const ARCHIVE_MAX = 365;

/* =====================================================
   ข้อมูลแสดงผลของแต่ละ Action — แหล่งเดียวที่ใช้ร่วมกัน
   (legend บนสุด / แถวในรายการ / chip / การ์ดในฟอร์ม / filter)
   สีสอดคล้องกับแถบ scale bar: น้ำเงิน = recolor, ส้ม = ล็อก, แดง = ลบ
===================================================== */

const ACTION_ORDER: AgingAction[] = [
  "none",
  "edit_lock",
  "auto_archive",
];

interface ActionMeta {
  icon: ReactElement;
  color: string;
  bgcolor: string;
  labelKey: string;
  hintKey: string;
  exampleKey: string;
}

const ACTION_META: Record<AgingAction, ActionMeta> = {
  none: {
    icon: <PaletteIcon fontSize="small" />,
    color: "#2563eb",
    bgcolor: "#eff6ff",
    labelKey: "actionNameNone",
    hintKey: "actionLegendNone",
    exampleKey: "actionExampleNone",
  },
  edit_lock: {
    icon: <LockOutlineIcon fontSize="small" />,
    color: "#c2410c",
    bgcolor: "#ffedd5",
    labelKey: "actionNameEditLock",
    hintKey: "actionLegendEditLock",
    exampleKey: "actionExampleEditLock",
  },
  auto_archive: {
    icon: <ArchiveIcon fontSize="small" />,
    color: "#b91c1c",
    bgcolor: "#fee2e2",
    labelKey: "actionNameAutoArchive",
    hintKey: "actionLegendAutoArchive",
    exampleKey: "actionExampleAutoArchive",
  },
};

type StatusFilter = "all" | "active" | "inactive";

/* กรองรายการตามบอร์ด (คู่กับ chips ใน toolbar) */
type BoardFilter = "all" | AgingBoard;

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
/* =====================================================
   ชื่อคอลัมน์ที่ rule ชี้ไป (ใช้ร่วมกับป้ายสรุป/ป้ายล็อก)
   - stage_key null     -> "ทุกคอลัมน์"
   - stageLabel หาย     -> ใช้ key + ต่อ "ไม่พบคอลัมน์"
===================================================== */
function columnLabelText(
  stageKey: string | null,
  stageLabel: string | null | undefined,
  allColumnsLabel: string,
  missingLabel: string,
): string {
  if (stageKey === null) {
    return allColumnsLabel;
  }

  if (!stageLabel) {
    return `${stageKey} — ${missingLabel}`;
  }

  return stageLabel;
}

/* =====================================================
   ป้ายสรุปของ auto_archive (แทนแถบเส้นตายเดิม)
   2 บรรทัด อ่านจบในพริบตา ไม่ต้องตีความความกว้าง/ตำแหน่ง:
   - บรรทัดหลัก: เงื่อนไขเวลา -> ผลลัพธ์ (ลบอัตโนมัติ)
   - บรรทัดรอง: ความถี่ที่ระบบตรวจ + คอลัมน์เป้าหมาย
   ใช้ typography/สี ชุดเดียวกับ caption อื่นในแถว (ไม่มีกล่อง/พื้นหลัง)
===================================================== */
function AutoArchiveSummary({
  days,
  column,
}: {
  days: number;
  column: string;
}) {
  const t = useTranslations("workflowRules.aging");

  return (
    <Box
      data-testid="auto-delete-summary"
      sx={{
        minWidth: 0,
        display: "grid",
        gap: 0.25,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontWeight: 800,
          fontSize: 11,
          lineHeight: 1.4,
          color: "#b91c1c",
        }}
      >
        <ScheduleIcon
          sx={{ fontSize: 14, flexShrink: 0 }}
        />
        {t("archiveSummaryLine1", { days })}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontSize: 11,
          lineHeight: 1.4,
          color: "#94a3b8",
        }}
      >
        {t("archiveSummaryLine2", { column })}
      </Typography>
    </Box>
  );
}

/* =====================================================
   ป้ายบอกคอลัมน์ที่ถูกล็อก (ใช้แทนแถบ 3 ส่วน ของ edit_lock)
   เป็นข้อความ caption บรรทัดเดียว ไม่ใช่ pill ซ้ำกับ chip scope
===================================================== */
function LockedColumnBadge({
  stageKey,
  stageLabel,
}: {
  stageKey: string | null;
  stageLabel?: string | null;
}) {
  const t = useTranslations("workflowRules.aging");

  /* stageLabel ว่าง = คอลัมน์ถูกลบไปแล้ว -> ใช้ key แทนและเตือน */
  const missing = stageKey !== null && !stageLabel;

  const column =
    stageKey === null
      ? t("lockBadgeAll")
      : missing
        ? stageKey
        : (stageLabel ?? stageKey);

  return (
    <Box
      data-testid="locked-column-badge"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontWeight: 800,
          fontSize: 11,
          color: "#c2410c",
        }}
      >
        <LockOutlineIcon sx={{ fontSize: 13 }} />
        {t("lockBadge", { column })}
      </Typography>

      {missing && (
        <Chip
          size="small"
          label={t("columnMissing")}
          sx={{
            height: 18,
            fontSize: 10,
            fontWeight: 800,
            color: "#b45309",
            bgcolor: "#fffbeb",
          }}
        />
      )}
    </Box>
  );
}

/* =====================================================
   LEGEND อธิบาย 3 Action — วางบนสุดของแท็บ
   (สี/ไอคอน/คำอธิบาย เดียวกับแถวในรายการและการ์ดในฟอร์ม)
===================================================== */
function ActionLegend() {
  const t = useTranslations("workflowRules.aging");

  return (
    <Box
      data-testid="action-legend"
      sx={{
        mb: 2,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(3, minmax(0, 1fr))",
        },
        gap: 1.5,
      }}
    >
      {ACTION_ORDER.map((key) => {
        const meta = ACTION_META[key];

        return (
          <Box
            key={key}
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              p: 1.5,
              borderRadius: "12px",
              border: `1px solid #eef2f7`,
              borderLeft: `4px solid ${meta.color}`,
              bgcolor: "#ffffff",
            }}
          >
            <Box
              sx={{
                color: meta.color,
                display: "flex",
                mt: "1px",
                flexShrink: 0,
              }}
            >
              {meta.icon}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#0f172a",
                  lineHeight: 1.3,
                }}
              >
                {t(meta.labelKey)}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "#64748b",
                  lineHeight: 1.45,
                  mt: 0.25,
                }}
              >
                {t(meta.hintKey)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

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

  /* สี/ไอคอนประจำ Action (แหล่งเดียวกับ legend / ฟอร์ม / filter) */
  const meta = ACTION_META[rule.actionType];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: { xs: "flex-start", md: "center" },
        gap: { xs: 1.5, md: 2 },
        px: { xs: 2, md: 2.5 },
        py: 1.75,
        /*
         * แถบสีซ้าย 4px บอก Action ทันทีโดยไม่ต้องอ่านตัวหนังสือ
         * (จางลง 50% เมื่อปิดใช้งาน rule เพื่อไม่แย่งความสนใจ)
         */
        borderLeft: `4px solid ${rule.isActive ? meta.color : `${meta.color}66`}`,
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
          {/* ไอคอน Action หน้าชื่อ — สแกนตาเร็วขึ้น */}
          <Box
            data-testid="aging-action-icon"
            sx={{
              color: meta.color,
              display: "flex",
              opacity: rule.isActive ? 1 : 0.5,
            }}
          >
            {meta.icon}
          </Box>

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
          {/* ข้อความใต้ชื่อตรงกับ Action ที่ rule ใช้ */}
          {rule.actionType === "auto_archive"
            ? t("archiveNoUndo")
            : rule.actionType === "edit_lock"
              ? t("lockHint")
              : t("rowHint", {
                  warning: rule.warningAfterDays,
                  critical: rule.criticalAfterDays,
                })}
        </Typography>

        {/* scope: บอร์ด + คอลัมน์ (ทุกคอลัมน์ / เฉพาะคอลัมน์) */}
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            mt: 0.75,
            flexWrap: "wrap",
            rowGap: 0.5,
          }}
        >
          <Chip
            size="small"
            label={
              rule.boardType === "customers"
                ? t("boardCustomers")
                : t("boardOrderPipeline")
            }
            sx={{
              height: 20,
              fontSize: 10.5,
              fontWeight: 800,
              color: "#1d4ed8",
              bgcolor: "#eff6ff",
            }}
          />

          {/*
            ชิปคอลัมน์ — แสดงเฉพาะ Color mark
            (rule อื่นบอกคอลัมน์ในป้ายด้านขวาอยู่แล้ว ไม่ต้องซ้ำ)
          */}
          {rule.actionType === "none" && (
            <Chip
              size="small"
              label={
                rule.stageKey === null
                  ? t("allColumns")
                  : (rule.stageLabel ??
                    `${rule.stageKey} — ${t("columnMissing")}`)
              }
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 800,
                /*
                 * stageLabel ว่าง = คอลัมน์ถูกลบไปแล้ว
                 * (rule จะไม่ match ใบไหน) -> ทำสีเตือนให้เห็นชัด ๆ
                 */
                color:
                  rule.stageKey !== null && !rule.stageLabel
                    ? "#b45309"
                    : "#475569",
                bgcolor:
                  rule.stageKey !== null && !rule.stageLabel
                    ? "#fffbeb"
                    : "#f1f5f9",
              }}
            />
          )}

          {/*
            การกระทำของ rule — แสดงทุกใบ
            (สีเดียวกับแถบซ้าย / legend / การ์ดในฟอร์ม / filter)
          */}
          <Chip
            size="small"
            data-testid="aging-action-chip"
            label={
              rule.actionType === "auto_archive"
                ? t("actionChipAutoArchive", {
                    days:
                      rule.archiveAfterDays ??
                      rule.criticalAfterDays,
                  })
                : t(meta.labelKey)
            }
            sx={{
              height: 20,
              fontSize: 10.5,
              fontWeight: 800,
              color:
                rule.actionType === "none"
                  ? "#475569"
                  : meta.color,
              bgcolor:
                rule.actionType === "none"
                  ? "#f1f5f9"
                  : meta.bgcolor,
            }}
          />
        </Stack>
      </Box>

      {/*
        2) ส่วนบอกพฤติกรรมของ rule — คนละแบบกันตาม Action
        - Color mark   -> แถบ Normal/Yellow/Red (เดิม)
        - auto_archive  -> ป้ายสรุป 2 บรรทัด (เงื่อนไขเวลา + ความถี่/คอลัมน์)
        - edit_lock    -> ป้ายคอลัมน์ที่ล็อก (ไม่มีแถบ)
      */}
      <Box
        data-testid="rule-action-visual"
        sx={{
          flex: {
            xs: "1 1 100%",
            md: "1 1 300px",
          },
          minWidth: 0,
        }}
      >
        {rule.actionType === "auto_archive" ? (
          <AutoArchiveSummary
            days={
              rule.archiveAfterDays ?? rule.criticalAfterDays
            }
            column={columnLabelText(
              rule.stageKey,
              rule.stageLabel,
              t("allColumns"),
              t("columnMissing"),
            )}
          />
        ) : rule.actionType === "edit_lock" ? (
          <LockedColumnBadge
            stageKey={rule.stageKey}
            stageLabel={rule.stageLabel}
          />
        ) : (
          <AgingScaleBar
            warningAfterDays={rule.warningAfterDays}
            criticalAfterDays={rule.criticalAfterDays}
          />
        )}
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
  const [boardFilter, setBoardFilter] =
    useState<BoardFilter>("all");
  const [actionFilter, setActionFilter] = useState<
    "all" | AgingAction
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<AgingRule | null>(null);
  const [form, setForm] =
    useState<AgingRuleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  /*
   * รายการคอลัมน์ของแต่ละบอร์ด ใช้ใน dropdown "คอลัมน์" ของฟอร์ม
   * (GET ทั้งคู่เปิดให้ผู้ใช้ที่ loginแล้ว — ไม่จำกัดสิทธิ์ administration)
   */
  const { data: orderColumnsData } =
    useApi<OrderPipelineStage[]>(
      ready && user ? "/api/order-pipeline" : null,
    );

  const { data: customerColumnsData } =
    useApi<PipelineStage[]>(
      ready && user ? "/api/pipeline-stages" : null,
    );

  /*
   * ตัวเลือกคอลัมน์ = ของ "บอร์ดที่เลือกในฟอร์ม" เท่านั้น
   * กันไม่ให้เลือกคอลัมน์ที่อยู่ในตารางของอีกบอร์ด
   */
  const columnOptions: {
    stageKey: string;
    label: string;
  }[] = useMemo(
    () =>
      form.boardType === "customers"
        ? (customerColumnsData ?? [])
        : (orderColumnsData ?? []),
    [
      form.boardType,
      orderColumnsData,
      customerColumnsData,
    ],
  );

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
      /* จำนวน rule ต่อ Action (ใช้บน chips กรอง Action) */
      actions: ACTION_ORDER.reduce(
        (acc, key) => {
          acc[key] = rules.filter(
            (rule) => rule.actionType === key,
          ).length;
          return acc;
        },
        {} as Record<AgingAction, number>,
      ),
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

  /*
   * chips กรองตาม Action — สีตรงกับแถบซ้าย/legend/ฟอร์ม
   * (นับจากข้อมูลทั้งหมด ไม่ขึ้นกับคำค้น เหมือน chips สถานะ)
   */
  const actionFilterChips: {
    value: "all" | AgingAction;
    label: string;
    color?: string;
    bgcolor?: string;
  }[] = [
    {
      value: "all",
      label: `${t("filterActionAll")} (${counts.all})`,
    },
    ...ACTION_ORDER.map((key) => ({
      value: key,
      label: `${t(ACTION_META[key].labelKey)} (${counts.actions[key]})`,
      color: ACTION_META[key].color,
      bgcolor: ACTION_META[key].bgcolor,
    })),
  ];

  /* กรอง 3 ชั้น: สถานะ -> Action -> ค้นจากชื่อ Rule */
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

      if (
        boardFilter !== "all" &&
        rule.boardType !== boardFilter
      ) {
        return false;
      }

      if (
        actionFilter !== "all" &&
        rule.actionType !== actionFilter
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
  }, [
    rules,
    search,
    statusFilter,
    boardFilter,
    actionFilter,
  ]);

  const hasFilter =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    boardFilter !== "all" ||
    actionFilter !== "all";

  /*
   * ค่า threshold ปัจจุบันของฟอร์ม (เลขที่พิมพ์อยู่)
   * ใช้แสดงแถบตัวอย่างแบบสด ๆ ในฟอร์ม
   */
  const warningValue = Number(form.warningAfterDays);
  const criticalValue = Number(form.criticalAfterDays);

  /* จำนวนวันของ "การลบอัตโนมัติ" (คนละตัวกับ Warning/Critical) */
  const archiveValue = Number(form.archiveAfterDays);

  /*
   * Warning/Critical + แถบ preview ใช้เฉพาะ action = "none" (recolor)
   * ถ้าเลือก auto_archive / edit_lock -> ซ่อนช่อง (และไม่ validate)
   * แต่ยังส่งค่าขึ้น API ผ่าน resolvePayloadThresholds()
   */
  const usesThresholds = form.actionType === "none";

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
      boardType: target.boardType,
      /* "" = ทุกคอลัมน์ (ค่า null จาก API) */
      stageKey: target.stageKey ?? "",
      actionType: target.actionType,
      /* ค่าวันของ auto-delete (null = ยังไม่เคยตั้ง -> แสดงค่าว่าง) */
      archiveAfterDays:
        target.archiveAfterDays != null
          ? String(target.archiveAfterDays)
          : "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  /*
   * validate ฝั่ง client ก่อนยิง API
   * (backend เช็ค critical > warning + เงื่อนไข action ซ้ำอีกชั้นเสมอ)
   *
   * Warning/Critical validate เฉพาะตอน action = none
   * เพราะช่องพวกนี้ถูกซ่อนเมื่อเลือก action อื่น
   */
  function validateForm(): string | null {
    if (!form.ruleName.trim()) {
      return tR("ruleNameRequired");
    }

    if (usesThresholds) {
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
    }

    /* auto_archive: บังคับกรอก "จำนวนวัน" ของตัวเอง */
    if (form.actionType === "auto_archive") {
      if (
        !Number.isInteger(archiveValue) ||
        archiveValue < 1 ||
        archiveValue > ARCHIVE_MAX
      ) {
        return t("archiveAfterInvalid");
      }
    }

    /* edit_lock: บังคับเลือกคอลัมน์ (ไม่รองรับ "ทุกคอลัมน์") */
    if (form.actionType === "edit_lock" && !form.stageKey) {
      return t("columnRequired");
    }

    return null;
  }

  /*
   * Warning/Critical ที่จะส่งขึ้น API
   * - action = none : ใช้ค่าที่พิมพ์ (validateForm เช็คแล้ว)
   * - action อื่น    : ช่องถูกซ่อน -> ใช้ค่าที่ยังถูกต้อง ไม่งั้น fallback 3/7
   *                   และบังคัด critical > warning เสมอ
   *                   (คอลัมน์ใน DB มี CHECK critical > warning >= 1)
   */
  function resolvePayloadThresholds(): {
    warning: number;
    critical: number;
  } {
    if (usesThresholds) {
      return { warning: warningValue, critical: criticalValue };
    }

    const warning =
      Number.isInteger(warningValue) &&
      warningValue >= 1 &&
      warningValue <= WARNING_MAX
        ? warningValue
        : 3;

    const critical =
      Number.isInteger(criticalValue) &&
      criticalValue > warning &&
      criticalValue <= CRITICAL_MAX
        ? criticalValue
        : Math.min(warning + 1, CRITICAL_MAX);

    return { warning, critical };
  }

  async function handleSubmit() {
    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);
    setFormError("");

    const thresholds = resolvePayloadThresholds();

    const payload = {
      ruleName: form.ruleName.trim(),
      warningAfterDays: thresholds.warning,
      criticalAfterDays: thresholds.critical,
      isActive: form.isActive,
      boardType: form.boardType,
      /* "" = ทุกคอลัมน์ -> ส่งเป็น null ขึ้น API */
      stageKey: form.stageKey || null,
      /* auto_archive backend บังคับว่าใช้ได้เฉพาะบอร์ดใบสั่งซื้อ */
      actionType: form.actionType,
      /* เฉพาะ auto_archive เท่านั้น (ค่าอื่นส่ง null -> backend ล้างให้เอง) */
      archiveAfterDays:
        form.actionType === "auto_archive" ? archiveValue : null,
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
          LEGEND: อธิบาย 3 Action บนสุด (สี/ไอคอนเดียวกับรายการ)
      ================================================== */}

      <ActionLegend />

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

        {/* กรองตามบอร์ด (ruleคนละบอร์ดกันใช้คนละบอร์ด) */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          {(
            [
              {
                value: "all" as BoardFilter,
                label: t("boardFilterAll"),
              },
              {
                value: "order_pipeline" as BoardFilter,
                label: t("boardOrderPipeline"),
              },
              {
                value: "customers" as BoardFilter,
                label: t("boardCustomers"),
              },
            ]
          ).map((chip) => {
            const active = boardFilter === chip.value;

            return (
              <Chip
                key={chip.value}
                label={chip.label}
                onClick={() =>
                  setBoardFilter(chip.value)
                }
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  bgcolor: active
                    ? "#0891b2"
                    : "#ffffff",
                  color: active
                    ? "#ffffff"
                    : "#475569",
                  border: active
                    ? "none"
                    : "1px solid #e2e8f0",
                  "&:hover": {
                    bgcolor: active
                      ? "#0e7490"
                      : "#f8fafc",
                  },
                }}
              />
            );
          })}
        </Stack>

        {/* กรองตาม Action (สีตรงกับแถบซ้าย / legend / การ์ดในฟอร์ม) */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: "1 1 100%",
            flexWrap: "wrap",
            rowGap: 1,
            alignItems: "center",
          }}
        >
          <Typography
            variant="caption"
            data-testid="action-filter-label"
            sx={{
              color: "#94a3b8",
              fontWeight: 700,
              mr: 0.5,
            }}
          >
            {t("filterActionLabel")}
          </Typography>

          {actionFilterChips.map((chip) => {
            const active = actionFilter === chip.value;
            const tint = chip.color ?? "#2563eb";

            return (
              <Chip
                key={chip.value}
                data-testid={`action-filter-${chip.value}`}
                label={chip.label}
                onClick={() => setActionFilter(chip.value)}
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  bgcolor: active ? tint : "#ffffff",
                  color: active ? "#ffffff" : tint,
                  border: active
                    ? "none"
                    : `1px solid ${tint}55`,
                  "&:hover": {
                    bgcolor: active
                      ? tint
                      : (chip.bgcolor ?? "#f8fafc"),
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

                {/* ---- scope: บอร์ด + คอลัมน์ ---- */}
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={1}
                  sx={{ mt: 1.5 }}
                >
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t("boardLabel")}
                    helperText={t("boardHint")}
                    value={form.boardType}
                    onChange={(event) => {
                      const nextBoard = event
                        .target
                        .value as AgingBoard;

                      setForm((prev) => ({
                        ...prev,
                        boardType: nextBoard,
                        /*
                         * เปลี่ยนบอร์ดแล้ว stageKey เดิมชี้คนละตาราง
                         * -> ล้างเป็น "ทุกคอลัมน์" (backend ก็ล้างให้ซ้ำอีกชั้น)
                         */
                        stageKey: "",
                        /*
                         * auto_archive ใช้ได้เฉพาะใบสั่งซื้อ
                         * -> เปลี่ยนมา Customers แล้วต้องคืนค่าเป็น none
                         */
                        actionType:
                          nextBoard === "customers" &&
                          prev.actionType === "auto_archive"
                            ? "none"
                            : prev.actionType,
                      }));
                    }}
                    disabled={saving}
                  >
                    <MenuItem value="order_pipeline">
                      {t("boardOrderPipeline")}
                    </MenuItem>
                    <MenuItem value="customers">
                      {t("boardCustomers")}
                    </MenuItem>
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t("columnLabel")}
                    helperText={t("columnHint")}
                    value={form.stageKey}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        stageKey: event.target.value,
                      }))
                    }
                    disabled={saving}
                  >
                    {/*
                      ตอน action = edit_lock ต้องเลือกคอลัมน์
                      -> ซ่อนตัวเลือก "ทุกคอลัมน์" ออก
                    */}
                    {form.actionType !== "edit_lock" && (
                      <MenuItem value="">
                        {t("allColumns")}
                      </MenuItem>
                    )}

                    {columnOptions.map((column) => (
                      <MenuItem
                        key={column.stageKey}
                        value={column.stageKey}
                      >
                        {column.label}
                      </MenuItem>
                    ))}

                    {/* คอลัมน์ที่ถูกลบไปแล้วแต่ruleยังชี้อยู่ */}
                    {form.stageKey &&
                      !columnOptions.some(
                        (column) =>
                          column.stageKey ===
                          form.stageKey,
                      ) && (
                        <MenuItem value={form.stageKey}>
                          {`${form.stageKey} — ${t("columnMissing")}`}
                        </MenuItem>
                      )}
                  </TextField>
                </Stack>
              </Box>

              <Divider />

              {/* ---- โซน 2: การกระทำ (การ์ดเลือก 3 ใบ) ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <LockOutlineIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("actionZone")}
                />

                <Typography
                  id="aging-action-label"
                  sx={{
                    fontSize: 13,
                    color: "#64748b",
                    mb: 1,
                  }}
                >
                  {t("actionLabel")}
                </Typography>

                {/*
                  การ์ดเลือก Action 3 ใบ (แทน radio group เดิม)
                  - เลือกแล้วขอบ/พื้นเปลี่ยนเป็นสีประจำ Action
                  - แต่ละใบมีไอคอน + ชื่อ + คำอธิบาย + ตัวอย่างผล
                  - auto_archive disabled เมื่อบอร์ด = customers
                */}
                <Box
                  role="radiogroup"
                  aria-labelledby="aging-action-label"
                  data-testid="action-cards"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {ACTION_ORDER.map((key) => {
                    const meta = ACTION_META[key];
                    const selected = form.actionType === key;
                    const disabled =
                      saving ||
                      (key === "auto_archive" &&
                        form.boardType !== "order_pipeline");

                    return (
                      <ButtonBase
                        key={key}
                        role="radio"
                        aria-checked={selected}
                        data-testid={`action-card-${key}`}
                        disabled={disabled}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            actionType: key,
                          }))
                        }
                        sx={{
                          p: 1.25,
                          textAlign: "left",
                          borderRadius: "12px",
                          border: selected
                            ? `1.5px solid ${meta.color}`
                            : "1.5px solid #e2e8f0",
                          bgcolor: selected
                            ? meta.bgcolor
                            : "#ffffff",
                          opacity: disabled ? 0.55 : 1,
                          transition:
                            "border-color .15s ease, background-color .15s ease",
                          "&:hover": disabled
                            ? undefined
                            : { borderColor: meta.color },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "flex-start" }}
                        >
                          <Box
                            sx={{
                              color: meta.color,
                              display: "flex",
                              mt: "1px",
                              flexShrink: 0,
                            }}
                          >
                            {meta.icon}
                          </Box>

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: selected
                                  ? meta.color
                                  : "#0f172a",
                                lineHeight: 1.3,
                              }}
                            >
                              {t(meta.labelKey)}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "#64748b",
                                lineHeight: 1.45,
                                mt: 0.25,
                              }}
                            >
                              {t(meta.hintKey)}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "#94a3b8",
                                lineHeight: 1.45,
                              }}
                            >
                              {t(meta.exampleKey)}
                            </Typography>
                          </Box>

                          {selected && (
                            <CheckCircleIcon
                              sx={{
                                color: meta.color,
                                fontSize: 18,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Stack>
                      </ButtonBase>
                    );
                  })}
                </Box>

                {/*
                  ช่องวันของ "การลบอัตโนมัติ" — กำหนดเองต่างหาก
                  แยกจาก Warning/Critical ที่ถูกซ่อนไปเมื่อเลือก action นี้
                  (แสดงเฉพาะตอนเลือก auto_archive)
                */}
                {form.actionType === "auto_archive" && (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={t("actionArchiveAfter")}
                    helperText={t("actionArchiveAfterHint")}
                    value={form.archiveAfterDays}
                    slotProps={{
                      htmlInput: { min: 1, max: ARCHIVE_MAX },
                    }}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        archiveAfterDays: event.target.value,
                      }))
                    }
                    disabled={saving}
                    sx={{
                      mt: 1.5,
                      maxWidth: { sm: 320 },
                    }}
                    error={
                      form.archiveAfterDays !== "" &&
                      (!Number.isInteger(archiveValue) ||
                        archiveValue < 1 ||
                        archiveValue > ARCHIVE_MAX)
                    }
                  />
                )}

                {form.actionType === "edit_lock" && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.75,
                      color: "#94a3b8",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("actionEditLockHint")}
                  </Typography>
                )}

                {/* ยังไม่ได้เลือกคอลัมน์ -> เตือนสีแดง (validateForm กันอีกชั้น) */}
                {form.actionType === "edit_lock" &&
                  !form.stageKey && (
                    <Typography
                      variant="caption"
                      data-testid="column-required"
                      sx={{
                        display: "block",
                        mt: 0.25,
                        color: "#dc2626",
                        fontWeight: 700,
                      }}
                    >
                      {t("columnRequired")}
                    </Typography>
                  )}

                {form.actionType === "auto_archive" && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{ mt: 1.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ display: "block" }}
                    >
                      {t("actionAutoArchiveWarning", {
                        days:
                          Number.isInteger(archiveValue) &&
                          archiveValue >= 1 &&
                          archiveValue <= ARCHIVE_MAX
                            ? archiveValue
                            : "—",
                      })}
                    </Typography>

                    {!form.stageKey && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {t("actionAutoArchiveAllColumns")}
                      </Typography>
                    )}
                  </Alert>
                )}

                {form.boardType === "customers" && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#94a3b8",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("actionAutoArchiveBoardOnly")}
                  </Typography>
                )}
              </Box>

              {/*
                ช่วงเกณฑ์วัน (Warning/Critical) + แถบ preview
                ใช้เฉพาะ action = "ไม่มีการกระทำ" (recolor เท่านั้น)
                ถ้าเลือก auto_archive / edit_lock -> ซ่อนทั้งคู่
              */}
              {form.actionType === "none" && <Divider />}

              {/* ---- โซน 3: เกณฑ์เวลา (จำนวนวัน) ---- */}
              {form.actionType === "none" && (
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
              )}

              {/* ---- PREVIEW: แถบเกณฑ์สด ๆ ขณะกรอก ---- */}
              {form.actionType === "none" && (
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
              )}

              <Divider />

              {/* ---- โซน 4: การบังคับใช้ ---- */}
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
