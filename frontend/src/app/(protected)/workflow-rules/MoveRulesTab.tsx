"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ComponentType, FormEvent } from "react";

import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";

import type { SvgIconProps } from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
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
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { api, getErrorMessage } from "@/lib/api";

import { LabeledSwitch, ZoneTitle } from "./shared";
import { useApi } from "@/lib/swr";
import { useSession } from "@/lib/useSession";

import type {
  DocumentTypeItem,
  OrderPipelineStage,
  WorkflowConditionType,
  WorkflowRule,
} from "@/lib/types";

interface RuleForm {
  ruleName: string;
  fromStageId: string;
  toStageId: string;
  conditionType: WorkflowConditionType;
  minFiles: string;
  field: string;
  /*
   * id ของแถวในตาราง document_type (ค่าเป็น string แบบ fromStageId)
   * ใช้เฉพาะ conditionType = 'document'
   */
  docTypeId: string;
  isRequired: boolean;
  isActive: boolean;
}

type StatusFilter = "all" | "active" | "inactive";

const emptyForm: RuleForm = {
  ruleName: "",
  fromStageId: "",
  toStageId: "",
  conditionType: "attachment",
  minFiles: "1",
  field: "note",
  docTypeId: "",
  isRequired: true,
  isActive: true,
};

const CONDITION_TYPES: WorkflowConditionType[] = [
  "attachment",
  "field",
  "document",
  "payment",
];

const FIELD_KEYS = ["note", "details", "amount"] as const;

/*
 * icon ของแต่ละประเภทเงื่อนไข
 * ใช้ทั้งแถวในรายการ และการ์ดเลือกประเภทในฟอร์ม
 * เก็บเป็น map คงที่ (ไม่ใช่ฟังก์ชันคืน component)
 * เพื่อให้ component ไม่ถูกสร้างใหม่ระหว่าง render
 */
const CONDITION_ICONS: Record<
  WorkflowConditionType,
  ComponentType<SvgIconProps>
> = {
  attachment: AttachFileIcon,
  field: EditNoteIcon,
  document: DescriptionIcon,
  payment: ReceiptLongIcon,
};

