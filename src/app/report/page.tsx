"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

function ReportContent() {
  const t = useTranslations();
  const params = useSearchParams();
  const id = params.get("id");

  if (!id) {
    return <p className="text-sm text-neutral-400">{t("report.empty")}</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">Report {id}</h1>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportContent />
    </Suspense>
  );
}
