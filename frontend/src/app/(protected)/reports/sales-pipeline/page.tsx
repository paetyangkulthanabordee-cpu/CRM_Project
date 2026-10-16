"use client";

import { useTranslations } from "next-intl";

import ComingSoonPage from "@/components/ComingSoonPage";

export default function SalesPipelineReportPage() {
  const t = useTranslations("reports.salesPipeline");

  return (
    <ComingSoonPage
      title={t("title")}
      description={t("description")}
    />
  );
}