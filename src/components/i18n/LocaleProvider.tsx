"use client";

import { NextIntlClientProvider } from "next-intl";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getMessages } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  detectLocale,
  setLocale as persistLocale,
  type Locale,
} from "@/lib/i18n/config";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type Props = { children: ReactNode };

export function LocaleProvider({ children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const changeLocale = (next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  };

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getMessages(locale)}
      timeZone="UTC"
    >
      <LocaleContext.Provider value={{ locale, setLocale: changeLocale }}>
        {children}
      </LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
