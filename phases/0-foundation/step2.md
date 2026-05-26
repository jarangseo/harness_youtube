# Step 2: i18n-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (TDD 강제 규칙 — 이 step은 `lib/i18n/`이 순수 함수 영역이므로 TDD 적용)
- `/docs/ARCHITECTURE.md` (특히 §1 디렉토리 구조 `lib/i18n/`, §23 국제화 (i18n) 전체)
- `/docs/ADR.md` (특히 ADR-017 언어 정책)
- `/docs/PRD.md` (§7.7 다국어)
- `/package.json` (step 0, 1 산출물)
- `/vitest.config.ts` (step 1 산출물 — alias `@` 확인)
- `/src/test/setup.ts` (step 1 산출물)
- `/tsconfig.json` (step 0 산출물 — `noUncheckedIndexedAccess` 활성 상태)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 이전 step 컨텍스트 (요약)

- step 0: Next 15 App Router + TS strict + Tailwind 4 + pnpm. `output: "export"` 정적 export.
- step 1: Vitest + jsdom + RTL + MSW. `src/test/setup.ts`, `src/test/mocks/{server,handlers}.ts`, sanity test 2개.

## TDD 의무

이 step의 `lib/i18n/config.ts`와 메시지 키 일치 검증은 **순수 함수 영역**이다. CLAUDE.md의 TDD 규칙을 적용해 반드시 테스트를 먼저 작성하고, 통과하는 구현을 작성하라.

순서:
1. `src/lib/i18n/__tests__/config.test.ts` 작성 (실패하는 빨간 테스트)
2. `src/lib/i18n/config.ts` 구현 → 테스트 통과
3. `src/lib/i18n/__tests__/messages.test.ts` 작성
4. `src/lib/i18n/messages/ko.json`, `en.json` 작성 → 테스트 통과

## 작업

### 1. 의존성 설치

```bash
pnpm add next-intl
```

ARCHITECTURE.md §24에 명시된 버전 3.x를 따른다. 정적 export와 호환되는 모드로 사용한다.

### 2. URL 기반 locale routing 사용 금지

`next-intl`의 `/[locale]/...` URL 라우팅은 사용하지 않는다. 이유:
- 정적 export 시 모든 locale 디렉토리를 미리 빌드해야 함 → 빌드 결과물 2배
- 본 프로젝트는 LocalStorage(`cm:locale`) 기반 클라이언트 전환 (ARCHITECTURE.md §23)

대신 `NextIntlClientProvider`로 children을 감싸고, locale과 messages를 props로 주입하는 방식을 사용한다.

### 3. `src/lib/i18n/config.ts` — locale 감지/전환 로직

다음 시그니처를 정확히 구현하라 (내부 구현은 재량):

```ts
export const SUPPORTED_LOCALES = ["ko", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_STORAGE_KEY = "cm:locale";

/**
 * 현재 환경에서 사용할 locale을 결정한다.
 * 우선순위:
 *   1. LocalStorage의 `cm:locale` 값 (단, SUPPORTED_LOCALES에 있을 때만)
 *   2. navigator.language의 첫 토큰 (예: "ko-KR" → "ko"), SUPPORTED_LOCALES에 있을 때만
 *   3. DEFAULT_LOCALE
 *
 * SSR 환경(window/localStorage 미존재) 또는 예외 발생 시 DEFAULT_LOCALE 반환.
 */
export function detectLocale(): Locale;

/**
 * locale을 LocalStorage에 저장한다.
 * SSR 환경 또는 예외 발생 시 silent fail (throw 금지).
 */
export function setLocale(locale: Locale): void;

/**
 * 임의의 문자열이 지원 locale인지 좁히는 type guard.
 */
export function isSupportedLocale(value: string): value is Locale;
```

핵심 규칙:
- `detectLocale`은 SSR 환경에서 절대 throw하면 안 된다. `typeof window === "undefined"` 가드 필수. 이유: Next 정적 export여도 빌드 시점에는 SSR 컨텍스트.
- `setLocale`도 동일하게 SSR 가드.
- `navigator.language`가 `"ko-KR"`이면 `"ko"`로 잘라낸다 (첫 토큰만 사용).
- `noUncheckedIndexedAccess` 활성 상태이므로 `lang.split("-")[0]`은 `string | undefined`. 가드 필요.

### 4. `src/lib/i18n/__tests__/config.test.ts`

다음 케이스를 반드시 포함하라:

- `isSupportedLocale("ko")` → `true`
- `isSupportedLocale("en")` → `true`
- `isSupportedLocale("ja")` → `false`
- `detectLocale()` — LocalStorage에 `"en"` 저장 시 `"en"` 반환
- `detectLocale()` — LocalStorage에 유효하지 않은 값(`"xx"`) 저장 시 `navigator.language`로 fallback
- `detectLocale()` — LocalStorage 비어있고 `navigator.language === "en-US"` → `"en"`
- `detectLocale()` — LocalStorage 비어있고 `navigator.language === "fr-FR"` → `DEFAULT_LOCALE` (`"ko"`)
- `setLocale("en")` 호출 후 `localStorage.getItem("cm:locale") === "en"`
- (선택) `localStorage` 접근이 throw하는 환경에서도 `detectLocale()`이 `DEFAULT_LOCALE`을 안전하게 반환

`navigator.language` 모킹은 `Object.defineProperty(window.navigator, "language", { value: "en-US", configurable: true })` 패턴을 사용. 각 테스트 전후로 `localStorage.clear()` 필수.

### 5. `src/lib/i18n/messages/ko.json`, `en.json`

flat key 구조 (ARCHITECTURE.md §23). 초기 키 (step 3에서 사용할 최소 집합):

