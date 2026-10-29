"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChangeEvent } from "react";

import { useLocale, useTranslations } from "next-intl";

import { isAxiosError } from "axios";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { api, getErrorMessage } from "@/lib/api";
import { formatFileSize, formatMoney, round2 } from "@/lib/format";
import { useApi } from "@/lib/swr";

import FilePreviewDialog from "@/components/FilePreviewDialog";
import SummaryRow from "@/components/SummaryRow";

import type {
  DocumentTypeItem,
  IssueOrder,
  IssueOrderAttachment,
  OrderPipelineStage,
  PendingStageMove,
  WorkflowMoveCheck,
  WorkflowRuleCheck,
} from "@/lib/types";

interface Props {
  order: IssueOrder;
  stages: OrderPipelineStage[];

  /*
   * ค่าจริงมาจาก server หลังบันทึกเสร็จ
   * คืนค่า true เมื่อบันทึกสำเร็จ ให้ฝั่ง dialog เอาค่ากลับไปแก้ UI เอง
   */
  onStageChange: (
    orderId: number,
    stageKey: string,
  ) => Promise<boolean>;

  onDelete: (orderId: number) => Promise<void>;

  deleting?: boolean;

  /*
   * แจ้งหน้าบอร์ดว่าไฟล์แนบเปลี่ยน
   * เพื่อ refresh ป้ายรูปหนีบบนการ์ด
   */
  onAttachmentsChange?: () => void;

  /*
   * การย้ายขั้นตอนที่ถูก Workflow Rule บล็อก (ส่งมาจากหน้าบอร์ด)
   * แสดงเป็นแถบ mark ในฟอร์มว่าต้องแนบไฟล์อะไร
   * พอผ่านครบทุกข้อจะมีปุ่มยืนยันย้ายขั้นตอนให้กด
   */
  pendingMove?: PendingStageMove | null;

  onClose: () => void;
}

