"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleToggle } from "./LocaleToggle";

export function Header() {
  const t = useTranslations();
  return (
    <header className="border-b border-neutral-800">
      <div className="max-w-5xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-white">
          {t("app.title")}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-neutral-400">
          <Link href="/" className="hover:text-neutral-200">
            {t("nav.home")}
          </Link>
          <Link href="/settings" className="hover:text-neutral-200">
            {t("nav.settings")}
          </Link>
          <LocaleToggle />
        </nav>
      </div>
    </header>
  );
}
