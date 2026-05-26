import en from "./messages/en.json";
import ko from "./messages/ko.json";
import type { Locale } from "./config";

type NestedMessages = { [key: string]: string | NestedMessages };

export const MESSAGES: Record<Locale, Record<string, string>> = { ko, en };

function nest(flat: Record<string, string>): NestedMessages {
  const result: NestedMessages = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cur: NestedMessages = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      const existing = cur[k];
      if (typeof existing !== "object" || existing === null) {
        const next: NestedMessages = {};
        cur[k] = next;
        cur = next;
      } else {
        cur = existing;
      }
    }
    cur[parts[parts.length - 1]!] = value;
  }
  return result;
}

export function getMessages(locale: Locale): NestedMessages {
  return nest(MESSAGES[locale]);
}
