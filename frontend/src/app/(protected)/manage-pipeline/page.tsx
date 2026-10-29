"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";

import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import PipelineColumnsManager from "@/components/PipelineColumnsManager";

import { useStoredPreference } from "@/lib/useStoredPreference";

import { useSession } from "@/lib/useSession";

const PIPELINE_TABS = ["contact", "order"] as const;

type PipelineTab = (typeof PIPELINE_TABS)[number];

const TAB_STORAGE_KEY = "manage-pipeline-tab";

export default function ManagePipelinePage() {
  const t = useTranslations("managePipeline");
  const router = useRouter();
  const { user, ready } = useSession();

  /*
   * จำ tab ที่เลือกไว้ข้ามการเปิดหน้าใหม่
   * (ใช้กลไกเดียวกับ view switch ของหน้า customers)
   */
  const [tab, setTab] = useStoredPreference<PipelineTab>(
    TAB_STORAGE_KEY,
    "contact",
    PIPELINE_TABS,
  );

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f6f8fb",
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          maxHeight: "100vh",
          p: { xs: 2, md: 4 },
        }}
      >
        {/* HEADER */}
        <Box sx={{ mb: 3 }}>
          <Typography
            component="div"
            variant="overline"
            sx={{
              color: "#2563eb",
              fontWeight: 800,
              letterSpacing: 1.2,
            }}
          >
            {t("administration")}
          </Typography>

          <Typography
            component="h1"
            variant="h4"
            sx={{
              mt: 0.5,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            {t("title")}
          </Typography>

          <Typography
            component="div"
            variant="body2"
            sx={{ mt: 0.5, color: "#64748b" }}
          >
            {t("subtitle")}
          </Typography>
        </Box>

        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: "12px",
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_event, next: PipelineTab) => setTab(next)}
            variant="scrollable"
            scrollButtons={false}
            allowScrollButtonsMobile
            aria-label={t("tabsAria")}
            sx={{
              px: { xs: 1, sm: 1.5 },
              minHeight: 48,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: 14,
                minHeight: 48,
                py: 0,
                px: 2,
                color: "#64748b",
                transition: "color 0.15s ease",
                "&:hover": {
                  color: "#0f172a",
                },
                "&.Mui-selected": {
                  color: "#2563eb",
                },
              },
            }}
          >
            <Tab value="contact" label={t("tabContact")} />
            <Tab value="order" label={t("tabOrder")} />
          </Tabs>
        </Card>

        <PipelineColumnsManager pipeline={tab} />
      </Box>
    </Box>
  );
}
