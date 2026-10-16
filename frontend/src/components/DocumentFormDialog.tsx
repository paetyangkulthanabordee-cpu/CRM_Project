"use client";

import type { FormEvent } from "react";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";

import { useTranslations } from "next-intl";

import {
  DOC_STATUS_LABELS,
  DOC_TYPE_LABELS,
  DOC_TYPE_LABELS_TH,
  DOCUMENT_STATUSES,
  DOC_TYPES,
  REF_TYPE,
} from "@/lib/types";

import type { Customer, DocType, DocumentItem } from "@/lib/types";

export interface DocumentForm {
  docType: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  status: string;
  refDocId: string;
  note: string;
}

interface Props {
  open: boolean;
  editing: DocumentItem | null;
  form: DocumentForm;
  customers: Customer[];
  refOptions: DocumentItem[];
  formError: string;
  saving: boolean;
  onClose: () => void;
  onFormChange: (updates: Partial<DocumentForm>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

export default function DocumentFormDialog({
  open,
  editing,
  form,
  customers,
  refOptions,
  formError,
  saving,
  onClose,
  onFormChange,
  onSubmit,
}: Props) {
  const t = useTranslations("documents");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 20px 60px -12px rgba(0,0,0,0.15)",
          },
        },
      }}
    >
      <form onSubmit={onSubmit}>
        <DialogTitle sx={{ fontWeight: 800, px: 3, pt: 3, pb: 2 }}>
          {editing
            ? t("editDocument", { docNo: editing.docNo })
            : t("createDocument")}
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
              width: 0,
              height: 0,
            },
          }}
        >
          <Stack spacing={0} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <SectionHeader label={t("docType")} />
            <Stack spacing={2}>
              <TextField
                fullWidth
                select
                label={t("docType")}
                value={form.docType}
                onChange={(event) =>
                  onFormChange({ docType: event.target.value })
                }
                disabled={saving || Boolean(editing)}
                helperText={editing ? t("cannotChangeType") : undefined}
              >
                {DOC_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {DOC_TYPE_LABELS_TH[type]} ({DOC_TYPE_LABELS[type]})
                  </MenuItem>
                ))}
              </TextField>

              <Autocomplete
                fullWidth
                options={customers}
                value={
                  customers.find(
                    (c) => String(c.customerId) === form.customerId,
                  ) ?? null
                }
                onChange={(_, value) =>
                  onFormChange({
                    customerId: value ? String(value.customerId) : "",
                  })
                }
                getOptionLabel={(option) => option.companyName}
                isOptionEqualToValue={(option, val) =>
                  String(option.customerId) === String(val?.customerId ?? "")
                }
                disabled={saving}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("customerLabel")}
                    placeholder={t("selectCustomer")}
                    required
                  />
                )}
                renderOption={(props, customer) => {
                  const { key: _optionKey, ...optionProps } = props;
                  return (
                    <li key={customer.customerId} {...optionProps}>
                      <div>{customer.companyName}</div>
                      {customer.email && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "rgba(0,0,0,0.54)",
                          }}
                        >
                          {customer.email}
                        </div>
                      )}
                    </li>
                  );
                }}
                noOptionsText={t("noCustomers")}
              />
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <SectionHeader label={t("date")} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                fullWidth
                label={t("issueDate")}
                type="date"
                value={form.issueDate}
                onChange={(event) =>
                  onFormChange({ issueDate: event.target.value })
                }
                disabled={saving}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />

              {form.docType === "invoice" && (
                <TextField
                  fullWidth
                  label={t("dueDate")}
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    onFormChange({ dueDate: event.target.value })
                  }
                  disabled={saving}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <SectionHeader label={t("amountLabel")} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <TextField
                fullWidth
                label={t("amountLabel")}
                type="number"
                value={form.amount}
                onChange={(event) =>
                  onFormChange({ amount: event.target.value })
                }
                disabled={saving}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                required
              />

              <TextField
                fullWidth
                select
                label={t("statusLabel")}
                value={form.status}
                onChange={(event) =>
                  onFormChange({ status: event.target.value })
                }
                disabled={saving}
                required
              >
                {(
                  DOCUMENT_STATUSES[form.docType as DocType] ?? []
                ).map((status) => (
                  <MenuItem key={status} value={status}>
                    {DOC_STATUS_LABELS[status] ?? status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {!editing && REF_TYPE[form.docType as DocType] && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <SectionHeader
                  label={t("referenceDoc", {
                    type: DOC_TYPE_LABELS[
                      REF_TYPE[form.docType as DocType] as DocType
                    ],
                  })}
                />
                <TextField
                  fullWidth
                  select
                  value={form.refDocId || "none"}
                  onChange={(event) =>
                    onFormChange({
                      refDocId:
                        event.target.value === "none"
                          ? ""
                          : event.target.value,
                    })
                  }
                  disabled={saving}
                  helperText={t("referenceHint")}
                >
                  <MenuItem value="none">
                    <em>{t("noReference")}</em>
                  </MenuItem>
                  {refOptions.map((doc) => (
                    <MenuItem key={doc.docId} value={String(doc.docId)}>
                      {doc.docNo} · {doc.customerName ?? "-"} ·{" "}
                      {formatBaht(doc.amount)}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <Divider sx={{ my: 2.5 }} />
            <SectionHeader label={t("note")} />
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={form.note}
              onChange={(event) =>
                onFormChange({ note: event.target.value })
              }
              disabled={saving}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ textTransform: "none", px: 2 }}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            sx={{ textTransform: "none", px: 3 }}
          >
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : editing ? (
              t("save")
            ) : (
              t("createDoc")
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Typography
      variant="subtitle2"
      color="text.secondary"
      sx={{ fontWeight: 600, mb: 1 }}
    >
      {label}
    </Typography>
  );
}
