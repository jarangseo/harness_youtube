"use client";

import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">{t("app.title")}</h1>
      <p className="text-sm text-neutral-400" />
    </div>
  );
}
