import en from "./messages/en.json";
import ko from "./messages/ko.json";
import type { Locale } from "./config";

export const MESSAGES: Record<Locale, Record<string, string>> = { ko, en };

export function getMessages(locale: Locale): Record<string, string> {
  return MESSAGES[locale];
}