export default function MoveRulesTab() {
  const router = useRouter();
  const t = useTranslations("workflowRules");
  const tCommon = useTranslations("common");
  const { user, permissions, ready } = useSession();

  const canManage =
    permissions?.administration === true;

  /*
   * ดึงข้อมูลเฉพาะตอน login แล้วและมีสิทธิ์ Administration
   * (useApi(null) คือไม่ยิง request เลย)
   */
  const canLoad =
    ready && user && permissions?.administration === true;

  const {
    data: rulesData,
    isLoading: loading,
    error: loadError,
    mutate: reloadRules,
  } = useApi<WorkflowRule[]>(
    canLoad ? "/api/workflow-rules" : null,
  );

  const {
    data: stagesData,
    isLoading: stagesLoading,
  } = useApi<OrderPipelineStage[]>(
    canLoad ? "/api/order-pipeline" : null,
  );

  /*
   * ประเภทเอกสารทั้งหมด (ตาราง document_type)
   * ใช้เป็นตัวเลือก dropdown "ประเภทเอกสาร" ในฟอร์ม Rule
   */
  const { data: docTypesData } =
    useApi<DocumentTypeItem[]>(
      canLoad ? "/api/document-types" : null,
    );

  const rules = useMemo(
    () => rulesData ?? [],
    [rulesData],
  );

  const stages = useMemo(
    () => stagesData ?? [],
    [stagesData],
  );

  const docTypes = useMemo(
    () => docTypesData ?? [],
    [docTypesData],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<WorkflowRule | null>(null);
  const [form, setForm] =
    useState<RuleForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<WorkflowRule | null>(null);
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

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  /*
   * ตัวเลขบน filter chips นับจากข้อมูลทั้งหมด
   * ไม่ขึ้นกับคำค้น เพื่อให้เห็นภาพรวมเสมอ
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

  /*
   * กรอง 2 ชั้น: สถานะ (chips) แล้วค่อยค้นจากชื่อ Rule/ชื่อขั้นตอน
   */
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

      return (
        rule.ruleName
          .toLowerCase()
          .includes(keyword) ||
        rule.fromStageLabel
          .toLowerCase()
          .includes(keyword) ||
        rule.toStageLabel
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [rules, search, statusFilter]);

  /*
   * จับ rules ที่ผ่าน filter มารวมเป็นกลุ่มตาม From Stage
   * ลำดับกลุ่มกับลำดับแถวเป็นตามที่ backend ส่งมา
   * (เรียงตาม position ของขั้นตอนต้นทาง แล้วตามปลายทาง)
   */
  const groups = useMemo(() => {
    type RuleGroup = {
      fromStageId: number;
      label: string;
      color: string;
      rules: WorkflowRule[];
    };

    const result: RuleGroup[] = [];
    const byStage = new Map<number, RuleGroup>();

    for (const rule of filtered) {
      let group = byStage.get(rule.fromStageId);

      if (!group) {
        group = {
          fromStageId: rule.fromStageId,
          label: rule.fromStageLabel,
          color: rule.fromStageColor,
          rules: [],
        };
        byStage.set(rule.fromStageId, group);
        result.push(group);
      }

      group.rules.push(rule);
    }

    return result;
  }, [filtered]);

  /*
   * คำอธิบาย label ของฟิลด์/เอกสาร ใช้ทั้งการ์ดและ preview ในฟอร์ม
   */
  function fieldLabelOf(field: string) {
    if (field === "details") {
      return t("fieldDetails");
    }

    if (field === "amount") {
      return t("fieldAmount");
    }

    return t("fieldNote");
  }

  /*
   * ชื่อแสดงของประเภทเอกสารจากค่า document_type ในตาราง
   * ค่าที่รู้จักใช้ label จาก i18n — ค่าอื่น (ประเภทใหม่ที่เพิ่มเอง)
   * คืนชื่อดิบจากตารางเลย (ห้าม fallback เป็น label ของ PO)
   */
  function docLabelOf(docType: string) {
    if (docType === "quotation") {
      return t("docQuotation");
    }

    if (docType === "invoice") {
      return t("docInvoice");
    }

    if (docType === "receipt") {
      return t("docReceipt");
    }

    if (docType === "purchase_order") {
      return t("docPurchaseOrder");
    }

    return docType;
  }

  /*
   * แปลง document_type_id (FK) -> ชื่อ document_type ในตาราง
   * ไม่เจอ (ยังไม่โหลด / ถูกลบไปแล้ว) -> undefined ให้ caller fallback เอง
   */
  function docNameById(
    documentTypeId: number | null | undefined,
  ) {
    if (documentTypeId === null || documentTypeId === undefined) {
      return undefined;
    }

    return docTypes.find(
      (item) => item.id === documentTypeId,
    )?.documentType;
  }

  /*
   * ข้อความด้านล่างชื่อ condition ในการ์ด
   * อ่านจากค่าที่บันทึกไว้ใน rule
   */
  function conditionDetail(rule: WorkflowRule) {
    const config = rule.conditionConfig;

    switch (rule.conditionType) {
      case "attachment":
        return t("minFilesValue", {
          count: config.minFiles ?? 1,
        });

      case "field":
        return fieldLabelOf(config.field ?? "note");

      case "document":
        /*
         * ชื่อประเภทมาจาก FK ก่อน (ตาราง document_type)
         * rule เก่าที่ยังไม่มี FK -> fallback config.docType
         */
        return docLabelOf(
          docNameById(rule.documentTypeId) ??
            rule.conditionConfig.docType ??
            t("docTypeLabel"),
        );

      default:
        return t("paymentHint");
    }
  }

  function conditionLabel(
    type: WorkflowConditionType,
  ) {
    if (type === "attachment") {
      return t("condAttachment");
    }

    if (type === "field") {
      return t("condField");
    }

    if (type === "document") {
      return t("condDocument");
    }

    return t("condPayment");
  }

  function conditionDesc(
    type: WorkflowConditionType,
  ) {
    if (type === "attachment") {
      return t("condAttachmentDesc");
    }

    if (type === "field") {
      return t("condFieldDesc");
    }

    if (type === "document") {
      return t("condDocumentDesc");
    }

    return t("condPaymentDesc");
  }

  /*
   * ประโยค "ระบบจะ..." ในแถบ preview ของฟอร์ม
   * สร้างจากค่าที่ผู้ใช้กำลังกรอก ไม่ใช่ค่าที่บันทึกแล้ว
   */
  function previewAction() {
    if (form.conditionType === "attachment") {
      return t("actionAttachment", {
        count: Number(form.minFiles) || 1,
      });
    }

    if (form.conditionType === "field") {
      return t("actionField", {
        field: fieldLabelOf(form.field),
      });
    }

    if (form.conditionType === "document") {
      return t("actionDocument", {
        docType: docLabelOf(
          docNameById(Number(form.docTypeId) || null) ??
            t("docTypeLabel"),
        ),
      });
    }

    return t("actionPayment");
  }

  /*
   * prefillFromStageId: ใช้ตอนกด "+ เพิ่ม Rule จากขั้นตอนนี้"
   * ในหัวกลุ่มของตาราง — เปิดฟอร์มพร้อมใส่ From Stage ให้เลย
   */
  function openCreate(prefillFromStageId?: number) {
    setEditing(null);
    setForm({
      ...emptyForm,
      /*
       * default ประเภทเอกสาร = purchase_order (เหมือนฟอร์มเดิม)
       * ถ้าไม่มีในตารางใช้รายการแรกแทน
       */
      docTypeId: String(
        docTypes.find(
          (item) =>
            item.documentType === "purchase_order",
        )?.id ??
          docTypes[0]?.id ??
          "",
      ),
      ...(prefillFromStageId
        ? {
            fromStageId: String(prefillFromStageId),
          }
        : {}),
    });
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(target: WorkflowRule) {
    setEditing(target);
    setForm({
      ruleName: target.ruleName,
      fromStageId: String(target.fromStageId),
      toStageId: String(target.toStageId),
      conditionType: target.conditionType,
      minFiles: String(
        target.conditionConfig.minFiles ?? 1,
      ),
      field: target.conditionConfig.field ?? "note",
      /*
       * prefill จากคอลัมน์ FK ก่อน — rule เก่าที่ยังไม่มี FK
       * ค่อยหาจาก config.docType (string) ในตาราง
       */
      docTypeId: String(
        target.documentTypeId ??
          docTypes.find(
            (item) =>
              item.documentType ===
              target.conditionConfig.docType,
          )?.id ??
          "",
      ),
      isRequired: target.isRequired,
      isActive: target.isActive,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const ruleName = form.ruleName.trim();

    if (!ruleName) {
      setFormError(t("ruleNameRequired"));
      return;
    }

    const fromStageId = Number(form.fromStageId);
    const toStageId = Number(form.toStageId);

    if (!fromStageId || !toStageId) {
      setFormError(t("stageRequired"));
      return;
    }

    if (fromStageId === toStageId) {
      setFormError(t("sameStage"));
      return;
    }

    let conditionConfig: Record<string, unknown> = {};
    let documentTypeId: number | undefined;

    if (form.conditionType === "attachment") {
      const minFiles = Number(form.minFiles);

      if (
        !Number.isInteger(minFiles) ||
        minFiles < 1 ||
        minFiles > 50
      ) {
        setFormError(t("minFilesInvalid"));
        return;
      }

      conditionConfig = { minFiles };
    }

    if (form.conditionType === "field") {
      conditionConfig = { field: form.field };
    }

    if (form.conditionType === "document") {
      const id = Number(form.docTypeId);

      documentTypeId = id || undefined;
      conditionConfig = {
        docType: docNameById(id) ?? "",
      };

      /*
       * ยังไม่ได้เลือกประเภท -> ให้ backend ตอบข้อความไทย
       * ("กรุณาเลือกประเภทเอกสารที่ต้องมีก่อนย้ายขั้นตอน")
       * ผ่าน formError ด้านล่างเหมือน error อื่น
       */
    }

    setSaving(true);
    setFormError("");

    const payload = {
      ruleName,
      fromStageId,
      toStageId,
      conditionType: form.conditionType,
      conditionConfig,
      ...(documentTypeId ? { documentTypeId } : {}),
      isRequired: form.isRequired,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await api.patch(
          `/api/workflow-rules/${editing.ruleId}`,
          payload,
        );

        showNotice(t("ruleUpdated"), "success");
      } else {
        await api.post("/api/workflow-rules", payload);

        showNotice(t("ruleAdded"), "success");
      }

      setDialogOpen(false);
      await reloadRules();
    } catch (err) {
      setFormError(
        getErrorMessage(err, t("saveError")),
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
        `/api/workflow-rules/${deleteTarget.ruleId}`,
      );

      showNotice(t("ruleDeleted"), "success");
      setDeleteTarget(null);
      await reloadRules();
    } catch (err) {
      showNotice(
        getErrorMessage(err, t("deleteError")),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  /*
   * เปิด/ปิด rule จากการ์ดเลย ไม่ต้องเข้าฟอร์มแก้ไข
   * สำเร็จก็แจ้งให้รู้ (เดิมเงียบไป กดแล้วไม่แน่ใจว่าบันทึกหรือยัง)
   */
  async function handleToggleActive(rule: WorkflowRule) {
    try {
      await api.patch(
        `/api/workflow-rules/${rule.ruleId}`,
        { isActive: !rule.isActive },
      );

      showNotice(
        rule.isActive
          ? t("ruleDisabled")
          : t("ruleEnabled"),
        "success",
      );

      await reloadRules();
    } catch (err) {
      showNotice(
        getErrorMessage(err, t("toggleError")),
        "error",
      );
    }
  }

  /*
   * สลับ Required (บังคับ/ไม่บังคับ) จากการ์ด
   * ปรับได้ทันทีเหมือนสวิตช์เปิด/ปิดใช้งาน
   */
  async function handleToggleRequired(
    rule: WorkflowRule,
  ) {
    try {
      await api.patch(
        `/api/workflow-rules/${rule.ruleId}`,
        { isRequired: !rule.isRequired },
      );

      showNotice(
        rule.isRequired
          ? t("ruleSetOptional")
          : t("ruleSetRequired"),
        "success",
      );

      await reloadRules();
    } catch (err) {
      showNotice(
        getErrorMessage(err, t("toggleError")),
        "error",
      );
    }
  }

  /*
   * ขั้นตอนต้นทาง/ปลายทางที่ผู้ใช้กำลังเลือก
   * เก็บเป็น object เพื่อเอาสีมาแสดง pill ใน preview ให้เหมือนหน้ารายการ
   */
  const previewFromStage = stages.find(
    (stage) =>
      stage.stageId === Number(form.fromStageId),
  );

  const previewToStage = stages.find(
    (stage) =>
      stage.stageId === Number(form.toStageId),
  );

  const previewFromLabel = previewFromStage?.label;
  const previewToLabel = previewToStage?.label;

  const previewReady =
    Boolean(previewFromLabel) &&
    Boolean(previewToLabel);

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

  const filterChips: {
    value: StatusFilter;
    label: string;
  }[] = [
    {
      value: "all",
      label: t("filterAll", { count: counts.all }),
    },
    {
      value: "active",
      label: t("filterActive", {
        count: counts.active,
      }),
    },
    {
      value: "inactive",
      label: t("filterInactive", {
        count: counts.inactive,
      }),
    },
  ];

  /*
   * รายการการ์ด Rule กลุ่มตามขั้นตอนต้นทาง
   * แต่ละแถวอ่านจบในตัวเอง: ชื่อ + ทางเดิน From → To + เงื่อนไข + สวิตช์
   *
   * header ของหน้า (ชื่อเรื่อง/คำอธิบาย) และแถบ Tabs อยู่ที่ page.tsx
   * คอมโพเนนต์นี้คืนเฉพาะเนื้อหาของแท็บ "การย้ายการ์ด" เท่านั้น
   */
  return (
    <>
      {/*
        ปุ่มเพิ่ม Rule ชิดขวา เหนือ toolbar
        (เดิมอยู่หัวข้อขวาของหน้า ซึ่งย้ายไป shell ของ page.tsx แล้ว)
      */}
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
          {t("readOnly")}
        </Alert>
      )}

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("loadError")}
        </Alert>
      )}

      {/* =================================================
          TOOLBAR: ค้นหา + กรองสถานะ
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
          รายการ RULE การ์ด กลุ่มตามขั้นตอนต้นทาง
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
                overflow: "hidden",
              }}
            >
              {/* หัวกลุ่ม */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2.5,
                  py: 1.5,
                  bgcolor: "#f8fafc",
                  borderBottom: "1px solid #e7ebf2",
                }}
              >
                <Skeleton
                  variant="circular"
                  width={10}
                  height={10}
                />
                <Skeleton width={160} height={20} />
              </Box>

              {/* แถว rule */}
              <Box sx={{ px: 2.5, py: 2 }}>
                <Skeleton width="45%" height={22} />
                <Skeleton
                  width="70%"
                  height={26}
                  sx={{ mt: 1 }}
                />
                <Skeleton
                  width="35%"
                  height={20}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Card>
          ))}
        </Stack>
      ) : groups.length === 0 ? (
        <Card
          sx={{
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            boxShadow: "none",
            py: 7,
            px: 3,
            textAlign: "center",
          }}
        >
          <RuleIcon
            sx={{
              fontSize: 44,
              color: "#cbd5e1",
            }}
          />

          <Typography
            sx={{
              mt: 1.5,
              fontWeight: 800,
              color: "#172033",
            }}
          >
            {search.trim() ||
            statusFilter !== "all"
              ? t("noResults")
              : t("noRules")}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: "#94a3b8",
            }}
          >
            {search.trim() ||
            statusFilter !== "all"
              ? t("noResultsHint")
              : t("noRulesHint")}
          </Typography>

          {!search.trim() &&
            statusFilter === "all" &&
            canManage && (
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
        <Stack spacing={2.5}>
          {groups.map((group) => (
            <Box
              key={group.fromStageId}
              sx={{
                border: "1px solid #e7ebf2",
                borderRadius: "16px",
                boxShadow:
                  "0 1px 3px rgba(15,23,42,0.04)",
                overflow: "hidden",
                bgcolor: "#ffffff",
              }}
            >
              {/* หัวกลุ่ม: ขั้นตอนต้นทาง + ปุ่มเพิ่ม Rule ของกลุ่มนี้ */}
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
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor:
                      group.color || "#94a3b8",
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
                  {t("groupFromLabel", {
                    stage: group.label,
                  })}
                </Typography>

                <Chip
                  size="small"
                  label={t("groupCount", {
                    count: group.rules.length,
                  })}
                  sx={{
                    height: 22,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    bgcolor: "#eef2f7",
                  }}
                />

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  size="small"
                  startIcon={
                    <AddIcon fontSize="small" />
                  }
                  disabled={!canManage}
                  onClick={() =>
                    openCreate(group.fromStageId)
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 13,
                    color: canManage
                      ? "#2563eb"
                      : "#94a3b8",
                    "&:hover": {
                      bgcolor: "#eef2f7",
                    },
                  }}
                >
                  {t("addGroupRule")}
                </Button>
              </Box>

              {/* แถว Rule แต่ละใบ */}
              {group.rules.map((rule) => (
                <RuleRow
                  key={rule.ruleId}
                  rule={rule}
                  canManage={canManage}
                  conditionLabel={conditionLabel(
                    rule.conditionType,
                  )}
                  conditionDetail={conditionDetail(rule)}
                  onToggleRequired={() =>
                    void handleToggleRequired(rule)
                  }
                  onToggleActive={() =>
                    void handleToggleActive(rule)
                  }
                  onEdit={() => openEdit(rule)}
                  onDelete={() => setDeleteTarget(rule)}
                />
              ))}
            </Box>
          ))}
        </Stack>
      )}

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
          CREATE / EDIT DIALOG
      ================================================== */}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing ? t("editRule") : t("addRule")}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error">
                  {formError}
                </Alert>
              )}

              {/* ---- ชื่อ Rule (แสดงในตาราง/ข้อแจ้งเตือน) ---- */}
              <TextField
                fullWidth
                size="small"
                label={t("ruleName")}
                helperText={t("ruleNameHint")}
                value={form.ruleName}
                slotProps={{
                  htmlInput: { maxLength: 150 },
                }}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruleName: event.target.value,
                  }))
                }
                disabled={saving}
                required
              />

              {/* ---- โซน1: เส้นทางการย้าย ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <ArrowForwardIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("zoneRoute")}
                />

                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={1}
                  sx={{
                    alignItems: {
                      xs: "stretch",
                      sm: "center",
                    },
                  }}
                >
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label={t("fromStage")}
                    value={form.fromStageId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fromStageId:
                          event.target.value,
                      }))
                    }
                    disabled={
                      saving || stagesLoading
                    }
                    required
                  >
                    <MenuItem value="">
                      {t("selectStage")}
                    </MenuItem>

                    {stages.map((stage) => {
                      const isSame =
                        stage.stageId ===
                        Number(form.toStageId);

                      return (
                        <StageMenuItem
                          key={stage.stageId}
                          stage={stage}
                          disabled={isSame}
                          badge={
                            isSame
                              ? t("sameStageOption")
                              : undefined
                          }
                        />
                      );
                    })}
                  </TextField>

                  <ArrowForwardIcon
                    sx={{
                      color: "#94a3b8",
                      alignSelf: {
                        xs: "center",
                        sm: "flex-start",
                      },
                      mt: { sm: 1.75 },
                      display: {
                        xs: "none",
                        sm: "block",
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    select
                    size="small"
                    label={t("toStage")}
                    value={form.toStageId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        toStageId:
                          event.target.value,
                      }))
                    }
                    disabled={
                      saving || stagesLoading
                    }
                    required
                  >
                    <MenuItem value="">
                      {t("selectStage")}
                    </MenuItem>

                    {stages.map((stage) => {
                      const isSame =
                        stage.stageId ===
                        Number(form.fromStageId);

                      return (
                        <StageMenuItem
                          key={stage.stageId}
                          stage={stage}
                          disabled={isSame}
                          badge={
                            isSame
                              ? t("sameStageOption")
                              : undefined
                          }
                        />
                      );
                    })}
                  </TextField>
                </Stack>

                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: "#94a3b8",
                  }}
                >
                  {t("routeHint")}
                </Typography>
              </Box>

              <Divider />

              {/* ---- โซน2: เงื่อนไขที่ต้องผ่าน ---- */}
              <Box>
                <ZoneTitle
                  icon={
                    <DescriptionIcon
                      sx={{
                        fontSize: 16,
                        color: "#2563eb",
                      }}
                    />
                  }
                  text={t("zoneCondition")}
                />

                <Stack spacing={2}>
                  {/*
                      การ์ดเลือกประเภทเงื่อนไข แทน dropdown
                      เห็นชื่อ + คำอธิบายครบในที่เดียว ไม่ต้องเปิดดูทีละอัน
                  */}
                  <Box
                    role="radiogroup"
                    aria-label={t("conditionType")}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "1fr 1fr",
                      },
                      gap: 1,
                    }}
                  >
                    {CONDITION_TYPES.map((type) => (
                      <ConditionOptionCard
                        key={type}
                        type={type}
                        selected={
                          form.conditionType === type
                        }
                        disabled={saving}
                        label={conditionLabel(type)}
                        description={conditionDesc(type)}
                        onSelect={() =>
                          setForm((current) => ({
                            ...current,
                            conditionType: type,
                          }))
                        }
                      />
                    ))}
                  </Box>

                  {form.conditionType ===
                    "attachment" && (
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={t("minFiles")}
                      helperText={t("minFilesHint")}
                      value={form.minFiles}
                      slotProps={{
                        htmlInput: { min: 1, max: 50 },
                      }}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          minFiles:
                            event.target.value,
                        }))
                      }
                      disabled={saving}
                    />
                  )}

                  {form.conditionType === "field" && (
                    <TextField
                      fullWidth
                      select
                      size="small"
                      label={t("fieldLabel")}
                      value={form.field}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          field: event.target.value,
                        }))
                      }
                      disabled={saving}
                    >
                      {FIELD_KEYS.map((key) => (
                        <MenuItem key={key} value={key}>
                          {fieldLabelOf(key)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {form.conditionType ===
                    "document" && (
                    <TextField
                      fullWidth
                      select
                      size="small"
                      label={t("docTypeLabel")}
                      value={form.docTypeId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          docTypeId:
                            event.target.value,
                        }))
                      }
                      disabled={saving}
                    >
                      {docTypes.map((item) => (
                        <MenuItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {docLabelOf(
                            item.documentType,
                          )}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* ---- โซน3: การบังคับใช้ ---- */}
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
                        checked={form.isRequired}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            isRequired:
                              event.target.checked,
                          }))
                        }
                      />
                    }
                    label={
                      form.isRequired
                        ? t("requiredLabel")
                        : t("optionalLabel")
                    }
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      ml: 4.5,
                      color: "#94a3b8",
                    }}
                  >
                    {form.isRequired
                      ? t("requiredHint")
                      : t("optionalHint")}
                  </Typography>
                </Box>

                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isActive}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            isActive:
                              event.target.checked,
                          }))
                        }
                      />
                    }
                    label={t("activeLabel")}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      ml: 4.5,
                      color: "#94a3b8",
                    }}
                  >
                    {t("activeHint")}
                  </Typography>
                </Box>
              </Box>

              {/* ---- PREVIEW: ผลลัพธ์สด ๆ ขณะกรอก ---- */}
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
                  {t("previewTitle")}
                </Typography>

                {previewReady ? (
                  <>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        mt: 1,
                        alignItems: "center",
                        flexWrap: "wrap",
                        rowGap: 0.5,
                      }}
                    >
                      <StagePill
                        label={previewFromLabel ?? ""}
                        color={
                          previewFromStage?.color ?? ""
                        }
                      />

                      <ArrowForwardIcon
                        sx={{
                          fontSize: 15,
                          color: "#60a5fa",
                          flexShrink: 0,
                        }}
                      />

                      <StagePill
                        label={previewToLabel ?? ""}
                        color={
                          previewToStage?.color ?? ""
                        }
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{ mt: 1, color: "#1e3a8a" }}
                    >
                      {form.isRequired
                        ? t("previewRequired", {
                            action: previewAction(),
                          })
                        : t("previewOptional", {
                            action: previewAction(),
                          })}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        mt: 1,
                        flexWrap: "wrap",
                        rowGap: 0.5,
                      }}
                    >
                      <Chip
                        size="small"
                        label={
                          form.isRequired
                            ? t("chipRequired")
                            : t("chipOptional")
                        }
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: form.isRequired
                            ? "#1d4ed8"
                            : "#64748b",
                          bgcolor: form.isRequired
                            ? "#dbeafe"
                            : "#eef2f7",
                        }}
                      />

                      <Chip
                        size="small"
                        label={
                          form.isActive
                            ? t("switchActiveOn")
                            : t("switchActiveOff")
                        }
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: form.isActive
                            ? "#15803d"
                            : "#64748b",
                          bgcolor: form.isActive
                            ? "#dcfce7"
                            : "#eef2f7",
                        }}
                      />
                    </Stack>

                    {!form.isActive && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.75,
                          color: "#94a3b8",
                        }}
                      >
                        {t("activeHint")}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, color: "#64748b" }}
                  >
                    {t("previewPickStages")}
                  </Typography>
                )}
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
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {saving ? (
                <CircularProgress
                  size={20}
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
          {t("deleteConfirmTitle")}
        </DialogTitle>

        <DialogContent>
          <Typography component="div" variant="body2">
            {t("deleteConfirmMessage", {
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
            {deleting ? t("deleting") : tCommon("delete")}
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

/* ป้ายขั้นตอนพร้อมจุดสีประจำคอลัมน์ */
function StagePill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.4,
        borderRadius: 999,
        border: "1px solid #e2e8f0",
        bgcolor: "#f8fafc",
        minWidth: 0,
        maxWidth: "40%",
      }}
    >
      <Box
        sx={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          bgcolor: color || "#94a3b8",
          flexShrink: 0,
        }}
      />

      <Typography
        variant="caption"
        noWrap
        sx={{
          fontWeight: 700,
          color: "#334155",
        }}
      >
        {label || "-"}
      </Typography>
    </Box>
  );
}

