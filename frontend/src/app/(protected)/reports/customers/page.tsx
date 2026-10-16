"use client";

import { useTranslations } from "next-intl";

import ComingSoonPage from "@/components/ComingSoonPage";

export default function CustomersReportPage() {
  const t = useTranslations("reports.customers");

  return (
    <ComingSoonPage
      title={t("title")}
      description={t("description")}
    />
  );
}