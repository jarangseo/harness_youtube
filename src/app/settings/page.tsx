"use client";

import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">{t("nav.settings")}</h1>
    </div>
  );
}