/* หัวข้อโซนในฟอร์ม + สวิตช์พร้อม label: ย้ายไป shared.tsx
   เพื่อให้แท็บ aging ใช้คอมโพเนนต์ชุดเดียวกัน */

/* =====================================================
   แถว Rule หนึ่งใบในการ์ดกลุ่ม
   อ่านจบในสายตาเดียว:
   ชื่อ -> ทางเดิน From → To -> เงื่อนไข -> สวิตช์ (มี label)
===================================================== */
function RuleRow({
  rule,
  canManage,
  conditionLabel,
  conditionDetail,
  onToggleRequired,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  rule: WorkflowRule;
  canManage: boolean;
  conditionLabel: string;
  conditionDetail: string;
  onToggleRequired: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("workflowRules");
  const tCommon = useTranslations("common");

  const ConditionIcon =
    CONDITION_ICONS[rule.conditionType];

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
      {/* 1) ชื่อ Rule + ทางเดิน From → To */}
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
              label={t("inactiveChip")}
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

        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            mt: 0.75,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <StagePill
            label={rule.fromStageLabel}
            color={rule.fromStageColor}
          />

          <ArrowForwardIcon
            sx={{
              fontSize: 15,
              color: "#94a3b8",
              flexShrink: 0,
            }}
          />

          <StagePill
            label={rule.toStageLabel}
            color={rule.toStageColor}
          />
        </Stack>
      </Box>

      {/* 2) เงื่อนไข */}
      <Box
        sx={{
          flex: {
            xs: "1 1 100%",
            md: "1 1 250px",
          },
          minWidth: 0,
          display: "flex",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            bgcolor: "#e8f1ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ConditionIcon sx={{ fontSize: 17 }} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              color: "#334155",
              lineHeight: 1.3,
            }}
          >
            {conditionLabel}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "#94a3b8",
              lineHeight: 1.4,
            }}
          >
            {conditionDetail}
          </Typography>
        </Box>
      </Box>

      {/* 3) สวิตช์ พร้อม label ใต้ตัว */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ flexShrink: 0 }}
      >
        <LabeledSwitch
          checked={rule.isRequired}
          disabled={!canManage}
          labelOn={t("chipRequired")}
          labelOff={t("chipOptional")}
          ariaLabel={t("switchRequired")}
          onChange={onToggleRequired}
        />

        <LabeledSwitch
          checked={rule.isActive}
          disabled={!canManage}
          labelOn={t("switchActiveOn")}
          labelOff={t("switchActiveOff")}
          ariaLabel={t("switchActive")}
          onChange={onToggleActive}
        />
      </Stack>

      {/* 4) ปุ่มจัดการ (มี tooltip บอกชื่อปุ่ม) */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ ml: "auto", flexShrink: 0 }}
      >
        <Tooltip
          title={t("editRule")}
          placement="top"
          arrow
        >
          <IconButton
            size="small"
            aria-label={t("editRule")}
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

