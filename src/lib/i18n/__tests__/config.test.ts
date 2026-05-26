import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isSupportedLocale,
  setLocale,
} from "@/lib/i18n/config";

function mockNavigatorLanguage(value: string): void {
  Object.defineProperty(window.navigator, "language", {
    value,
    configurable: true,
  });
}

describe("isSupportedLocale", () => {
  it("returns true for ko", () => {
    expect(isSupportedLocale("ko")).toBe(true);
  });

  it("returns true for en", () => {
    expect(isSupportedLocale("en")).toBe(true);
  });

  it("returns false for unsupported locale", () => {
    expect(isSupportedLocale("ja")).toBe(false);
    expect(isSupportedLocale("zh")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });
});

describe("detectLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigatorLanguage("ko-KR");
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns the value stored in LocalStorage when supported", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    expect(detectLocale()).toBe("en");
  });

  it("falls back to navigator.language when stored value is not supported", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "xx");
    mockNavigatorLanguage("en-US");
    expect(detectLocale()).toBe("en");
  });

  it("derives locale from navigator.language first token (en-US → en)", () => {
    mockNavigatorLanguage("en-US");
    expect(detectLocale()).toBe("en");
  });

  it("returns DEFAULT_LOCALE when navigator.language is unsupported", () => {
    mockNavigatorLanguage("fr-FR");
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("ko");
  });

  it("returns DEFAULT_LOCALE when LocalStorage access throws", () => {
    const spy = vi
      .spyOn(window.Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });
    mockNavigatorLanguage("fr-FR");
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
    spy.mockRestore();
  });

  it("returns DEFAULT_LOCALE when navigator.language is empty", () => {
    mockNavigatorLanguage("");
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
  });
});

describe("setLocale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("persists the locale to LocalStorage under the configured key", () => {
    setLocale("en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("overwrites a previous value", () => {
    setLocale("en");
    setLocale("ko");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ko");
  });

  it("does not throw when LocalStorage write fails", () => {
    const spy = vi
      .spyOn(window.Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });
    expect(() => setLocale("en")).not.toThrow();
    spy.mockRestore();
  });
});
