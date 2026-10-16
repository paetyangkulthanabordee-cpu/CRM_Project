"use client";

import { useTranslations } from "next-intl";

import ComingSoonPage from "@/components/ComingSoonPage";

export default function SalesReportPage() {
  const t = useTranslations("reports.sales");

  return (
    <ComingSoonPage
      title={t("title")}
      description={t("description")}
    />
  );
}