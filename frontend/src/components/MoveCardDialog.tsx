"use client";

import { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/Close";

import { useTranslations } from "next-intl";

import type { Customer, PipelineStage } from "@/lib/types";

interface Props {
  open: boolean;
  customer: Customer | null;
  stages: PipelineStage[];
  onClose: () => void;
  onMove: (customerId: number, status: string) => void;
}

export default function MoveCardDialog({
  open,
  customer,
  stages,
  onClose,
  onMove,
}: Props) {
  const t = useTranslations("contactPipeline");

  const [targetStage, setTargetStage] = useState("");
  const [position, setPosition] = useState(1);

  const currentStageKey = customer?.status ?? "";

  const handleClose = () => {
    setTargetStage("");
    setPosition(1);
    onClose();
  };

  const handleMove = () => {
    if (!customer || !targetStage) return;
    onMove(customer.customerId, targetStage);
    handleClose();
  };

  const stageCustomers = stages.find(
    (s) => s.stageKey === targetStage,
  );
  const maxPosition = (stageCustomers?.customerCount ?? 0) + 1;
  const selectedStage = stages.find((s) => s.stageKey === targetStage);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3.5,
            pt: 3,
            pb: 2.5,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 20, color: "#0f172a" }}>
            {t("moveCard")}
          </Typography>
          <IconButton
            onClick={handleClose}
            aria-label={t("closeAria")}
            size="small"
            sx={{
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3.5, pt: 3, pb: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13,
            color: "#64748b",
            mb: 2.5,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {t("selectDestination")}
        </Typography>

        <Typography
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: 14,
            color: "#0f172a",
            mb: 1.25,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {t("stage")}
          {selectedStage && (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: 12,
                fontWeight: 600,
                color: selectedStage.color,
                bgcolor: `${selectedStage.color}15`,
                px: 1,
                py: 0.25,
                borderRadius: "6px",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: selectedStage.color,
                }}
              />
              {selectedStage.customerCount} cards
            </Box>
          )}
        </Typography>
        <Select
          fullWidth
          size="small"
          value={targetStage}
          onChange={(e) => {
            setTargetStage(e.target.value);
            setPosition(1);
          }}
          displayEmpty
          renderValue={(val) => {
            if (!val) {
              return (
                <Typography sx={{ color: "#94a3b8", fontWeight: 500 }}>
                  {t("selectStage")}
                </Typography>
              );
            }
            const stage = stages.find((s) => s.stageKey === val);
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "3px",
                    bgcolor: stage?.color,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>
                  {stage?.label ?? val}
                </Typography>
              </Box>
            );
          }}
          sx={{
            mb: 3,
            borderRadius: "12px",
            bgcolor: "#f8fafc",
            border: "1.5px solid #e2e8f0",
            transition: "all 200ms ease",
            "&:hover": { borderColor: "#c7d2fe", bgcolor: "#f8faff" },
            "& .MuiSelect-select": { py: 1.5 },
          }}
        >
          {stages.map((stage) => (
            <MenuItem
              key={stage.stageId}
              value={stage.stageKey}
              disabled={stage.stageKey === currentStageKey}
              sx={{
                fontSize: 14,
                fontWeight:
                  stage.stageKey === currentStageKey ? 600 : 500,
                color:
                  stage.stageKey === currentStageKey
                    ? "#94a3b8"
                    : "#334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.25,
                px: 2,
                "&.Mui-selected": {
                  bgcolor: "#eef2ff !important",
                },
                "&.Mui-disabled": {
                  opacity: 0.6,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "4px",
                    bgcolor: stage.color,
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px ${stage.color}20`,
                  }}
                />
                <Typography sx={{ fontWeight: 600 }}>
                  {stage.label}
                </Typography>
                {stage.stageKey === currentStageKey && (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#94a3b8",
                      bgcolor: "#f1f5f9",
                      px: 1,
                      py: 0.25,
                      borderRadius: "6px",
                    }}
                  >
                    {t("current")}
                  </Typography>
                )}
              </Box>
              <Typography
                component="span"
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: stage.stageKey === currentStageKey ? "#94a3b8" : "#64748b",
                  bgcolor: stage.stageKey === currentStageKey ? "#f1f5f9" : "#f8fafc",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "8px",
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {stage.customerCount}
              </Typography>
            </MenuItem>
          ))}
        </Select>

        {targetStage && (
          <>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 14,
                color: "#0f172a",
                mb: 1.25,
              }}
            >
              {t("position")}
              <Typography
                component="span"
                sx={{ fontWeight: 500, color: "#94a3b8", fontSize: 13 }}
              >
                {" "}
                ({maxPosition} {t("positions")})
              </Typography>
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mb: 1,
              }}
            >
              {Array.from({ length: maxPosition }, (_, i) => i + 1).map(
                (pos) => (
                  <Button
                    key={pos}
                    variant={position === pos ? "contained" : "outlined"}
                    onClick={() => setPosition(pos)}
                    sx={{
                      minWidth: 44,
                      py: 1,
                      px: 2,
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: 14,
                      textTransform: "none",
                      transition: "all 150ms ease",
                      ...(position === pos
                        ? {
                            bgcolor: selectedStage?.color ?? "#1d4ed8",
                            color: "#fff",
                            boxShadow: "none",
                            "&:hover": {
                              bgcolor: selectedStage?.color ?? "#1d4ed8",
                              boxShadow: `0 4px 12px ${selectedStage?.color ?? "#1d4ed8"}40`,
                            },
                          }
                        : {
                            borderColor: "#e2e8f0",
                            color: "#64748b",
                            "&:hover": {
                              borderColor: selectedStage?.color ?? "#c7d2fe",
                              bgcolor: `${selectedStage?.color ?? "#1d4ed8"}08`,
                            },
                          }),
                    }}
                  >
                    {pos}
                  </Button>
                ),
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3.5, pb: 3.5, pt: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={!targetStage}
          onClick={handleMove}
          sx={{
            py: 1.75,
            borderRadius: "12px",
            fontWeight: 800,
            fontSize: 15,
            textTransform: "none",
            bgcolor: "#1d4ed8",
            boxShadow: "0 4px 14px rgba(29,78,216,0.25)",
            transition: "all 200ms ease",
            "&:hover": {
              bgcolor: "#1e40af",
              boxShadow: "0 6px 20px rgba(29,78,216,0.35)",
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
            "&.Mui-disabled": {
              bgcolor: "#e2e8f0",
              color: "#94a3b8",
              boxShadow: "none",
            },
          }}
        >
          {t("move")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
