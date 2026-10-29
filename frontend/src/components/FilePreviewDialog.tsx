"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { api } from "@/lib/api";

interface Props {
  open: boolean;

  /* ชื่อไฟล์ที่แสดงบนหัว dialog */
  title: string;

  /* MIME type ของไฟล์บนเซิร์ฟเวอร์ (จาก metadata ของ attachment) */
  mimeType?: string;

  /*
   * endpoint ของไฟล์บนเซิร์ฟเวอร์
   * ดึงผ่าน axios เพราะต้องแนบ JWT (backend ไม่ได้เปิด uploads เป็น static สาธารณะ)
   */
  fileUrl?: string | null;

  /*
   * ไฟล์ในเครื่องที่ยังไม่ได้อัปโหลด (ตอนสร้างใบสั่งซื้อ)
   * ใช้ blob ตรง ๆ ได้เลย ไม่ต้องเรียก backend
   */
  localFile?: File | null;

  onDownload: () => void;
  onClose: () => void;
}

/* ผลการดึงไฟล์จาก API — key ใช้กันเอาค่าของไฟล์อื่นมาแสดง */
interface LoadedFile {
  key: string;
  blob: Blob | null;
  error: boolean;
}

/*
 * Dialog สำหรับเปิดดูไฟล์แนบในหน้า
 * - PDF แสดงด้วย <iframe>, รูปภาพแสดงด้วย <img>
 * - Excel/Word เบราว์เซอร์แสดงผลเองไม่ได้ -> แจ้งเตือนพร้อมปุ่มดาวน์โหลด
 *
 * ใช้ร่วมกันระหว่างหน้ารายละเอียดใบสั่งซื้อ (ไฟล์บนเซิร์ฟเวอร์)
 * กับฟอร์มสร้างใบสั่งซื้อ (ไฟล์ที่เพิ่งเลือกในเครื่อง)
 */
