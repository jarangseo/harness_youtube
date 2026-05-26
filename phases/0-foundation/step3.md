# Step 3: layout-shell

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (UI 변경 시 안티패턴 표 확인 의무, CRITICAL 규칙들)
- `/docs/ARCHITECTURE.md` (특히 §1 디렉토리 구조, §22 접근성, §23 i18n)
- `/docs/UI_GUIDE.md` (디자인 시스템 전체 — 색상, 컴포넌트, 안티패턴 표 반드시 정독)
- `/docs/ADR.md` (특히 ADR-003 정적 export)
- `/docs/PRD.md` (§8 사용자 경험 흐름, §13 디자인 방향)
- `/src/lib/i18n/config.ts` (이전 step 산출물)
- `/src/lib/i18n/index.ts` (이전 step 산출물)
- `/src/lib/i18n/messages/ko.json`, `/src/lib/i18n/messages/en.json` (이전 step 산출물)
- `/src/components/i18n/LocaleProvider.tsx` (이전 step 산출물 — `LocaleProvider`, `useLocale` 훅)
- `/src/app/layout.tsx`, `/src/app/page.tsx` (step 0 placeholder)
- `/src/app/globals.css` (step 0)
- `/next.config.ts` (step 0 — `output: "export"`, `trailingSlash: true`)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 이전 step 컨텍스트 (요약)

- step 0: Next 15 App Router + TS strict + Tailwind 4 + pnpm. `next.config.ts`에 `output: "export"`, `trailingSlash: true`.
- step 1: Vitest + jsdom + RTL + MSW. 테스트 인프라 동작.
- step 2: `next-intl` + `lib/i18n/{config,index,messages/{ko,en}.json}` + `components/i18n/LocaleProvider.tsx`(`LocaleProvider`와 `useLocale` 훅 export). 메시지 키: `app.title`, `header.locale.ko`, `header.locale.en`, `nav.home`, `nav.settings`, `nav.onboarding`, `common.cancel`, `common.confirm`, `report.empty`.

## 핵심 아키텍처 결정: report 라우트는 query parameter 방식

**`src/app/report/[id]/page.tsx`를 만들지 마라.** 대신 `src/app/report/page.tsx`를 만들고 `?id=...` 쿼리 파라미터로 reportId를 읽는다.

이유: `output: "export"` 정적 export는 dynamic route에 `generateStaticParams`가 필요한데, reportId는 LocalStorage에서 런타임 생성이라 빌드 시점에 알 수 없다. query parameter 방식으로 우회.

이 결정에 따라 `/docs/ARCHITECTURE.md`의 §1 디렉토리 구조에서 `report/[id]/page.tsx`를 `report/page.tsx`로 갱신해야 한다 (§9 작업 참조).

## 작업

### 1. `src/app/globals.css` — 디자인 토큰

Tailwind 4 import를 보존하고, UI_GUIDE.md의 색상 토큰을 CSS 변수로 추가:

```css
@import "tailwindcss";

@theme {
  --color-bg-page: #0a0a0a;
  --color-bg-card: #141414;
  --color-bg-input: #1a1a1a;
  --color-sentiment-positive: #22c55e;
  --color-sentiment-negative: #ef4444;
  --color-sentiment-neutral: #525252;
}

:root {
  color-scheme: dark;
}

html,
body {
  background-color: var(--color-bg-page);
  color: white;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

핵심 규칙:
- 시스템 폰트만 사용. CDN 폰트(Google Fonts 등) 로드 절대 금지 (PRD §7.5, ADR-023 정신).
- 한국어 가독성을 위해 `"Apple SD Gothic Neo"`, `"Noto Sans KR"`를 시스템 폰트 fallback에 포함 (둘 다 시스템에 있을 때만 사용, 외부 로드 없음).
- `color-scheme: dark` 설정해 form control도 다크모드 매칭.
- `prefers-reduced-motion` 존중 (ARCHITECTURE.md §22, UI_GUIDE.md §애니메이션).

### 2. `src/app/layout.tsx` — 루트 레이아웃

App Router의 `app/layout.tsx`는 server component가 기본이지만, `LocaleProvider`가 클라이언트라 자식으로 받기만 하면 된다. layout 자체는 server component로 유지:

```tsx
import type { ReactNode } from "react";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Header } from "@/components/header/Header";

