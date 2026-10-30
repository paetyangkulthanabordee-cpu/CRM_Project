"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChangeEvent, DragEvent } from "react";

import { useLocale, useTranslations } from "next-intl";

import { isAxiosError } from "axios";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
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

import FilePreviewDialog from "@/components/FilePreviewDialog";
import SummaryRow from "@/components/SummaryRow";

import type {
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
   * พอผ่านครบทุกข้อ ระบบจะย้ายขั้นตอนให้อัตโนมัติ
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
     หมายเหตุ: แก้ไข/บันทึกได้ในฟอร์มเลย
     (PATCH /api/issue-orders/:id — ใช้ตอน rule
      "ต้องกรอกหมายเหตุ" บล็อกการย้ายขั้นตอนด้วย)
  ===================================================== */

  /* savedNote = ค่าล่าสุดที่บันทึกแล้ว (ใช้เทียบว่า draft เปลี่ยนไหม) */
  const [savedNote, setSavedNote] = useState(
    order.note ?? "",
  );
  const [noteDraft, setNoteDraft] = useState(
    order.note ?? "",
  );
  const [savingNote, setSavingNote] = useState(false);

  /* =====================================================
     ไฟล์แนบ (ใช้ตอนตรวจ Workflow Rule "ต้องแนบไฟล์")
  ===================================================== */

  const [attachments, setAttachments] = useState<
    IssueOrderAttachment[]
  >([]);
  const [attachmentsLoading, setAttachmentsLoading] =
    useState(true);
  const [uploading, setUploading] = useState(false);

  /* สถานะไฟล์ลอยอยู่เหนือ dropzone (เปลี่ยนสีขอบ/พื้น) */
  const [draggingOver, setDraggingOver] = useState(false);
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
     แยก rule ตามชนิด + ค่าที่ระบบช่วยใส่ให้ตอนอัปโหลด
  ===================================================== */

  /*
   * ประเภทเอกสารที่ rule ที่ยังไม่ผ่านเรียกร้อง (ถ้ามี)
   * ระบบใส่ให้อัตโนมัติตอนอัปโหลดไฟล์ — ไม่มี UI ให้เลือกแล้ว
   * เพื่อให้ rule ชนิด document/payment ตรวจพบไฟล์นี้
   */
  const autoDocumentTypeId =
    ruleChecks.find(
      (item) => !item.met && item.documentTypeId !== null,
    )?.documentTypeId ?? null;

  /* ทุกข้อผ่านแล้ว -> effect ข้างล่างจะย้ายขั้นตอนให้อัตโนมัติ */
  const rulesAllMet = ruleChecks.every((item) => item.met);

  /*
   * rule ที่ไม่ผูกกับ field ใด ๆ (ชนิดแนบไฟล์ ทั้งหมด
   * รวมชนิด field ที่ไม่รู้ตำแหน่ง กันข้อความหาย)
   * -> แสดง inline ในส่วน "ไฟล์แนบ"
   */
  const attachmentInlineRules = ruleChecks.filter(
    (item) =>
      item.conditionType !== "field" ||
      !["note", "details", "amount"].includes(
        item.fieldKey ?? "",
      ),
  );

  /*
   * mark ที่ตัวกล่อง dropzone: เปลี่ยน "สีเส้นปะ" เท่านั้น
   * แดงเมื่อ rule กลุ่มไฟล์ยังไม่ผ่าน (rule ชนิด field ไม่เกี่ยวกับไฟล์
   * -> ไม่ทำให้กล่องแดง), เขียวเมื่อผ่านครบ, น้ำเงินตอนลากไฟล์มาวาง
   * พื้นหลัง/ไอคอน/ข้อความ ไม่เปลี่ยนสีตาม
   */
  const dropzoneError =
    activePendingMove !== null &&
    attachmentInlineRules.some((item) => !item.met);

  const dropzoneSuccess =
    activePendingMove !== null && rulesAllMet;

  const dropzoneBorder = draggingOver
    ? "#2563eb"
    : dropzoneError
      ? "#dc2626"
      : dropzoneSuccess
        ? "#16a34a"
        : "#cbd5e1";

  /* rule ชนิด field -> ใต้ field ที่เกี่ยวข้อง (note/details/amount) */
  function fieldRule(key: string) {
    if (!activePendingMove) {
      return null;
    }

    return (
      ruleChecks.find(
        (item) =>
          item.conditionType === "field" &&
          item.fieldKey === key,
      ) ?? null
    );
  }

  /*
   * แถว rule หนึ่งข้อ: ไอคอน ✅/⚠ + ข้อความ
   * แดงเมื่อยังไม่ผ่าน / เขียวเมื่อผ่าน
   * ไม่มีกรอบ ไม่มีพื้นหลัง — ตามแนว inline form error
   */
  function renderRuleLine(rule: WorkflowRuleCheck) {
    return (
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          alignItems: "flex-start",
        }}
      >
        {rule.met ? (
          <CheckCircleIcon
            sx={{
              fontSize: 16,
              color: "#16a34a",
              mt: "2px",
              flexShrink: 0,
            }}
          />
        ) : (
          <WarningAmberIcon
            sx={{
              fontSize: 16,
              color: "#dc2626",
              mt: "2px",
              flexShrink: 0,
            }}
          />
        )}

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: rule.met ? "#16a34a" : "#dc2626",
              fontWeight: rule.met ? 400 : 600,
              lineHeight: 1.5,
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
                color: rule.met ? "#16a34a" : "#94a3b8",
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
    );
  }

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

  async function uploadFile(file: File) {
    setUploading(true);
    setAttachmentNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      /*
       * ประเภทเอกสารที่ rule ที่ยังไม่ผ่านเรียกร้อง
       * -> ระบบใส่ให้เองเงียบ ๆ (ไม่มี UI ให้เลือกแล้ว)
       * ถ้าไม่มี rule ค้างอยู่จะไม่ส่ง -> เป็นไฟล์แนบประเภททั่วไป
       */
      if (autoDocumentTypeId !== null) {
        formData.append(
          "documentTypeId",
          String(autoDocumentTypeId),
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
       * ให้แถบ mark เปลี่ยนเป็น ✅ และเมื่อผ่านครบ
       * ระบบจะย้ายขั้นตอนให้อัตโนมัติเอง
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

  /* เลือกไฟล์จาก input ที่ซ่อนอยู่ -> ใช้ logic อัปโหลดเดียวกับการลากวาง */
  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    // รีเซ็ตค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้หลังอัปโหลด
    event.target.value = "";

    if (!file) {
      return;
    }

    await uploadFile(file);
  }

  /* วางไฟล์ลงบน dropzone -> อัปโหลดทันที */
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingOver(false);

    if (uploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    void uploadFile(file);
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

  /*
   * บันทึกขั้นตอนใหม่ — ใช้ทั้งตอนผู้ใช้เลือกจาก dropdown
   * และตอนระบบย้ายขั้นตอนให้อัตโนมัติเมื่อผ่าน rule ครบ
   * คืนค่า true เมื่อบันทึกสำเร็จ (ให้ฝั่งย้ายอัตโนมัติใช้ปิดฟอร์ม)
   */
  const handleStageChange = useCallback(
    async (nextStageKey: string): Promise<boolean> => {
      if (!nextStageKey || nextStageKey === stageKey) {
        return false;
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

      return saved;
    },
    [
      stageKey,
      onStageChange,
      order.id,
      order.orderPipeline?.stageKey,
      reloadRuleChecks,
    ],
  );

  /*
   * ย้ายขั้นตอนอัตโนมัติ: พอผ่าน Workflow Rule ครบทุกข้อ
   * ให้ย้ายให้เลยแทนที่จะมีแถบแจ้ง/ปุ่มยืนยันให้กด
   * แล้วย้ายสำเร็จ -> ปิดฟอร์มรายละเอียดให้เองด้วย
   *
   * autoMovedKeyRef กันย้ำยิง: เก็บรหัส "ใบสั่งซื้อ:ขั้นตอนเป้าหมาย"
   * ที่เพิ่งย้ายไปแล้ว 1 ครั้ง — จะยิงอีกได้ก็ต่อเมื่อกฎเปลี่ยน
   * จากยังไม่ผ่าน -> ผ่าน (ref ถูกล้างในตอนที่ rulesAllMet เป็น false)
   * เช่น ย้ายไม่สำเร็จแล้วserverคืนกฎที่ยังขาดอยู่ใหม่
   *
   * ถ้าตอนย้ายสำเร็จมี preview ไฟล์/กล่องยืนยันลบไฟล์เปิดอยู่
   * ให้ข้ามการปิด (ขั้นตอนย้ายไปแล้ว ผู้ใช้กดปิดเอง) จะได้ไม่ดึงหน้าต่าง
   * ที่กำลังเปิดดูอยู่ให้ปิดหายไปด้วย
   */
  const autoMovedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activePendingMove || ruleChecks.length === 0) {
      return;
    }

    if (!rulesAllMet) {
      autoMovedKeyRef.current = null;
      return;
    }

    if (autoMovedKeyRef.current === targetKey) {
      return;
    }

    autoMovedKeyRef.current = targetKey;

    void handleStageChange(
      activePendingMove.toStageKey,
    ).then((saved) => {
      if (saved && !previewAttachment && !deleteAttachment) {
        onClose();
      }
    });
  }, [
    activePendingMove,
    ruleChecks.length,
    rulesAllMet,
    targetKey,
    handleStageChange,
    previewAttachment,
    deleteAttachment,
    onClose,
  ]);

  /*
   * บันทึกหมายเหตุ — backend รับ PATCH {note} อยู่แล้ว
   * สำเร็จ -> ปรับค่าอ้างอิง แจ้งบอร์ด refresh
   * แล้วเช็ก rule ใหม่ (rule "ต้องกรอกหมายเหตุ" อาจผ่านทันที)
   */
  async function handleSaveNote() {
    const next = noteDraft.trim();

    setSavingNote(true);

    try {
      await api.patch(`/api/issue-orders/${order.id}`, {
        note: next,
      });

      setSavedNote(next);
      setNoteDraft(next);

      setAttachmentNotice(t("noteSaved"));
      setAttachmentNoticeType("success");

      // หน้าบอร์ด reload -> การ์ดก็แสดง note ล่าสุดด้วย
      onAttachmentsChange?.();

      await reloadRuleChecks();
    } catch (err) {
      setAttachmentNotice(
        getErrorMessage(err, t("noteSaveError")),
      );
      setAttachmentNoticeType("error");
    } finally {
      setSavingNote(false);
    }
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

  /*
   * rule ชนิด field ที่ต้องวาง inline ใต้ field ของตัวเอง
   * null = ไม่มี rule ชนิดนี้ หรือไม่ได้อยู่ในสถานะถูกบล็อก
   */
  const noteRule = fieldRule("note");
  const detailsRule = fieldRule("details");
  const amountRule = fieldRule("amount");

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

            {/* inline rule: ต้องกรอก "รายการสินค้า" */}
            {detailsRule && (
              <Box sx={{ mt: 1 }}>
                {renderRuleLine(detailsRule)}
              </Box>
            )}
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

          {/* inline rule: ต้องกรอก "ยอดเงิน" */}
          {amountRule && (
            <Box>{renderRuleLine(amountRule)}</Box>
          )}

          {/* ---- ไฟล์แนบ ---- */}
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: "#172033",
              }}
            >
              {t("attachments")}
            </Typography>

            {/*
              dropzone: ลากวางหรือคลิก "เลือกไฟล์"
              ทุกทางผ่าน uploadFile() เดียวกัน
              (ได้ documentTypeId อัตโนมัติเมื่อมี rule ค้างอยู่)
            */}
            <Box
              role="button"
              tabIndex={
                uploading || deletingAttachment ? -1 : 0
              }
              aria-label={t("chooseFile")}
              onClick={() => {
                if (!uploading && !deletingAttachment) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" ||
                    event.key === " ") &&
                  !uploading &&
                  !deletingAttachment
                ) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();

                if (!uploading) {
                  setDraggingOver(true);
                }
              }}
              onDragLeave={() => setDraggingOver(false)}
              onDrop={handleDrop}
              sx={{
                mt: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                py: 3,
                px: 2,
                borderRadius: "10px",
                border: "1px dashed",
                borderColor: dropzoneBorder,
                bgcolor: "#fafcff",
                cursor: uploading ? "default" : "pointer",
                outline: "none",
                transition: "border-color 120ms ease",
                "&:hover": uploading
                  ? undefined
                  : { borderColor: "#2563eb" },
                "&:focus-visible": {
                  borderColor: "#2563eb",
                  boxShadow:
                    "0 0 0 3px rgba(37,99,235,0.15)",
                },
              }}
            >
              {uploading ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <CircularProgress size={16} />

                  <Typography
                    variant="body2"
                    sx={{
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {t("uploading")}
                  </Typography>
                </Stack>
              ) : (
                <>
                  <CloudUploadIcon
                    sx={{
                      fontSize: 34,
                      color: "#94a3b8",
                    }}
                  />

                  <Typography
                    variant="body2"
                    sx={{ color: "#64748b" }}
                  >
                    {t("dropzoneHint")}{" "}
                    <Box
                      component="span"
                      sx={{
                        color: "#2563eb",
                        fontWeight: 700,
                        textDecoration: "underline",
                        "&:hover": { color: "#1d4ed8" },
                      }}
                    >
                      {t("chooseFile")}
                    </Box>
                  </Typography>
                </>
              )}
            </Box>

            {/*
              input ซ่อนไว้ — เรียกด้วยการคลิกกล่อง/"เลือกไฟล์" ด้านบน
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

            {/*
              inline error (ไม่มีกรอบ ไม่มีพื้นหลัง):
              สาเหตุที่ย้ายขั้นตอนไม่ได้ + สิ่งที่ต้องแนบ
              แสดงแทน captionปกติเฉพาะตอนถูก Workflow Rule บล็อก
              (เมื่อผ่านครบแล้วระบบย้ายขั้นตอนให้อัตโนมัติ
               จึงไม่มีแถบแจ้ง/ปุ่มยืนยันตรงนี้อีก)
            */}
            {activePendingMove &&
            attachmentInlineRules.length > 0 ? (
              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                {attachmentInlineRules.map((rule) => (
                  <Box key={rule.ruleId}>
                    {renderRuleLine(rule)}
                  </Box>
                ))}
              </Stack>
            ) : (
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
            )}

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

            {/*
              แก้ไขได้ในฟอร์มเลย — ใช้ตอน rule "ต้องกรอกหมายเหตุ"
              บล็อกการย้ายขั้นตอนด้วย (พิมพ์แล้วกดบันทึก -> rule ผ่าน)
            */}
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              value={noteDraft}
              placeholder={t("noNote")}
              disabled={savingNote}
              onChange={(event) =>
                setNoteDraft(event.target.value)
              }
              sx={{
                mt: 0.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  bgcolor: "#ffffff",
                },
              }}
            />

            {noteDraft !== savedNote && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, alignItems: "center" }}
              >
                <Button
                  size="small"
                  variant="contained"
                  disabled={savingNote}
                  onClick={() => void handleSaveNote()}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    bgcolor: "#2563eb",
                    "&:hover": { bgcolor: "#1d4ed8" },
                  }}
                >
                  {savingNote
                    ? t("savingNote")
                    : t("saveNote")}
                </Button>

                <Button
                  size="small"
                  disabled={savingNote}
                  onClick={() => setNoteDraft(savedNote)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  {t("cancel")}
                </Button>
              </Stack>
            )}

            {/* inline rule: ต้องกรอก "หมายเหตุ" */}
            {noteRule && (
              <Box sx={{ mt: 1 }}>
                {renderRuleLine(noteRule)}
              </Box>
            )}
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
