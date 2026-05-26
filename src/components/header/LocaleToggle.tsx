"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/config";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="flex items-center gap-2 text-xs text-neutral-500"
      role="group"
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={
            locale === l
              ? "text-white font-medium"
              : "text-neutral-500 hover:text-neutral-300"
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
