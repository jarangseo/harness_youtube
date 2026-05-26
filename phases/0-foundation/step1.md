# Step 1: test-tooling

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (TDD 강제 규칙, 명령어 섹션)
- `/docs/ARCHITECTURE.md` (특히 §19 테스트 전략, §24 외부 의존성)
- `/docs/ADR.md` (특히 ADR-008 Vitest + Testing Library + MSW)
- `/package.json` (이전 step 산출물 — 의존성과 scripts 확인)
- `/next.config.ts` (이전 step 산출물)
- `/tsconfig.json` (이전 step 산출물 — path alias `@/*` 확인)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 이전 step 컨텍스트 (요약)

step 0에서 Next.js 15 App Router + TypeScript strict + Tailwind 4 + pnpm 셋업이 완료되었다. `output: "export"` 정적 배포 설정 적용. `pnpm install`, `pnpm lint`, `pnpm build`가 통과하는 상태.

## 작업

테스트 도구를 설치하고 동작하는 sanity test 1개를 추가한다.

### 1. 의존성 설치 (모두 devDependencies)

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw \
  @vitejs/plugin-react
```

버전은 다음 메이저를 따른다 (ARCHITECTURE.md §24):
- `vitest`: 1.x 이상 (최신 안정 버전)
- `@testing-library/react`: latest
- `msw`: 2.x
- `jsdom`: latest

### 2. `vitest.config.ts` (프로젝트 루트)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- `environment: "jsdom"` — DOM 시뮬레이션. happy-dom은 호환성 이슈가 있으므로 jsdom 고정.
- `globals: true` — `describe`, `it`, `expect`를 import 없이 사용 가능.
- `alias`는 `tsconfig.json`의 `paths`(`@/*`)와 일치시킨다.

### 3. `src/test/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` — 테스트 중 모킹되지 않은 외부 요청은 에러로 처리. 실 외부 API 호출 방지.

### 4. `src/test/mocks/server.ts`

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### 5. `src/test/mocks/handlers.ts`

```ts
import type { RequestHandler } from "msw";

export const handlers: RequestHandler[] = [];
```

빈 배열로 시작. 후속 step에서 YouTube/Anthropic 모킹 추가.

### 6. `src/test/sanity.test.ts` (sanity test 1개)

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("vitest runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

설치가 제대로 됐는지 확인용. 컴포넌트 렌더 sanity test도 1개 추가:

`src/test/sanity-render.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("testing-library renders", () => {
  it("renders a heading", () => {
    render(<h1>hello</h1>);
    expect(screen.getByRole("heading", { name: "hello" })).toBeInTheDocument();
  });
});
```

### 7. `package.json` scripts 추가

기존 scripts를 보존하고 다음을 추가:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 8. TypeScript에 vitest globals 타입 등록

`tsconfig.json`의 `compilerOptions.types`에 `"vitest/globals"`를 추가하거나, `vitest.config.ts`의 `globals: true`와 함께 `src/test/setup.ts` 또는 별도 `vitest-env.d.ts`에서 처리. 가장 단순한 방법:

`tsconfig.json` `compilerOptions`에 다음 한 줄 추가:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

### 9. ESLint 가드

테스트 파일에서 `describe`, `it` 등 글로벌을 ESLint가 unknown으로 오인하지 않도록, `eslint.config.mjs` 또는 `.eslintrc.json`에 vitest 환경을 추가하거나 `globals: { describe: "readonly", ... }`를 설정한다. 가장 단순한 방법: 테스트 파일 패턴 `src/**/*.{test,spec}.{ts,tsx}`에 한해 globals 허용.

## Acceptance Criteria

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

- `pnpm test` — sanity test 2개 모두 PASS
- `pnpm lint` — error 0
- `pnpm build` — 정적 export 계속 성공 (이전 step에서 통과한 것을 깨지 않음)

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. `pnpm test` 출력에서 "2 passed" (또는 그 이상)를 확인한다.
3. `vitest.config.ts`의 `alias`와 `tsconfig.json`의 `paths`가 일치하는지 확인한다.
4. `src/test/setup.ts`에서 MSW server가 `onUnhandledRequest: "error"`로 설정됐는지 확인한다.
5. 아키텍처 체크리스트:
   - ARCHITECTURE.md §19, §24의 도구 목록을 따랐는가? (Vitest, RTL, MSW)
   - ADR-008을 위반하지 않았는가? (Jest 사용 금지, E2E 도구 도입 금지)
6. 결과에 따라 `phases/0-foundation/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Vitest + jsdom + RTL + MSW 셋업 완료. src/test/{setup,mocks/server,mocks/handlers,sanity.test,sanity-render.test} 생성. pnpm test 2 passed."`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- Jest 또는 Mocha 사용 금지. 이유: ADR-008에서 Vitest로 결정.
- Playwright, Cypress 등 E2E 도구 설치 금지. 이유: ADR-008에서 E2E는 MVP 제외.
- `happy-dom` 사용 금지. 이유: 일부 RTL 동작에서 jsdom 대비 호환성 이슈. 지금은 jsdom 고정.
- MSW를 실 네트워크 fetch로 우회 금지. 이유: 테스트에서 실 외부 API 호출은 절대 금지 (BYOK 키 없음 + 비용 발생).
- `onUnhandledRequest`를 `"warn"` 또는 `"bypass"`로 두지 마라. 이유: 모킹 누락이 조용히 통과되면 디버깅 지옥.
- `src/test/sanity.test.ts` 외에 비즈니스 로직 테스트를 만들지 마라. 이유: 본 step은 도구 셋업만. 도메인 로직과 테스트는 후속 step에서.
- 기존 테스트를 깨뜨리지 마라 (`pnpm lint`, `pnpm build`가 step 0과 동일하게 통과해야 한다).
- `package.json`의 `packageManager`, `next.config.ts`, `tsconfig.json` strict 옵션을 변경하지 마라. 이유: step 0 결정 사항 보존.
