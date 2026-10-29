"use client";

import { useTranslations } from "next-intl";

import ComingSoonPage from "@/components/ComingSoonPage";

export default function OrderPipelineReportPage() {
  const t = useTranslations("reports.orderPipeline");

  return (
    <ComingSoonPage
      title={t("title")}
      description={t("description")}
    />
  );
}