export const metadata = {
  title: "댓글거울 (Comment Mirror)",
  description: "YouTube 영상 댓글을 분석해 크리에이터 피드백 리포트를 만드는 클라이언트 전용 웹앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LocaleProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
              {children}
            </main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
```

핵심 규칙:
- `<html lang="ko">` 고정. 이유: 초기 SSR 시 locale이 항상 `DEFAULT_LOCALE`("ko")이므로 hydration mismatch 회피. 사용자가 영어로 토글해도 `lang` 속성을 동적 변경하지 않음 (스크린리더 영향 미미, hydration 안정성 우선).
- 폭은 `max-w-5xl mx-auto` (UI_GUIDE.md §레이아웃).
- 패딩 `px-6 py-8` (UI_GUIDE.md §레이아웃).

### 3. `src/components/header/Header.tsx`

```tsx
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
          <Link href="/" className="hover:text-neutral-200">{t("nav.home")}</Link>
          <Link href="/settings" className="hover:text-neutral-200">{t("nav.settings")}</Link>
          <LocaleToggle />
        </nav>
      </div>
    </header>
  );
}
```

### 4. `src/components/header/LocaleToggle.tsx` — KO | EN 토글

```tsx
"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/config";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500" role="group" aria-label="Language">
      {(["ko", "en"] as const).map((l: Locale) => (
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
```

핵심 규칙:
- UI_GUIDE.md §컴포넌트 §버튼 §Text 스타일 준수: `text-neutral-500 hover:text-neutral-300`.
- 접근성: `aria-pressed`로 현재 선택 상태 알림.
- transition은 150ms 이내만 허용 (UI_GUIDE.md §애니메이션) — 여기선 별도 transition 클래스 없이 색상만 바뀜.

### 5. 라우트 셸 4개

#### `src/app/page.tsx`

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">{t("app.title")}</h1>
      <p className="text-sm text-neutral-400">
        {/* placeholder — URL 입력 등은 후속 phase에서 */}
      </p>
    </div>
  );
}
```

#### `src/app/settings/page.tsx`

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">{t("nav.settings")}</h1>
    </div>
  );
}
```

#### `src/app/onboarding/page.tsx`

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function OnboardingPage() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">{t("nav.onboarding")}</h1>
    </div>
  );
}
```

#### `src/app/report/page.tsx` — query parameter 방식

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ReportPage() {
  const t = useTranslations();
  const params = useSearchParams();
  const id = params.get("id");

  if (!id) {
    return <p className="text-sm text-neutral-400">{t("report.empty")}</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">Report {id}</h1>
      {/* 본 step에서는 placeholder. 실 데이터 fetch는 후속 phase. */}
    </div>
  );
}
```

핵심 규칙:
- `useSearchParams`를 정적 export에서 쓰려면 `Suspense` 경계가 필요할 수 있다. Next 15에서 빌드 시 경고/에러가 나면 `<Suspense fallback={null}>`로 감싸라. 가장 단순한 방법: `app/report/page.tsx`에서 컴포넌트를 분리하고 default export는 Suspense로 감싼 wrapper:

```tsx
"use client";

import { Suspense } from "react";

function ReportContent() { /* useSearchParams 사용 */ }

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportContent />
    </Suspense>
  );
}
```

### 6. 모든 페이지 `"use client"` 시작

ARCHITECTURE.md §2: "모든 페이지 `"use client"` 기본". layout.tsx만 server component로 유지 (i18n provider를 클라이언트 자식으로 주입).

### 7. UI_GUIDE.md 안티패턴 가드

작성한 모든 컴포넌트와 globals.css를 다시 확인하라. UI_GUIDE.md "AI 슬롭 안티패턴" 표의 다음 항목이 코드에 **단 하나도** 없어야 한다:

| 금지 사항 | 검색 키워드 |
|-----------|------------|
| backdrop-filter: blur() | `backdrop-blur`, `backdrop-filter` |
| gradient-text | `bg-gradient`, `text-transparent bg-clip-text` |
| "Powered by AI" 배지 | "Powered by AI" 문자열 |
| box-shadow 글로우 애니메이션 | `shadow-[0_0_...`, `drop-shadow-glow` |
| 보라/인디고 브랜드 색 | `purple-`, `indigo-`, `violet-`, `fuchsia-` |
| 모든 카드 `rounded-2xl` 일괄 | 카드에 `rounded-lg` 사용 (UI_GUIDE.md §컴포넌트 §카드) |
| 배경 gradient orb (blur-3xl 원형) | `blur-3xl`, `rounded-full ... blur` |

위 키워드를 코드에서 검색해 0건임을 확인하라.

### 8. 접근성

- 모든 인터랙티브 요소(Link, button)는 visible focus ring 보장 — Tailwind 기본 focus 스타일은 약하므로 globals.css에 다음 추가:

```css
:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}
```

- `aria-live`는 본 step에선 진행 상태 컴포넌트가 없어 미적용 (후속 phase).

### 9. `/docs/ARCHITECTURE.md` 갱신

§1 디렉토리 구조에서:

```
│   ├── report/[id]/page.tsx        # 리포트 상세
```

위 줄을 다음으로 변경:

```
│   ├── report/page.tsx             # 리포트 상세 (?id=... 쿼리 파라미터)
```

이유: 정적 export(`output: "export"`)는 dynamic route에 `generateStaticParams` 필수인데, reportId는 LocalStorage 런타임 생성이라 빌드 시점에 알 수 없다. query parameter 방식으로 우회 (본 step의 핵심 결정).

§17 또는 §3 분석 파이프라인의 `/report/[id]/페이지` 언급도 발견 시 동일하게 갱신하라 (실제 텍스트 검색 후 일관성 유지).

### 10. (선택) 가벼운 컴포넌트 테스트

본 step은 UI 셸이라 TDD 강제 대상은 아니지만, `LocaleToggle`의 토글 동작 정도는 간단한 RTL 테스트로 검증할 수 있다. 시간 여유가 있고 회귀 가치가 있으면 추가하라. 강제는 아님.

## Acceptance Criteria

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

- `pnpm test` — 기존 테스트(sanity 2개 + i18n config/messages) 모두 PASS
- `pnpm lint` — error 0
- `pnpm build` — 정적 export 성공, `out/index.html`, `out/settings/index.html`, `out/onboarding/index.html`, `out/report/index.html` 모두 생성됨
- `pnpm build` 출력에 "Suspense" 또는 `useSearchParams` 관련 prerendering 에러가 없어야 함

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `out/` 디렉토리에 4개 페이지의 `index.html`이 모두 존재하는지 확인:
   ```bash
   ls out/index.html out/settings/index.html out/onboarding/index.html out/report/index.html
   ```
3. 코드 전체에 다음 키워드 grep으로 0건 확인:
   ```bash
   grep -rE "backdrop-(blur|filter)|bg-gradient|text-transparent.*bg-clip|purple-|indigo-|violet-|fuchsia-|blur-3xl|Powered by AI" src/ app/ 2>/dev/null
   ```
4. `app/report/[id]/page.tsx`가 존재하지 않는지 확인 (query parameter 방식 결정).
5. `docs/ARCHITECTURE.md`의 디렉토리 구조에 `report/page.tsx`로 갱신됐는지 확인.
6. (수동) `pnpm dev`로 띄워 브라우저에서 / → /settings → /onboarding → /report?id=test 이동, 헤더의 KO|EN 토글이 동작하는지 확인. 토글 후 페이지 텍스트가 즉시 영어로 바뀌어야 한다.
7. 아키텍처 체크리스트:
   - UI_GUIDE.md 안티패턴 0건인가?
   - 모든 페이지가 `"use client"` 시작하는가? (layout.tsx 제외)
   - `app/report/[id]/`가 없고 `app/report/page.tsx`만 있는가?
   - `<html lang="ko">` 고정인가? (hydration 안정성)
   - `prefers-reduced-motion` 처리 있는가?
   - 외부 폰트 CDN 로드 0건인가?
8. 결과에 따라 `phases/0-foundation/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "app/layout.tsx + 4개 라우트 셸(home/settings/onboarding/report) + Header + LocaleToggle 추가. globals.css에 디자인 토큰과 reduced-motion. report는 ?id 쿼리 방식, ARCHITECTURE.md §1 갱신. UI_GUIDE 안티패턴 0건 확인."`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `src/app/report/[id]/page.tsx` 만들지 마라. 이유: 정적 export(`output: "export"`)는 dynamic route에 `generateStaticParams` 필수. reportId는 LocalStorage 런타임 생성이라 빌드 시점에 알 수 없음. `?id=...` 쿼리 파라미터로 결정.
- UI_GUIDE.md "AI 슬롭 안티패턴" 표의 어떤 항목도 사용 금지 (backdrop-blur, gradient-text, glow shadow, 보라/인디고, gradient orb 등). 이유: 본 프로젝트의 명시적 디자인 규약. 위반 시 1회 재작업.
- 외부 폰트 CDN 로드 금지 (Google Fonts 등). 이유: PRD §7.5 — 시스템 폰트만, 트래픽 0.
- 외부 분석 도구(GA, Plausible 등) 삽입 금지. 이유: ADR-023.
- 마케팅 카피(예: "Welcome to the future of comment analysis", 큰 hero) 금지. 이유: UI_GUIDE.md 1번 원칙 — 도구 톤, 대시보드 톤.
- 페이지에 `"use client"` 빼먹지 마라 (layout.tsx 제외). 이유: ARCHITECTURE.md §2.
- `LocaleProvider`의 초기 locale 상태를 LocalStorage에서 동기로 읽지 마라. 이유: hydration mismatch — 이미 step 2에서 처리됨. 만약 변경 필요해 보이면 step 2 산출물을 그대로 사용하라.
- `<html>` 또는 `<body>`에 dynamic `lang` 속성 적용 금지. 이유: hydration mismatch + 스크린리더 안정성. 항상 `"ko"` 고정.
- `next.config.ts`의 `output: "export"`, `trailingSlash`를 변경하지 마라. 이유: 정적 배포 핵심.
- 새 dependency 추가 시 ARCHITECTURE.md §24 외부 의존성 표에 없는 것을 임의로 넣지 마라. 헤더 아이콘 등 필요 시 SVG 인라인 사용 (UI_GUIDE.md §아이콘).
- 기존 테스트(sanity 2개 + i18n config/messages)를 깨뜨리지 마라.