/*
 * ตัวเลือกขั้นตอนใน dropdown ของฟอร์ม
 * มีจุดสีประจำขั้นตอน และ badge "ขั้นตอนเดียวกัน"
 * เมื่อชนกับอีกฝั่ง (กันเลือก From = To ตั้งแต่ต้น)
 */
function StageMenuItem({
  stage,
  disabled,
  badge,
}: {
  stage: OrderPipelineStage;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <MenuItem
      value={String(stage.stageId)}
      disabled={disabled}
      sx={{ gap: 1 }}
    >
      <Box
        sx={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          bgcolor: stage.color || "#94a3b8",
          flexShrink: 0,
        }}
      />

      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          color: disabled ? "#94a3b8" : undefined,
        }}
      >
        {stage.label}
      </Typography>

      {badge && (
        <Typography
          variant="caption"
          sx={{
            color: "#94a3b8",
            flexShrink: 0,
          }}
        >
          {badge}
        </Typography>
      )}
    </MenuItem>
  );
}

/*
 * การ์ดเลือกประเภทเงื่อนไขในฟอร์ม (แทน dropdown)
 * แสดง icon + ชื่อ + คำอธิบายครบในที่เดียว
 * ใช้ role="radio" เพื่อให้ screen reader ออกเสียงถูก
 */
function ConditionOptionCard({
  type,
  selected,
  disabled,
  label,
  description,
  onSelect,
}: {
  type: WorkflowConditionType;
  selected: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  const Icon = CONDITION_ICONS[type];

  return (
    <Box
      component="button"
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        p: 1.25,
        textAlign: "left",
        font: "inherit",
        cursor: disabled ? "default" : "pointer",
        border: "1px solid",
        borderColor: selected ? "#2563eb" : "#e2e8f0",
        borderRadius: "12px",
        bgcolor: selected ? "#eff6ff" : "#ffffff",
        transition:
          "border-color .15s ease, background-color .15s ease",
        "&:hover:not(:disabled)": {
          borderColor: selected ? "#2563eb" : "#93c5fd",
        },
        "&:focus-visible": {
          outline: "2px solid #2563eb",
          outlineOffset: 2,
        },
        "&:disabled": {
          opacity: 0.6,
        },
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "8px",
          bgcolor: selected ? "#2563eb" : "#e8f1ff",
          color: selected ? "#ffffff" : "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 16 }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: selected ? "#1d4ed8" : "#334155",
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.25,
            color: "#94a3b8",
            lineHeight: 1.45,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
}