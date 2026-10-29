"use client";

import { useRef, useState } from "react";

import type { ChangeEvent } from "react";

import { useTranslations } from "next-intl";

import AddIcon from "@mui/icons-material/Add";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { formatFileSize, formatMoney, round2 } from "@/lib/format";

import FilePreviewDialog from "@/components/FilePreviewDialog";
import SummaryRow from "@/components/SummaryRow";

import type {
  Customer,
  OrderPipelineStage,
  Product,
} from "@/lib/types";

/*
 * แบบฟอร์มยังคงเป็น string ไว้ระหว่างกรอก
 * เพื่อให้พิมพ์ทศนิยม/ค้างไว้ได้ แล้วค่อยแปลงเป็น number ตอนบันทึก
 */
interface FormLine {
  key: number;
  productId: number | "";
  quantity: string;
  unitPrice: string;
}

export interface NewIssueOrder {
  customerId: number;
  orderPipelineId: number;
  note: string;
  discountPercent: number;
  vatPercent: number;
  details: {
    productId: number;
    quantity: number;

    /*
     * ไม่ส่งราคาเมื่อผู้ใช้ไม่ได้กรอก
     * เพื่อให้ backend ใช้ราคาปัจจุบันของสินค้า
     */
    unitPrice?: number;
  }[];
}

interface Props {
  open: boolean;
  stages: OrderPipelineStage[];
  customers: Customer[];
  products: Product[];
  customersLoading?: boolean;
  productsLoading?: boolean;
  customersError?: boolean;
  productsError?: boolean;
  saving?: boolean;

  /*
   * files = ไฟล์แนบตั้งใจอัปโหลด
   * ส่งแยกจาก payload JSON เพราะ FormData กับ application/json
   * ยิงพร้อมกันไม่ได้ ฝั่งหน้าบอร์ดจะสร้างใบสั่งซื้อก่อนแล้วค่อยอัปโหลดทีละไฟล์
   */
  onSave: (
    payload: NewIssueOrder,
    files: File[],
  ) => Promise<void>;

  onClose: () => void;
}

/*
 * ชนิดไฟล์ที่อนุญาต — ต้องตรงกับ UPLOAD_ALLOWED_MIME_TYPES
 * ของ backend (IssueOrderAttachmentsService)
 */
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx";

let lineSequence = 0;

function emptyLine(): FormLine {
  lineSequence += 1;

  return {
    key: lineSequence,
    productId: "",
    quantity: "1",
    unitPrice: "",
  };
}