export default function FilePreviewDialog({
  open,
  title,
  mimeType,
  fileUrl,
  localFile,
  onDownload,
  onClose,
}: Props) {
  const t = useTranslations("orderPipeline");

  const [loaded, setLoaded] = useState<LoadedFile | null>(
    null,
  );

  /*
   * ไฟล์ในเครื่องผ่านการตรวจชนิดตั้งแต่ตอนเลือกไฟล์แล้ว
   * จึงใช้ file.type ตรง ๆ ได้ ส่วนไฟล์บนเซิร์ฟเวอร์ใช้ mimeType จาก metadata
   */
  const previewMime = localFile
    ? localFile.type
    : (mimeType ?? "");

  const previewable = isPreviewableMime(previewMime);
  const isPdf = previewMime === "application/pdf";
  const fileName = localFile ? localFile.name : title;

  /*
   * ดึงไฟล์จาก API เป็น blob (axios แนบ JWT ให้อัตโนมัติ)
   * โหลดเมื่อเปิด dialog และยังไม่เคยโหลดไฟล์นี้
   *
   * หมายเหตุ: ทุก setState อยู่ใน async callback หลัง await เสมอ
   * เพื่อไม่ให้กระทบ rule react-hooks/set-state-in-effect
   */
  useEffect(() => {
    if (!open || !previewable || localFile || !fileUrl) {
      return;
    }

    if (loaded?.key === fileUrl) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await api.get<Blob>(fileUrl, {
          responseType: "blob",
        });

        if (!cancelled) {
          setLoaded({
            key: fileUrl,
            blob: response.data,
            error: false,
          });
        }
      } catch {
        if (!cancelled) {
          setLoaded({
            key: fileUrl,
            blob: null,
            error: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, previewable, localFile, fileUrl, loaded]);

  /*
   * ค่าที่ใช้แสดงผลถูก derive จาก state แทนการเซ็ตค่าใน effect
   * กัน state ค้างของไฟล์ก่อนหน้าโผล่มาตอนสลับไฟล์/เปิด dialog ใหม่
   */
  const isCurrentFileLoaded =
    Boolean(fileUrl) && loaded?.key === fileUrl;

  const currentBlob = isCurrentFileLoaded
    ? loaded?.blob ?? null
    : null;

  const loadError = isCurrentFileLoaded
    ? loaded?.error ?? false
    : false;

  const loading =
    previewable &&
    !localFile &&
    Boolean(fileUrl) &&
    currentBlob === null &&
    !loadError;

  const previewKey = localFile
    ? `local-${localFile.name}-${localFile.size}`
    : (fileUrl ?? "none");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
        }}
      >
        <AttachFileIcon
          sx={{
            fontSize: 18,
            color: "#94a3b8",
            flexShrink: 0,
          }}
        />

        <Typography
          component="span"
          variant="subtitle1"
          noWrap
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 700,
            color: "#172033",
          }}
        >
          {fileName}
        </Typography>

        <IconButton
          size="small"
          aria-label={t("downloadAttachment")}
          onClick={onDownload}
          sx={{ color: "#64748b" }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          aria-label={t("closeAria")}
          onClick={onClose}
          sx={{ color: "#64748b" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          height: { xs: "55vh", sm: "65vh" },
          p: 0,
          display: "flex",
        }}
      >
        {/* เปิดดูไม่ได้ -> แจ้งเตือน + ปุ่มดาวน์โหลด */}
        {!previewable && (
          <Stack
            spacing={2}
            sx={{
              m: "auto",
              p: 3,
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#64748b" }}
            >
              {t("previewUnsupported")}
            </Typography>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onDownload}
              sx={primaryButtonSx}
            >
              {t("downloadAttachment")}
            </Button>
          </Stack>
        )}

        {loading && (
          <Stack
            spacing={1.5}
            sx={{
              m: "auto",
              alignItems: "center",
            }}
          >
            <CircularProgress size={28} />

            <Typography
              variant="body2"
              sx={{ color: "#94a3b8" }}
            >
              {t("previewLoading")}
            </Typography>
          </Stack>
        )}

        {previewable && loadError && (
          <Stack
            spacing={2}
            sx={{
              m: "auto",
              p: 3,
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "#dc2626" }}
            >
              {t("previewError")}
            </Typography>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onDownload}
              sx={primaryButtonSx}
            >
              {t("downloadAttachment")}
            </Button>
          </Stack>
        )}

        {previewable &&
          !loadError &&
          localFile && (
            <ObjectUrlPreview
              key={previewKey}
              blob={localFile}
              isPdf={isPdf}
              name={fileName}
            />
          )}

        {previewable &&
          !loadError &&
          !localFile &&
          currentBlob && (
            <ObjectUrlPreview
              key={previewKey}
              blob={currentBlob}
              isPdf={isPdf}
              name={fileName}
            />
          )}
      </DialogContent>
    </Dialog>
  );
}

interface ObjectUrlPreviewProps {
  blob: Blob;
  isPdf: boolean;
  name: string;
}

/*
 * แสดง blob ผ่าน object URL
 * สร้างตอน mount (lazy init ของ useState) และปล่อยทิ้งตอน unmount
 * -> ไม่ต้องสร้าง/เพิกถอน URL ใน effect จึงไม่ชน rule setState ใน effect
 */
function ObjectUrlPreview({
  blob,
  isPdf,
  name,
}: ObjectUrlPreviewProps) {
  const [url] = useState(() =>
    URL.createObjectURL(blob),
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  if (isPdf) {
    return (
      <iframe
        src={url}
        title={name}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={url}
      alt={name}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}

/*
 * เบราว์เซอร์แสดงผลเองได้เฉพาะ PDF กับรูปภาพ
 * ค่าอื่น (Excel/Word/ที่ไม่รู้จัก) -> ให้ดาวน์โหลดไปเปิดด้วยโปรแกรม
 */
function isPreviewableMime(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/")
  );
}

const primaryButtonSx = {
  textTransform: "none" as const,
  fontWeight: 700,
  bgcolor: "#2563eb",
  "&:hover": { bgcolor: "#1d4ed8" },
};