export default function OrderDetailDialog({
  order,
  stages,
  onStageChange,
  onDelete,
  deleting = false,
  onAttachmentsChange,
  pendingMove = null,
  onClose,
}: Props) {
  const t = useTranslations("orderPipeline");
  /*
   * ใช้เฉพาะ label ประเภทเอกสาร (docPurchaseOrder ฯลฯ)
   * เพื่อไม่ต้องนิยามซ้ำใน namespace ของ orderPipeline
   */
  const tw = useTranslations("workflowRules");
  const locale = useLocale();

  /*
   * เก็บขั้นตอนที่ผู้ใช้เลือกไว้ใน dialog เอง
   * เพราะ object order ที่มาจากบอร์ดอาจเป็นชุดเก่า
   * ตอนเปิด dialog ใหม่จะได้ค่าล่าสุดจากฝั่งบอร์ดอยู่แล้ว
   */
  const [stageKey, setStageKey] = useState(
    order.orderPipeline?.stageKey ?? "",
  );
  const [savingStage, setSavingStage] =
    useState(false);
  const [confirmingDelete, setConfirmingDelete] =
    useState(false);

  /* =====================================================
     ไฟล์แนบ (ใช้ตอนตรวจ Workflow Rule "ต้องแนบไฟล์")
  ===================================================== */

  const [attachments, setAttachments] = useState<
    IssueOrderAttachment[]
  >([]);
  const [attachmentsLoading, setAttachmentsLoading] =
    useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteAttachment, setDeleteAttachment] =
    useState<IssueOrderAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] =
    useState(false);

  /* ไฟล์ที่กำลังเปิดดูใน dialog preview (null = ปิดอยู่) */
  const [previewAttachment, setPreviewAttachment] =
    useState<IssueOrderAttachment | null>(null);

  const [attachmentNotice, setAttachmentNotice] =
    useState("");
  const [attachmentNoticeType, setAttachmentNoticeType] =
    useState<"success" | "error">("success");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* =====================================================
     การย้ายขั้นตอนที่ถูก Workflow Rule บล็อก (ยังไม่ได้แนบไฟล์)
  ===================================================== */

  /*
   * ใช้เฉพาะเมื่อเป็นการย้ายของใบสั่งซื้อใบนี้
   * กันแถบ mark ผิดใบเมื่อเปิดการ์ดอื่นขณะ pendingMove ยังค้างอยู่
   */
  const activePendingMove =
    pendingMove && pendingMove.orderId === order.id
      ? pendingMove
      : null;

  /* รหัสเส้นทางการย้าย: ใบสั่งซื้อ -> ขั้นตอนเป้าหมาย */
  const targetKey = activePendingMove
    ? `${activePendingMove.orderId}:${activePendingMove.toStageKey}`
    : "";

  /*
   * ผลตรวจล่าสุดจาก GET /workflow-rules/check
   * ใช้ทับ payload ได้เฉพาะเมื่อดึงมาให้ "ใบสั่งซื้อ/เป้าหมาย/ก้อน payload"
   * ชุดเดียวกัน — ถูกบล็อกใหม่ (payload ก้อนใหม่) ให้แสดงของใหม่ทันที
   * null = ยังไม่เคยดึง -> ใช้รายการจาก payload ตอนถูกบล็อกแทน
   */
  const [fetchedRules, setFetchedRules] = useState<{
    key: string;
    source: PendingStageMove;
    rules: WorkflowRuleCheck[];
  } | null>(null);

  const ruleChecks =
    activePendingMove !== null &&
    fetchedRules?.key === targetKey &&
    fetchedRules.source === activePendingMove
      ? fetchedRules.rules
      : (activePendingMove?.rules ?? []);

  const reloadRuleChecks = useCallback(async () => {
    if (!activePendingMove) {
      return;
    }

    const stage = stages.find(
      (item) =>
        item.stageKey === activePendingMove.toStageKey,
    );

    if (!stage) {
      return;
    }

    try {
      const response = await api.get<WorkflowMoveCheck>(
        "/api/workflow-rules/check",
        {
          params: {
            orderId: order.id,
            toStageId: stage.stageId,
          },
        },
      );

      setFetchedRules({
        key: targetKey,
        source: activePendingMove,
        rules: response.data.rules,
      });
    } catch {
      // คงผลตรวจล่าสุดไว้ — ครั้งหน้าที่เปิด/อัปโหลดจะลองใหม่
    }
  }, [activePendingMove, targetKey, stages, order.id]);

  /*
   * ไม่ต้อง fetch ตอนเปิด dialog: payload ของ 400 ที่ทำให้ฟอร์มเด้งขึ้นมา
   * ถูกตรวจฝั่ง server ตอนนั้นเองจึงใหม่สดอยู่แล้ว
   * จึงดึงซ้ำเฉพาะหลังเกิดเหตุการณ์ที่เปลี่ยนผลตรวจ
   * (อัปโหลด/ลบไฟล์ หรือย้ายขั้นตอนไม่สำเร็จ) ผ่าน reloadRuleChecks()
   */

  /* =====================================================
     ประเภทเอกสารของไฟล์ที่กำลังจะอัปโหลด
     (ส่งเป็น documentTypeId เพื่อให้ผ่าน rule ประเภท document)
  ===================================================== */

  const { data: docTypesData } =
    useApi<DocumentTypeItem[]>("/api/document-types");

  const docTypes = useMemo(
    () => docTypesData ?? [],
    [docTypesData],
  );

  /*
   * ค่าที่ rule กำหนดให้อัตโนมัติ:
   * rule แรกที่ยังไม่ผ่านและเรียกร้องประเภทเอกสาร
   * null = ไม่มี rule ประเภทนี้ -> ไม่บังคับต้องเลือก
   */
  const requiredDocTypeId =
    ruleChecks.find(
      (item) => !item.met && item.documentTypeId !== null,
    )?.documentTypeId ?? null;

  /*
   * ค่าที่ผู้ใช้เลือกเอง ผูกกับเส้นทางการย้าย (targetKey)
   * เปลี่ยนเป้าหมาย -> กลับไปใช้ค่าที่ rule กำหนดใหม่
   * null = ยังไม่เคยเลือกเอง
   */
  const [uploadDocTypeChoice, setUploadDocTypeChoice] =
    useState<{
      targetKey: string;
      value: number | "";
    } | null>(null);

  const uploadDocTypeId: number | "" =
    uploadDocTypeChoice !== null &&
    uploadDocTypeChoice.targetKey === targetKey
      ? uploadDocTypeChoice.value
      : (requiredDocTypeId ?? "");

  /*
   * label ของ document_type ให้ตรงกับหน้า Workflow Rules
   * ค่าที่ไม่ใช่ 4 แบบมาตรฐาน (type ที่เพิ่มเอง) แสดง key ตรง ๆ
   */
  function docTypeLabel(key: string) {
    if (key === "quotation") {
      return tw("docQuotation");
    }

    if (key === "invoice") {
      return tw("docInvoice");
    }

    if (key === "receipt") {
      return tw("docReceipt");
    }

    if (key === "purchase_order") {
      return tw("docPurchaseOrder");
    }

    return key;
  }

  /* ทุกข้อผ่านแล้ว -> โชว์ปุ่มยืนยันย้ายขั้นตอน */
  const rulesAllMet = ruleChecks.every((item) => item.met);

  /*
   * โหลดรายการไฟล์เองทุกครั้งที่เปิด dialog
   * เพราะ board เก็บ data ชุดเก่าไว้ อาจยังไม่มีไฟล์ที่เพิ่งอัปโหลด
   */
  useEffect(() => {
    let cancelled = false;

    async function loadAttachments() {
      try {
        const response = await api.get<
          IssueOrderAttachment[]
        >(`/api/issue-orders/${order.id}/attachments`);

        if (!cancelled) {
          setAttachments(response.data);
        }
      } catch {
        if (!cancelled) {
          setAttachmentNotice(t("loadError"));
          setAttachmentNoticeType("error");
        }
      } finally {
        if (!cancelled) {
          setAttachmentsLoading(false);
        }
      }
    }

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [order.id, t]);

  async function reloadAttachments() {
    try {
      const response = await api.get<
        IssueOrderAttachment[]
      >(`/api/issue-orders/${order.id}/attachments`);

      setAttachments(response.data);
      onAttachmentsChange?.();
    } catch {
      // รอบถัดไปที่เปิด dialog จะโหลดใหม่เอง
    }
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    // รีเซ็ตค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้หลังอัปโหลด
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setAttachmentNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      /*
       * ประเภทเอกสารที่ผู้ใช้เลือก (หรือที่ระบบเลือกให้จาก rule ที่ยังไม่ผ่าน)
       * ส่งไปเป็น documentTypeId เพื่อให้ rule ประเภท document/payment
       * ตรวจพบไฟล์นี้ — ไม่ส่งก็ได้ (เป็นไฟล์แนบประเภททั่วไป)
       */
      if (uploadDocTypeId !== "") {
        formData.append(
          "documentTypeId",
          String(uploadDocTypeId),
        );
      }

      await api.post(
        `/api/issue-orders/${order.id}/attachments`,
        formData,
      );

      setAttachmentNotice(t("uploadSuccess"));
      setAttachmentNoticeType("success");
      await reloadAttachments();

      /*
       * อัปโหลดสำเร็จ -> เช็ก rule ใหม่ทันที
       * ให้แถบ mark เปลี่ยนเป็น ✅ และโชว์ปุ่มยืนยันย้ายเมื่อผ่านครบ
       */
      await reloadRuleChecks();
    } catch (err) {
      /*
       * 413 มาจาก multer ที่ตรวจขนาดไฟล์ (ข้อความเป็นอังกฤษ)
       * จึงแปลงเป็นข้อความไทยเอง
       */
      const status =
        isAxiosError(err) && err.response
          ? err.response.status
          : undefined;

      setAttachmentNotice(
        status === 413
          ? t("uploadTooLarge")
          : getErrorMessage(err, t("uploadError")),
      );
      setAttachmentNoticeType("error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(
    item: IssueOrderAttachment,
  ) {
    try {
      const response = await api.get<Blob>(
        `/api/issue-orders/${order.id}/attachments/${item.attachmentId}/file`,
        { responseType: "blob" },
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = item.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setAttachmentNotice(
        getErrorMessage(err, t("uploadError")),
      );
      setAttachmentNoticeType("error");
    }
  }

  async function handleDeleteAttachment() {
    if (!deleteAttachment) {
      return;
    }

    setDeletingAttachment(true);

    try {
      await api.delete(
        `/api/issue-orders/${order.id}/attachments/${deleteAttachment.attachmentId}`,
      );

      setAttachmentNotice(t("attachmentDeleted"));
      setAttachmentNoticeType("success");
      setDeleteAttachment(null);
      await reloadAttachments();

      // ลบไฟล์แล้ว -> กฎอาจไม่ผ่านอีกครั้ง จึงเช็กใหม่เสมอ
      await reloadRuleChecks();
    } catch (err) {
      setAttachmentNotice(
        getErrorMessage(
          err,
          t("attachmentDeleteError"),
        ),
      );
      setAttachmentNoticeType("error");
      setDeleteAttachment(null);
    } finally {
      setDeletingAttachment(false);
    }
  }

  async function handleStageChange(
    nextStageKey: string,
  ) {
    if (!nextStageKey || nextStageKey === stageKey) {
      return;
    }

    setStageKey(nextStageKey);
    setSavingStage(true);

    const saved = await onStageChange(
      order.id,
      nextStageKey,
    );

    /*
     * บันทึกไม่สำเร็จ -> ดีดขั้นตอนกลับเป็นค่าเดิม
     * แล้วให้ notice จากฝั่ง page เป็นคนแจ้งสาเหตุ
     */
    if (!saved) {
      setStageKey(
        order.orderPipeline?.stageKey ?? "",
      );

      // ย้ายไม่ได้ -> อัปเดตแถบ mark ว่าตอนนี้ยังขาดอะไรอยู่
      void reloadRuleChecks();
    }

    setSavingStage(false);
  }

  /*
   * ปุ่ม "ย้ายไป {ขั้นตอน} เลย" ในแถบ mark
   * เรียกกลไกเดียวกับการเลือก Change stage
   * (ผ่าน rule ครบแล้วจึงต้องย้ายสำเร็จ)
   */
  async function confirmPendingMove() {
    if (!activePendingMove) {
      return;
    }

    await handleStageChange(
      activePendingMove.toStageKey,
    );
  }

  async function handleDelete() {
    try {
      await onDelete(order.id);
    } catch {
      // ฝั่ง page เป็นคนแสดง notice สาเหตุอยู่แล้ว
    }
  }

  const lines = order.details ?? [];

  /*
   * ใบสั่งซื้อเก่าที่ยังไม่มี discount/vat ให้ treat เป็น 0% / 7%
   * ทุกค่าปัดเศษ 2 ตำแหน่งก่อนแสดง เพื่อให้ตรงกับยอดที่บันทึกไว้
   */
  const discountPercent = order.discountPercent ?? 0;
  const vatPercent = order.vatPercent ?? 7;

  const subtotal = round2(
    lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPrice,
      0,
    ),
  );

  const discountAmount = round2(
    (subtotal * discountPercent) / 100,
  );

  const afterDiscount = round2(
    subtotal - discountAmount,
  );

  const vatAmount = round2(
    (afterDiscount * vatPercent) / 100,
  );

  const grandTotal = round2(
    afterDiscount + vatAmount,
  );

  return (
    <Dialog
      open
      onClose={() => {
        /*
         * กำลังเปิดดูไฟล์อยู่ -> Escape/คลิกพื้นหลัง
         * ให้ปิดแค่ dialog ดูไฟล์ก่อน ไม่ปิดหน้ารายละเอียดตาม
         */
        if (previewAttachment) {
          setPreviewAttachment(null);
          return;
        }

        onClose();
      }}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          fontWeight: 800,
          fontSize: 18,
          color: "#172033",
          pb: 1,
        }}
      >
        {t("detailTitle", { id: order.id })}

        <IconButton
          size="small"
          aria-label={t("closeAria")}
          onClick={onClose}
          sx={{ color: "#64748b" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/*
            แถบ mark: สาเหตุที่ย้ายขั้นตอนไม่ได้ + สิ่งที่ต้องทำ
            แสดงเมื่อการย้ายถูก Workflow Rule บล็อก (ยังไม่ได้แนบไฟล์)
            พอทุกข้อผ่าน -> เปลี่ยนเป็นสีเขียวพร้อมปุ่มยืนยันย้าย
          */}
          {activePendingMove && (
            <Alert
              severity={rulesAllMet ? "success" : "warning"}
              variant="outlined"
              sx={{ borderRadius: "10px" }}
              action={
                rulesAllMet ? (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={savingStage}
                    onClick={() =>
                      void confirmPendingMove()
                    }
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      bgcolor: "#2563eb",
                      "&:hover": { bgcolor: "#1d4ed8" },
                    }}
                  >
                    {t("confirmMove", {
                      stage:
                        activePendingMove.toStageLabel,
                    })}
                  </Button>
                ) : undefined
              }
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 14,
                  color:
                    rulesAllMet ? "#15803d" : "#b45309",
                }}
              >
                {rulesAllMet
                  ? t("rulesPassedTitle")
                  : t("blockedMoveTitle", {
                      stage:
                        activePendingMove.toStageLabel,
                    })}
              </Typography>

              <Stack
                spacing={0.75}
                sx={{ mt: 0.75 }}
              >
                {ruleChecks.map((rule) => (
                  <Box
                    key={rule.ruleId}
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "flex-start",
                    }}
                  >
                    {rule.met ? (
                      <CheckCircleIcon
                        sx={{
                          fontSize: 18,
                          color: "#16a34a",
                          mt: "2px",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <WarningAmberIcon
                        sx={{
                          fontSize: 18,
                          color: "#f59e0b",
                          mt: "2px",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#172033",
                          fontWeight: rule.met ? 400 : 600,
                          wordBreak: "break-word",
                        }}
                      >
                        {rule.requirementText}
                      </Typography>

                      {(rule.requiredCount > 1 ||
                        rule.currentCount > 0) && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            color: rule.met
                              ? "#16a34a"
                              : "#94a3b8",
                          }}
                        >
                          {t("ruleProgress", {
                            current: rule.currentCount,
                            required: rule.requiredCount,
                          })}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
              },
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                {t("customer")}
              </Typography>

              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#172033",
                  mt: 0.25,
                }}
              >
                {order.customer?.companyName ?? `#${order.customerId}`}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                {t("createdAt")}
              </Typography>

              <Typography
                sx={{
                  fontWeight: 700,
                  color: "#172033",
                  mt: 0.25,
                }}
              >
                {new Date(order.createdAt).toLocaleDateString(locale)}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                {t("amount")}
              </Typography>

              <Typography
                sx={{
                  fontWeight: 800,
                  color: "#2563eb",
                  mt: 0.25,
                }}
              >
                {formatMoney(order.amount)}
              </Typography>
            </Box>

            <TextField
              select
              fullWidth
              size="small"
              label={t("changeStage")}
              value={stageKey}
              disabled={savingStage}
              onChange={(event) =>
                handleStageChange(event.target.value)
              }
              slotProps={{
                inputLabel: { shrink: true },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  bgcolor: "#ffffff",
                },
              }}
            >
              {stages.map((stage) => (
                <MenuItem
                  key={stage.stageId}
                  value={stage.stageKey}
                >
                  {stage.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography
              sx={{
                mb: 1,
                fontWeight: 700,
                fontSize: 14,
                color: "#172033",
              }}
            >
              {t("items")}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>
                    {t("product")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 800 }}
                  >
                    {t("quantity")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 800 }}
                  >
                    {t("unitPrice")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 800 }}
                  >
                    {t("lineTotal")}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography
                        variant="body2"
                        sx={{ color: "#94a3b8" }}
                      >
                        {t("items")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id ?? line.productId}>
                      <TableCell>
                        {line.product?.name ?? `#${line.productId}`}
                      </TableCell>
                      <TableCell align="right">
                        {line.quantity}
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(line.unitPrice)}
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(
                          line.quantity * line.unitPrice,
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          {/* ---- สรุปยอด: ส่วนลด / VAT / ยอดรวมสุทธิ ---- */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: "8px",
              bgcolor: "#eff6ff",
              border: "1px solid #dbeafe",
            }}
          >
            <SummaryRow
              label={t("subtotal")}
              value={formatMoney(subtotal)}
            />

            {discountPercent > 0 && (
              <SummaryRow
                label={t("discountAmount", {
                  percent: discountPercent,
                })}
                value={`-${formatMoney(discountAmount)}`}
                color="#dc2626"
              />
            )}

            {discountPercent > 0 && (
              <SummaryRow
                label={t("afterDiscount")}
                value={formatMoney(afterDiscount)}
              />
            )}

            {vatPercent > 0 && (
              <SummaryRow
                label={t("vatAmount", {
                  percent: vatPercent,
                })}
                value={`+${formatMoney(vatAmount)}`}
              />
            )}

            <SummaryRow
              divider
              bold
              label={t("total")}
              value={formatMoney(grandTotal)}
            />
          </Box>

          {/* ---- ไฟล์แนบ ---- */}
          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                rowGap: 1,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#172033",
                }}
              >
                {t("attachments")}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                {/*
                  ประเภทเอกสารของไฟล์ที่จะอัปโหลด
                  ค่าเริ่มต้นถูกเลือกจาก rule ที่ยังไม่ผ่าน (ถ้ามี)
                  เพื่อให้อัปโหลดเสร็จแล้วผ่าน rule ทันที
                */}
                <TextField
                  select
                  size="small"
                  label={t("docTypeLabel")}
                  value={uploadDocTypeId}
                  disabled={
                    uploading || deletingAttachment
                  }
                  onChange={(event) => {
                    const next = event.target.value;

                    setUploadDocTypeChoice({
                      targetKey,
                      value:
                        next === "" ? "" : Number(next),
                    });
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                  sx={{
                    minWidth: 170,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                    },
                  }}
                >
                  <MenuItem value="">
                    {t("docTypeNone")}
                  </MenuItem>

                  {docTypes.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.id}
                    >
                      {docTypeLabel(item.documentType)}
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  size="small"
                  startIcon={
                    <UploadFileIcon fontSize="small" />
                  }
                  disabled={
                    uploading || deletingAttachment
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  {uploading
                    ? t("uploading")
                    : t("addAttachment")}
                </Button>
              </Stack>
            </Stack>

            {/*
              input ซ่อนไว้แล้วเรียกด้วยปุ่มด้านบน
              accept ตรงกับชนิดไฟล์ที่ backend อนุญาต
            */}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx"
              onChange={(event) =>
                void handleUpload(event)
              }
            />

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
              {t("attachmentsHint")}
            </Typography>

            {!attachmentsLoading &&
              attachments.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: "#94a3b8" }}
                >
                  {t("noAttachments")}
                </Typography>
              )}

            {!attachmentsLoading &&
              attachments.length > 0 && (
                <Stack
                  spacing={0.75}
                  sx={{ mt: 1 }}
                >
                  {attachments.map((item) => (
                    <Box
                      key={item.attachmentId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: "8px",
                        border: "1px solid #e7ebf2",
                        bgcolor: "#fafcff",
                      }}
                    >
                      <AttachFileIcon
                        sx={{
                          fontSize: 16,
                          color: "#94a3b8",
                          flexShrink: 0,
                        }}
                      />

                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {/*
                          ชื่อไฟล์คลิกได้ -> เปิดดูไฟล์
                          ใช้ ButtonBase เพื่อให้กดด้วยคีย์บอร์ดได้ด้วย
                        */}
                        <ButtonBase
                          onClick={() =>
                            setPreviewAttachment(item)
                          }
                          sx={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            borderRadius: "4px",
                          }}
                        >
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontWeight: 700,
                              color: "#172033",
                              "&:hover": {
                                color: "#2563eb",
                              },
                            }}
                          >
                            {item.originalName}
                          </Typography>
                        </ButtonBase>

                        <Typography
                          variant="caption"
                          sx={{ color: "#94a3b8" }}
                        >
                          {formatFileSize(
                            item.sizeBytes,
                          )}{" "}
                          ·{" "}
                          {new Date(
                            item.createdAt,
                          ).toLocaleDateString(locale)}
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        aria-label={
                          t("previewAttachment")
                        }
                        onClick={() =>
                          setPreviewAttachment(item)
                        }
                        sx={{ color: "#64748b" }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        aria-label={
                          t("downloadAttachment")
                        }
                        onClick={() =>
                          void handleDownload(item)
                        }
                        sx={{ color: "#64748b" }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        aria-label={
                          t("deleteAttachment")
                        }
                        disabled={deletingAttachment}
                        onClick={() =>
                          setDeleteAttachment(item)
                        }
                        sx={{ color: "#dc2626" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}

            {deleteAttachment && (
              <Alert
                severity="warning"
                variant="outlined"
                sx={{ mt: 1 }}
                action={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Button
                      size="small"
                      disabled={deletingAttachment}
                      onClick={() =>
                        setDeleteAttachment(null)
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      {t("cancel")}
                    </Button>

                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      disabled={deletingAttachment}
                      onClick={() =>
                        void handleDeleteAttachment()
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                      }}
                    >
                      {deletingAttachment
                        ? t("deleting")
                        : t("delete")}
                    </Button>
                  </Stack>
                }
              >
                {t("deleteAttachmentConfirmMessage", {
                  name: deleteAttachment.originalName,
                })}
              </Alert>
            )}
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              {t("note")}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                color: order.note ? "#172033" : "#94a3b8",
              }}
            >
              {order.note || t("noNote")}
            </Typography>
          </Box>

          {confirmingDelete && (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Button
                    size="small"
                    onClick={() => setConfirmingDelete(false)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    {t("cancel")}
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    variant="contained"
                    disabled={deleting}
                    onClick={handleDelete}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    {deleting ? t("deleting") : t("delete")}
                  </Button>
                </Stack>
              }
            >
              {t("deleteConfirmMessage", { id: order.id })}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button
          startIcon={<DeleteIcon />}
          disabled={confirmingDelete || deleting}
          onClick={() => setConfirmingDelete(true)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            color: "#dc2626",
            mr: "auto",
          }}
        >
          {t("deleteOrder")}
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            px: 3,
            bgcolor: "#2563eb",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {t("closeAria")}
        </Button>
      </DialogActions>

      <FilePreviewDialog
        open={Boolean(previewAttachment)}
        title={previewAttachment?.originalName ?? ""}
        mimeType={previewAttachment?.mimeType}
        fileUrl={
          previewAttachment
            ? `/api/issue-orders/${order.id}/attachments/${previewAttachment.attachmentId}/file`
            : null
        }
        onDownload={() => {
          if (previewAttachment) {
            void handleDownload(previewAttachment);
          }
        }}
        onClose={() => setPreviewAttachment(null)}
      />

      <Snackbar
        open={Boolean(attachmentNotice)}
        autoHideDuration={3000}
        onClose={() => setAttachmentNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={attachmentNoticeType}
          variant="filled"
          onClose={() => setAttachmentNotice("")}
        >
          {attachmentNotice}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