```json
{
  "app.title": "댓글거울",
  "header.locale.ko": "한국어",
  "header.locale.en": "English",
  "nav.home": "홈",
  "nav.settings": "설정",
  "nav.onboarding": "시작하기",
  "common.cancel": "취소",
  "common.confirm": "확인",
  "report.empty": "리포트를 찾을 수 없습니다"
}
```

en.json은 동일한 키 집합에 영어 값:

```json
{
  "app.title": "Comment Mirror",
  "header.locale.ko": "한국어",
  "header.locale.en": "English",
  "nav.home": "Home",
  "nav.settings": "Settings",
  "nav.onboarding": "Get started",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "report.empty": "Report not found"
}
```

핵심 규칙:
- **flat key 구조**. 중첩 객체 금지 (`{"app": {"title": "..."}}` 금지). 이유: 키 누락 검증을 단순화.
- 두 파일의 키 집합이 정확히 일치해야 함.
- 값은 비어있지 않아야 함.

### 6. `src/lib/i18n/__tests__/messages.test.ts` — 키 일치 가드

다음을 검증:

- `Object.keys(ko)`와 `Object.keys(en)`의 집합이 동일한가 (한쪽에만 있는 키 발견 시 fail, 어느 쪽에 없는지 명시)
- 두 파일 모두 값이 비어있지 않은가 (`value.trim().length > 0`)
- 모든 키가 flat (값이 string 타입, object 아님)

이 가드는 향후 메시지 추가 시 자동으로 양쪽 동기화를 강제한다.

### 7. `src/lib/i18n/index.ts` — 메시지 로더

```ts
import ko from "./messages/ko.json";
import en from "./messages/en.json";
import type { Locale } from "./config";

export const MESSAGES: Record<Locale, Record<string, string>> = { ko, en };

export function getMessages(locale: Locale): Record<string, string> {
  return MESSAGES[locale];
}
```

`tsconfig.json`의 `resolveJsonModule: true` 활성 상태이므로 JSON import 가능.

### 8. `src/components/i18n/LocaleProvider.tsx` — 클라이언트 컨텍스트

```tsx
"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, detectLocale, setLocale as persistLocale, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n";

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
```

`LocaleContext`도 같은 파일에서 export하라 (step 3의 헤더 토글이 `useContext`로 소비):

```tsx
import { createContext, useContext } from "react";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
```

핵심 규칙:
- **초기 렌더(서버 또는 hydration 직전)는 `DEFAULT_LOCALE`로 시작**. `useEffect`에서 `detectLocale()`로 교체. 이유: hydration mismatch 방지.
- `timeZone`은 hydration 안정성을 위해 명시 (UTC 고정 또는 사용자 선택 옵션은 후속 step).

## Acceptance Criteria

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

- `pnpm test` — config + messages 테스트 모두 PASS (sanity test 2개도 그대로 PASS)
- `pnpm lint` — error 0
- `pnpm build` — 정적 export 계속 성공

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `pnpm test` 출력에서 config 테스트(LocalStorage/navigator 시나리오 8개 이상)와 messages 테스트(키 일치, 비어있지 않음, flat 검증)가 모두 PASS인지 확인한다.
3. TDD 순서 검증 — 테스트 파일이 구현 파일과 같은 커밋 또는 더 이전에 작성됐는가? (가능하면 테스트 먼저 작성 → 실패 확인 → 구현 → 통과 순서)
4. `lib/i18n/config.ts`의 `detectLocale`이 SSR 환경에서 throw하지 않는지 코드 리뷰.
5. 아키텍처 체크리스트:
   - ARCHITECTURE.md §23 i18n 정책을 따랐는가? (LocalStorage 키 `cm:locale`, 감지 우선순위, flat key, next-intl 3.x)
   - ADR-017을 위반하지 않았는가? (ko/en만 지원, URL 라우팅 미사용)
   - CLAUDE.md TDD 규칙을 지켰는가? (lib/i18n는 순수 영역)
6. 결과에 따라 `phases/0-foundation/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "next-intl 3.x 설치. lib/i18n/{config.ts, index.ts, messages/{ko,en}.json} 구현, components/i18n/LocaleProvider.tsx + useLocale 훅 추가. config 및 messages 테스트 TDD로 작성, 모두 통과."`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `next-intl`의 URL 기반 locale routing (`/[locale]/...`) 사용 금지. 이유: 정적 export 빌드 부담 + LocalStorage 기반 결정 (ARCHITECTURE.md §23).
- 메시지 파일에 중첩 객체 금지. 이유: flat key 구조 강제 (ARCHITECTURE.md §23). 키 누락 검증이 복잡해진다.
- `detectLocale` 또는 `setLocale`에서 throw 금지. 이유: SSR / 프라이빗 모드 / Storage 차단 환경에서도 안전해야 함. silent fail + DEFAULT_LOCALE fallback.
- 구현부터 작성 금지 (TDD). 이유: CLAUDE.md "새 기능 구현 시 반드시 테스트를 먼저 작성"이 lib/* 순수 영역에 적용.
- ko/en 외 locale 추가 금지. 이유: ADR-017 — 일본어·중국어 등은 사용자 비중 20%+ 도달 시 검토.
- `LocaleProvider`를 server component로 만들지 마라. 이유: useState/useContext 사용. 반드시 `"use client"`.
- 초기 렌더에서 `detectLocale()`을 동기 호출 금지 (useState 초기값으로 사용 금지). 이유: hydration mismatch 발생 — 서버는 `DEFAULT_LOCALE`, 클라이언트는 LocalStorage 값.
- `app/layout.tsx` 수정 금지. 이유: 레이아웃 셸은 step 3 범위.
- 기존 테스트(sanity test 2개)를 깨뜨리지 마라.
