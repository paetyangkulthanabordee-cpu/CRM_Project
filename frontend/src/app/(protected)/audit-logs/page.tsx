"use client";

import { useTranslations } from "next-intl";
import ComingSoonPage from "@/components/ComingSoonPage";

export default function AuditLogsPage() {
  const t = useTranslations("auditLogs");

  return (
    <ComingSoonPage
      title={t("title")}
      description={t("description")}
    />
  );
}
