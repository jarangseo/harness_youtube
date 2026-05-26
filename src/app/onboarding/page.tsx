"use client";

import { useTranslations } from "next-intl";

export default function OnboardingPage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">
        {t("nav.onboarding")}
      </h1>
    </div>
  );
}