export default function OrderFormDialog({
  open,
  stages,
  customers,
  products,
  customersLoading = false,
  productsLoading = false,
  customersError = false,
  productsError = false,
  saving = false,
  onSave,
  onClose,
}: Props) {
  const t = useTranslations("orderPipeline");
  const tCommon = useTranslations("common");

  const [customerId, setCustomerId] = useState<
    number | ""
  >("");
  const [lines, setLines] = useState<FormLine[]>([
    emptyLine(),
  ]);
  const [note, setNote] = useState("");

  /*
   * ไฟล์แนบยังไม่ถูกอัปโหลดตอนเลือก
   * (ใบสั่งซื้อยังไม่มี id) แต่จะพกไว้ใน state
   * แล้วส่งให้หน้าบอร์ดอัปโหลดทันทีหลังสร้างใบสั่งสำเร็จ
   */
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  /* ไฟล์ที่กำลังเปิดดูก่อนอัปโหลด (null = ปิดอยู่) */
  const [previewFile, setPreviewFile] = useState<
    File | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
   * ส่วนลดและ VAT เก็บเป็น string ระหว่างกรอก เหมือน Qty/Unit price
   * เพื่อให้พิมพ์ทศนิยม/ค้างไว้ได้ แล้วค่อยแปลงเป็น number ตอนคำนวณ
   * ค่าเริ่มต้น: ส่วนลด 0% และ VAT 7%
   */
  const [discount, setDiscount] = useState("0");
  const [vat, setVat] = useState("7");

  const [submitted, setSubmitted] = useState(false);

  /*
   * เก็บเฉพาะตอนที่ผู้ใช้เลือกขั้นตอนเอง
   * ถ้ายังไม่ได้เลือกจะ fall ไปใช้ขั้นตอนแรกจาก DB
   * ทำแบบนี้จะไม่ต้องใช้ effect รอคอลัมน์โหลด
   */
  const [stageTouched, setStageTouched] = useState<
    number | null
  >(null);

  const stageId =
    stageTouched ?? stages[0]?.stageId ?? null;

  const discountPercent = Number(discount) || 0;
  const vatPercent = Number(vat) || 0;

  /*
   * ต้องกรอก 0-100 เท่านั้น ถ้ากรอกเกินจะกดบันทึกไม่ได้
   */
  const percentValid = (value: string): boolean => {
    const parsed = Number(value);

    return (
      value.trim() !== "" &&
      !Number.isNaN(parsed) &&
      parsed >= 0 &&
      parsed <= 100
    );
  };

  const discountValid = percentValid(discount);
  const vatValid = percentValid(vat);

  /*
   * ลำดับการคำนวณ:
   * Subtotal = ผลรวม (Qty × Unit Price)
   * Discount = Subtotal × Discount (%)
   * After Discount = Subtotal - Discount
   * VAT = After Discount × VAT (%)
   * Total = After Discount + VAT
   */
  const subtotal = round2(
    lines.reduce((sum, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;

      return sum + quantity * unitPrice;
    }, 0),
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

  function updateLine(
    key: number,
    patch: Partial<FormLine>,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    );
  }

  function selectProduct(
    key: number,
    productId: number | "",
  ) {
    const product = products.find(
      (item) => item.id === productId,
    );

    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) {
          return line;
        }

        return {
          ...line,
          productId,
          /*
           * เติมราคาปัจจุยของสินค้าให้เลย
           * แต่ไม่ทับค่าที่ผู้ใช้กรอกเองไว้แล้ว
           */
          unitPrice:
            line.unitPrice !== ""
              ? line.unitPrice
              : product
                ? String(product.price)
                : "",
        };
      }),
    );
  }

  /*
   * เช็คชนิดและขนาดไฟล์ฝั่ง client ก่อนบันทึก
   * กันไม่ให้ยิงขึ้น server แล้วค่อย fail (และได้ข้อความไทยทันที)
   */
  function handlePickFiles(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const picked = Array.from(
      event.target.files ?? [],
    );

    // รีเซ็ตค่าเพื่อให้เลือกไฟล์ชุดเดิมซ้ำได้
    event.target.value = "";

    setFileError("");

    for (const file of picked) {
      if (
        !ALLOWED_FILE_TYPES.includes(file.type)
      ) {
        setFileError(t("uploadInvalidType"));
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        setFileError(t("uploadTooLarge"));
        return;
      }

      if (file.size <= 0) {
        setFileError(t("uploadError"));
        return;
      }
    }

    if (picked.length === 0) {
      return;
    }

    setFiles((current) => [...current, ...picked]);
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, i) => i !== index),
    );
    setFileError("");
  }

  /*
   * ดาวน์โหลดไฟล์ที่ยังไม่ได้อัปโหลด (จากเครื่องผู้ใช้เอง)
   * ใช้ object URL ชั่วคราวแล้วปล่อยทันทีหลังคลิก
   */
  function downloadLocalFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const everyLineReady =
    lines.length > 0 &&
    lines.every(
      (line) =>
        line.productId !== "" &&
        Number(line.quantity) > 0 &&
        Number(line.unitPrice) >= 0,
    );

  const canSave =
    customerId !== "" &&
    stageId !== null &&
    everyLineReady &&
    discountValid &&
    vatValid &&
    !saving;

  async function handleSubmit() {
    setSubmitted(true);

    /*
     * canSave เช็คครบทั้งลูกค้า ขั้นตอน และรายการสินค้าแล้ว
     * TypeScript แคบชนิด customerId/stageId เป็น number ให้ผ่านตัวแปนี้ด้วย
     */
    if (!canSave) {
      return;
    }

    await onSave(
      {
        customerId,
        orderPipelineId: stageId,
        note: note.trim(),
        discountPercent,
        vatPercent,
        details: lines.map((line) => {
          const unitPrice = Number(line.unitPrice);

          return {
            productId: Number(line.productId),
            quantity: Number(line.quantity),

            /*
             * ไม่ส่งราคาเมื่อผู้ใช้ไม่ได้กรอก
             * เพื่อให้ backend ใช้ราคาปัจจุบันของสินค้า
             */
            ...(line.unitPrice !== "" &&
            !Number.isNaN(unitPrice)
              ? { unitPrice }
              : {}),
          };
        }),
      },
      files,
    );
  }

  const listError =
    customersError || productsError;
  const listLoading =
    customersLoading || productsLoading;

  return (
    <Dialog
      open={open}
      onClose={() => {
        /*
         * กำลังเปิดดูไฟล์อยู่ -> Escape/คลิกพื้นหลัง
         * ให้ปิดแค่ dialog ดูไฟล์ก่อน ไม่ปิดฟอร์มตาม
         */
        if (previewFile) {
          setPreviewFile(null);
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
        {t("addTitle")}

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
          {listError && (
            <Alert severity="error" variant="outlined">
              {t("loadError")}
            </Alert>
          )}

          <TextField
            select
            fullWidth
            size="small"
            label={t("customerLabel")}
            value={customerId}
            onChange={(event) =>
              setCustomerId(
                event.target.value === ""
                  ? ""
                  : Number(event.target.value),
              )
            }
            error={submitted && customerId === ""}
            helperText={
              submitted && customerId === ""
                ? t("selectCustomer")
                : ""
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
            {customers.map((customer) => (
              <MenuItem
                key={customer.customerId}
                value={customer.customerId}
              >
                {customer.companyName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            size="small"
            label={t("stageLabel")}
            value={stageId ?? ""}
            onChange={(event) =>
              setStageTouched(
                event.target.value === ""
                  ? null
                  : Number(event.target.value),
              )
            }
            error={submitted && stageId === null}
            helperText={
              submitted && stageId === null
                ? t("selectStage")
                : ""
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
                value={stage.stageId}
              >
                {stage.label}
              </MenuItem>
            ))}
          </TextField>

          {/* ---- รายการสินค้า ---- */}
          <Box>
            <Typography
              sx={{
                mb: 1,
                fontWeight: 700,
                fontSize: 14,
                color: "#172033",
              }}
            >
              {t("productsLabel")}
            </Typography>

            <Stack spacing={1.5}>
              {lines.map((line) => (
                <Box
                  key={line.key}
                  sx={{
                    p: 1.5,
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ alignItems: { sm: "center" } }}
                  >
                    <TextField
                      select
                      size="small"
                      label={t("product")}
                      value={line.productId}
                      onChange={(event) =>
                        selectProduct(
                          line.key,
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                        )
                      }
                      error={
                        submitted && line.productId === ""
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          bgcolor: "#ffffff",
                        },
                      }}
                    >
                      {products.map((product) => (
                        <MenuItem
                          key={product.id}
                          value={product.id}
                        >
                          {product.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      size="small"
                      type="number"
                      label={t("quantity")}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: event.target.value,
                        })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { min: 0, step: "any" },
                      }}
                      sx={{
                        width: { xs: "100%", sm: 110 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          bgcolor: "#ffffff",
                        },
                      }}
                    />

                    <TextField
                      size="small"
                      type="number"
                      label={t("unitPrice")}
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unitPrice: event.target.value,
                        })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { min: 0, step: "any" },
                      }}
                      sx={{
                        width: { xs: "100%", sm: 140 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "8px",
                          bgcolor: "#ffffff",
                        },
                      }}
                    />

                    <IconButton
                      size="small"
                      aria-label={t("removeLine")}
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((current) =>
                          current.filter(
                            (item) => item.key !== line.key,
                          ),
                        )
                      }
                      sx={{ color: "#94a3b8" }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setLines((current) => [
                  ...current,
                  emptyLine(),
                ])
              }
              sx={{
                mt: 1,
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              {t("addLine")}
            </Button>

            {submitted && !everyLineReady && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.5,
                  color: "#dc2626",
                }}
              >
                {t("lineRequired")}
              </Typography>
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <TextField
                size="small"
                type="number"
                label={t("discountPercent")}
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
                error={submitted && !discountValid}
                helperText={
                  submitted && !discountValid
                    ? t("percentRange")
                    : ""
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: 0, max: 100, step: "any" },
                }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "#ffffff",
                  },
                }}
              />

              <TextField
                size="small"
                type="number"
                label={t("vatPercent")}
                value={vat}
                onChange={(event) =>
                  setVat(event.target.value)
                }
                error={submitted && !vatValid}
                helperText={
                  submitted && !vatValid
                    ? t("percentRange")
                    : ""
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: 0, max: 100, step: "any" },
                }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "#ffffff",
                  },
                }}
              />
            </Stack>

            <SummaryRow
              label={t("subtotal")}
              value={formatMoney(subtotal)}
            />

            <SummaryRow
              label={t("discountAmount", {
                percent: discountPercent,
              })}
              value={`-${formatMoney(discountAmount)}`}
              color="#dc2626"
            />

            <SummaryRow
              label={t("afterDiscount")}
              value={formatMoney(afterDiscount)}
            />

            <SummaryRow
              label={t("vatAmount", {
                percent: vatPercent,
              })}
              value={`+${formatMoney(vatAmount)}`}
            />

            <SummaryRow
              divider
              bold
              label={t("total")}
              value={formatMoney(grandTotal)}
            />
          </Box>

          {/* ---- ไฟล์แนบ (อัปโหลดทันทีหลังสร้างใบสั่งซื้อ) ---- */}
          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
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

              <Button
                size="small"
                startIcon={
                  <AttachFileIcon fontSize="small" />
                }
                disabled={saving}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {t("selectFiles")}
              </Button>
            </Stack>

            {/*
              input ซ่อนไว้แล้วเรียกด้วยปุ่มด้านบน
              accept ตรงกับชนิดไฟล์ที่ backend อนุญาต
            */}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept={FILE_ACCEPT}
              onChange={handlePickFiles}
            />

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
              {t("attachmentsOptionalHint")}
            </Typography>

            {fileError && (
              <Alert
                severity="error"
                sx={{ mt: 1 }}
              >
                {fileError}
              </Alert>
            )}

            {files.length > 0 && (
              <Stack
                spacing={0.75}
                sx={{ mt: 1 }}
              >
                {files.map((file, index) => (
                  <Box
                    key={`${file.name}-${index}`}
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
                        ชื่อไฟล์คลิกได้ -> เปิดดูไฟล์ก่อนอัปโหลด
                        ใช้ ButtonBase เพื่อให้กดด้วยคีย์บอร์ดได้ด้วย
                      */}
                      <ButtonBase
                        onClick={() =>
                          setPreviewFile(file)
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
                          {file.name}
                        </Typography>
                      </ButtonBase>

                      <Typography
                        variant="caption"
                        sx={{ color: "#94a3b8" }}
                      >
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      aria-label={
                        t("previewAttachment")
                      }
                      disabled={saving}
                      onClick={() =>
                        setPreviewFile(file)
                      }
                      sx={{ color: "#64748b" }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      aria-label={t("removeFile")}
                      disabled={saving}
                      onClick={() =>
                        removeFile(index)
                      }
                      sx={{ color: "#dc2626" }}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <TextField
            fullWidth
            size="small"
            label={t("noteLabel")}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "#ffffff",
              },
            }}
          />

          {listLoading && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center" }}
            >
              <CircularProgress size={16} />
              <Typography
                variant="body2"
                sx={{ color: "#64748b" }}
              >
                {tCommon("loading")}
              </Typography>
            </Stack>
          )}

          {customers.length === 0 &&
            !customersLoading && (
              <Typography
                variant="body2"
                sx={{ color: "#94a3b8" }}
              >
                {t("noCustomers")} — {t("noCustomersHint")}
              </Typography>
            )}

          {products.length === 0 && !productsLoading && (
            <Typography
              variant="body2"
              sx={{ color: "#94a3b8" }}
            >
              {t("noProducts")} — {t("noProductsHint")}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          {t("cancel")}
        </Button>

        <Button
          variant="contained"
          disabled={!canSave}
          onClick={handleSubmit}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            px: 3,
            bgcolor: "#2563eb",
            "&:hover": { bgcolor: "#1d4ed8" },
            "&:disabled": {
              bgcolor: "#e2e8f0",
              color: "#94a3b8",
            },
          }}
        >
          {t("save")}
        </Button>
      </DialogActions>

      <FilePreviewDialog
        open={Boolean(previewFile)}
        title={previewFile?.name ?? ""}
        mimeType={previewFile?.type}
        localFile={previewFile}
        onDownload={() => {
          if (previewFile) {
            downloadLocalFile(previewFile);
          }
        }}
        onClose={() => setPreviewFile(null)}
      />
    </Dialog>
  );
}
