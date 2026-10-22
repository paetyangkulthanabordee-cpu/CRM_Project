"use client";

import { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { Customer, PipelineStage } from "@/lib/types";

import { useTranslations } from "next-intl";

/* =====================================================
   MOCK DATA (ยังไม่เชื่อม database)
   ====================================================== */

const MOCK_PRODUCTS = [
  { id: 1, name: "Product A" },
  { id: 2, name: "Product B" },
  { id: 3, name: "Product C" },
  { id: 4, name: "Product D" },
  { id: 5, name: "Product E" },
];

/* =====================================================
   COMPONENT
   ====================================================== */

export default function AddCardDialog({
  open,
  customers,
  stages,
  onClose,
  onSave,
}: {
  open: boolean;
  customers: Customer[];
  stages: PipelineStage[];
  onClose: () => void;
  onSave: (data: {
    customerId: number;
    productIds: number[];
    stageKey: string;
    note: string;
  }) => void;
}) {
  const t = useTranslations("salesPipeline");

  const [customerId, setCustomerId] = useState<number | "">("");
  const [productIds, setProductIds] = useState<number[]>([]);
  const [stageKey, setStageKey] = useState<string>("");
  const [note, setNote] = useState("");

  function handleSave() {
    if (!customerId || !stageKey) return;

    onSave({
      customerId: Number(customerId),
      productIds,
      stageKey,
      note,
    });

    // Reset form
    setCustomerId("");
    setProductIds([]);
    setStageKey("");
    setNote("");
  }

  function handleClose() {
    setCustomerId("");
    setProductIds([]);
    setStageKey("");
    setNote("");
    onClose();
  }

  function toggleProduct(id: number) {
    setProductIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          fontWeight: 800,
          fontSize: 18,
          color: "#172033",
          pb: 1,
        }}
      >
        {t("addNewCard")}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {/* Customer */}
          <FormControl fullWidth size="small">
            <InputLabel id="add-card-customer-label">
              {t("customer")}
            </InputLabel>
            <Select
              labelId="add-card-customer-label"
              label={t("customer")}
              value={customerId}
              onChange={(event) => {
                const value = String(
                  event.target.value,
                );

                setCustomerId(
                  value === "" ? "" : Number(value),
                );
              }}
              required
              sx={{
                borderRadius: "8px",
                bgcolor: "#ffffff",
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
            </Select>
          </FormControl>

          {/* Product (Checkbox) */}
          <Box>
            <Typography
              sx={{
                mb: 1,
                fontWeight: 600,
                fontSize: 14,
                color: "#172033",
              }}
            >
              {t("product")}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {MOCK_PRODUCTS.map((product) => (
                <FormControlLabel
                  key={product.id}
                  control={
                    <Checkbox
                      checked={productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      size="small"
                      sx={{
                        p: 0.25,
                        color: "#64748b",
                        "&.Mui-checked": {
                          color: "#2563eb",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      {product.name}
                    </Typography>
                  }
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    px: 1,
                    py: 0.25,
                    mr: 0,
                    mb: 0.5,
                    bgcolor: productIds.includes(product.id)
                      ? "#eff6ff"
                      : "#ffffff",
                    transition: "background 150ms ease",
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Stage */}
          <FormControl fullWidth size="small">
            <InputLabel id="add-card-stage-label">
              {t("stage")}
            </InputLabel>
            <Select
              labelId="add-card-stage-label"
              label={t("stage")}
              value={stageKey}
              onChange={(event) =>
                setStageKey(event.target.value)
              }
              required
              sx={{
                borderRadius: "8px",
                bgcolor: "#ffffff",
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
            </Select>
          </FormControl>

          {/* Note */}
          <TextField
            fullWidth
            size="small"
            label={t("note")}
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            multiline
            minRows={2}
            maxRows={4}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                bgcolor: "#ffffff",
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button
          onClick={handleClose}
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
          onClick={handleSave}
          disabled={!customerId || !stageKey}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
            px: 3,
            bgcolor: "#2563eb",
            "&:hover": {
              bgcolor: "#1d4ed8",
            },
            "&:disabled": {
              bgcolor: "#e2e8f0",
              color: "#94a3b8",
            },
          }}
        >
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
