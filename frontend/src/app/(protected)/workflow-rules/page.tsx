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

import AgingRulesTab from "./AgingRulesTab";
import MoveRulesTab from "./MoveRulesTab";

import { useStoredPreference } from "@/lib/useStoredPreference";
import { useSession } from "@/lib/useSession";

/*
 * หน้า Administration -> Workflow Rules ถูกแบ่งเป็น 2 แท็บ
 * - move : Workflow Rules เดิม (เงื่อนไขต้องผ่านก่อนย้ายการ์ด)
 * - aging: Time-based Workflow Rules (เปลี่ยนสีการ์ดเมื่อไม่มี activity)
 *
 * pattern ของ tabs ย้ายมาจากหน้า manage-pipeline:
 * ค่าแท็บถูกจำไว้ใน localStorage ข้ามการเปิดหน้าใหม่
 */
const WORKFLOW_TABS = ["move", "aging"] as const;

type WorkflowTab = (typeof WORKFLOW_TABS)[number];

const TAB_STORAGE_KEY = "workflow-rules-tab";

export default function WorkflowRulesPage() {
  const t = useTranslations("workflowRules");
  const router = useRouter();
  const { user, ready } = useSession();

  const [tab, setTab] = useStoredPreference<WorkflowTab>(
    TAB_STORAGE_KEY,
    "move",
    WORKFLOW_TABS,
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
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: 1.2,
                color: "#2563eb",
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
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              {t("subtitle")}
            </Typography>
          </Box>
        </Box>

        {/* TABS: เงื่อนไขการย้ายการ์ด / กฎอายุการงดดูแล (Aging) */}
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
            onChange={(_event, next: WorkflowTab) =>
              setTab(next)
            }
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
            <Tab value="move" label={t("tabMove")} />
            <Tab value="aging" label={t("tabAging")} />
          </Tabs>
        </Card>

        {tab === "move" ? (
          <MoveRulesTab />
        ) : (
          <AgingRulesTab />
        )}
      </Box>
    </Box>
  );
}
