import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import ko from "@/lib/i18n/messages/ko.json";

const koMessages = ko as Record<string, unknown>;
const enMessages = en as Record<string, unknown>;

describe("i18n messages", () => {
  it("ko and en have the exact same key set", () => {
    const koKeys = new Set(Object.keys(koMessages));
    const enKeys = new Set(Object.keys(enMessages));

    const missingInEn = [...koKeys].filter((k) => !enKeys.has(k));
    const missingInKo = [...enKeys].filter((k) => !koKeys.has(k));

    expect(
      missingInEn,
      `keys present in ko.json but missing in en.json: ${missingInEn.join(", ")}`,
    ).toEqual([]);
    expect(
      missingInKo,
      `keys present in en.json but missing in ko.json: ${missingInKo.join(", ")}`,
    ).toEqual([]);
  });

  it.each([
    ["ko", koMessages],
    ["en", enMessages],
  ] as const)("%s.json values are non-empty strings (flat structure)", (_name, dict) => {
    for (const [key, value] of Object.entries(dict)) {
      expect(typeof value, `${key} should be a string`).toBe("string");
      expect(
        (value as string).trim().length,
        `${key} should be non-empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("both files have at least one key", () => {
    expect(Object.keys(koMessages).length).toBeGreaterThan(0);
    expect(Object.keys(enMessages).length).toBeGreaterThan(0);
  });
});
