"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Box sx={{ width: "100%" }}>
      <FormControl
        size="small"
        sx={{ width: "100%" }}
      >
        <Select
          value={locale}
          onChange={(e) => switchLocale(e.target.value)}
          displayEmpty
          renderValue={(value) => {
            if (!value) return "—";
            return value === "en" ? t("english") : t("thai");
          }}
          sx={{
            width: "100%",
            bgcolor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 1,
            color: "#172033",
            fontSize: 14,
            fontWeight: 600,
            "& .MuiSelect-icon": {
              color: "#64748b",
              right: 8,
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#e5e7eb",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#94a3b8",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2563eb",
              borderWidth: 1,
            },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              py: 1,
              px: 1.5,
            },
            "& .MuiPopover-paper": {
              mt: 0.5,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
              borderRadius: 1,
              minWidth: 140,
            },
          }}
        >
          <MenuItem
            value="en"
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "#172033",
              "&:hover": { bgcolor: "#f6f8fb" },
              "&.Mui-selected": {
                bgcolor: "#eff6ff",
                "&:hover": { bgcolor: "#eff6ff" },
              },
            }}
          >
            {t("english")}
          </MenuItem>
          <MenuItem
            value="th"
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "#172033",
              "&:hover": { bgcolor: "#f6f8fb" },
              "&.Mui-selected": {
                bgcolor: "#eff6ff",
                "&:hover": { bgcolor: "#eff6ff" },
              },
            }}
          >
            {t("thai")}
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
