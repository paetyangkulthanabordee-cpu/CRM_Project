"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface SummaryRowProps {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;

  /*
   * divider = แสดงเส้นคั่นด้านบน (ใช้กับแถว Total)
   */
  divider?: boolean;
}

/*
 * แถวเดียวในกล่องสรุปยอด (ส่วนลด / VAT / ยอดรวมสุทธิ)
 * ใช้ร่วมกันระหว่างฟอร์มเพิ่มใบสั่งซื้อและหน้ารายละเอียด
 */
export default function SummaryRow({
  label,
  value,
  bold = false,
  color = "#1e3a8a",
  divider = false,
}: SummaryRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        py: 0.25,
        borderTop: divider
          ? "1px dashed #93c5fd"
          : "none",
        mt: divider ? 0.5 : 0,
      }}
    >
      <Typography
        sx={{
          fontWeight: bold ? 800 : 500,
          color,
          fontSize: bold ? 15 : 14,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          fontWeight: bold ? 800 : 600,
          color: bold ? "#2563eb" : color,
          fontSize: bold ? 16 : 14,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
