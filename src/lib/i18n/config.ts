export const SUPPORTED_LOCALES = ["ko", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_STORAGE_KEY = "cm:locale";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readFromStorage(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isSupportedLocale(raw)) return raw;
  } catch {
    // storage blocked / disabled — silent fail
  }
  return null;
}

function readFromNavigator(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const lang = window.navigator.language;
    if (!lang) return null;
    const head = lang.split("-")[0];
    if (head && isSupportedLocale(head)) return head;
  } catch {
    // navigator inaccessible — silent fail
  }
  return null;
}

export function detectLocale(): Locale {
  return readFromStorage() ?? readFromNavigator() ?? DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // storage blocked / quota exceeded — silent fail
  }
}
