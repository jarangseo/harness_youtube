# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (프로젝트 핵심 규칙 — CRITICAL 항목 전부)
- `/docs/ARCHITECTURE.md` (특히 §1 디렉토리 구조, §20 빌드/배포)
- `/docs/ADR.md` (특히 ADR-003 Next.js 15 정적 export, ADR-007 pnpm, ADR-009 TS strict)

## 작업

`/Users/luckyseo/Projects/harness_framework` 루트에 Next.js 15 App Router 프로젝트를 초기화한다. 이미 존재하는 `docs/`, `scripts/`, `phases/`, `CLAUDE.md`, `.gitignore`, `.git/`은 보존한다 (덮어쓰거나 삭제 금지).

### 1. 패키지 매니저 — pnpm

- `package.json`의 `"packageManager"` 필드를 `"pnpm@9.x"` 형식으로 고정 (안정 LTS 버전 명시, 예: `"pnpm@9.15.0"`)
- 설치 명령은 모두 pnpm 사용 (`pnpm install`, `pnpm add`, `pnpm add -D`)

### 2. Next.js 15 App Router

- Next.js 15.x 설치
- React 19.x 설치
- `src/` 디렉토리 사용 (ARCHITECTURE.md §1 명시)
- App Router 사용 — `src/app/` 디렉토리. `pages/` 라우터는 만들지 마라.
- `src/app/layout.tsx`와 `src/app/page.tsx`는 최소한의 placeholder로 생성 (step 3에서 본격 작성)
- `src/app/globals.css` 생성 (Tailwind 4 import 포함, 본격 디자인 토큰은 step 3에서 추가)

### 3. TypeScript strict 설정

`tsconfig.json`에 다음을 반드시 포함:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "resolveJsonModule": true,
    "allowJs": false,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`noUncheckedIndexedAccess`는 절대 빼지 마라 (ADR-009). 빠지면 `array[i]`가 `T`로 추론되어 `undefined` 누락 케이스가 통과해버림.

### 4. Tailwind CSS 4

- Tailwind 4.x 설치 (`tailwindcss`, `@tailwindcss/postcss` 또는 Tailwind 4의 권장 PostCSS 연동 방식 사용)
- `src/app/globals.css`에 `@import "tailwindcss";` (Tailwind 4 신문법) 추가
- 상세 디자인 토큰은 step 3에서 추가 — 지금은 import만

### 5. `next.config.ts` (TS 파일, mjs/js 금지)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

- `output: "export"` 절대 빠뜨리지 마라. 이 프로젝트는 백엔드 없이 정적 배포 (CLAUDE.md CRITICAL).
- `images.unoptimized: true` — 정적 export 시 Image Optimization 비활성화 필수.
- `trailingSlash: true` — 정적 호스팅 호환성을 위해 권장.

### 6. ESLint

- Next.js 15 호환 ESLint 설정 (`eslint`, `eslint-config-next`)
- 설정 파일은 `eslint.config.mjs` 또는 `.eslintrc.json` 중 Next 15 권장 방식
- 룰 커스터마이즈는 최소화 — 기본 `next/core-web-vitals` + `next/typescript`만

### 7. `.gitignore` 갱신

기존 `.gitignore`를 확인하고 다음 항목을 보장 (이미 있으면 중복 추가 금지):

```
node_modules/
.next/
out/
*.tsbuildinfo
.env*.local
.DS_Store
```

### 8. `package.json` scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "lint": "next lint"
}
```

`test`는 step 1에서 추가하므로 지금은 만들지 마라.

### 9. CLAUDE.md 명령어 예시 갱신

`/CLAUDE.md`의 `## 명령어` 섹션의 `npm run ...`을 모두 `pnpm ...` 형식으로 갱신:

```
pnpm dev       # 개발 서버
pnpm build     # 프로덕션 빌드 (정적 export)
pnpm lint      # ESLint
pnpm test      # Vitest (step 1에서 추가)
```

이유: ADR-007에서 pnpm으로 통일했으므로 명령어 예시도 일치시켜야 한다.

### 10. `src/` 하위 빈 디렉토리

ARCHITECTURE.md §1 디렉토리 구조를 따라 빈 디렉토리는 만들지 마라 (git이 추적 안 함). 각 디렉토리는 해당 step에서 첫 파일을 만들 때 자연스럽게 생성된다.

## Acceptance Criteria

```bash
pnpm install
pnpm lint
pnpm build
```

- `pnpm install` — 의존성 설치 성공
- `pnpm lint` — ESLint 통과 (warning 0, error 0)
- `pnpm build` — `out/` 디렉토리에 정적 export 결과물 생성, 컴파일 에러 없음

## 검증 절차

1. 위 AC 커맨드를 순서대로 실행한다.
2. `out/index.html`이 존재하는지 확인한다 (정적 export 성공 신호).
3. `tsconfig.json`에 `"strict": true`와 `"noUncheckedIndexedAccess": true`가 둘 다 있는지 확인한다.
4. `next.config.ts`에 `output: "export"`가 있는지 확인한다.
5. `package.json`의 `packageManager` 필드가 `pnpm@9.x`로 고정되어 있는지 확인한다.
6. `/CLAUDE.md`의 명령어 섹션이 pnpm으로 갱신되어 있는지 확인한다.
7. 아키텍처 체크리스트:
   - 디렉토리 구조가 ARCHITECTURE.md §1을 따르는가? (src/ 사용, app/는 src/app/)
   - ADR 기술 스택을 벗어나지 않았는가? (Next 15, React 19, TS strict, Tailwind 4)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (백엔드 라우트 없음, output: "export" 적용)
8. 결과에 따라 `phases/0-foundation/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Next 15 App Router + TS strict(noUncheckedIndexedAccess) + Tailwind 4 + pnpm 셋업 완료. next.config.ts에 output:export 적용. CLAUDE.md 명령어 pnpm으로 갱신. 정적 빌드 산출물 out/ 확인."`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (예: pnpm 미설치) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- npm 또는 yarn 사용 금지. 이유: ADR-007에서 pnpm으로 통일. lockfile은 `pnpm-lock.yaml`만 존재해야 한다.
- `next.config.mjs` 또는 `next.config.js` 사용 금지. 이유: TS strict 일관성 (`next.config.ts`만 사용).
- `output: "export"` 빠뜨리지 마라. 이유: 백엔드 없는 정적 배포가 핵심 아키텍처 (CLAUDE.md CRITICAL, ADR-003).
- `src/app/api/` 라우트 핸들러 만들지 마라. 이유: 백엔드 라우트 금지 (CLAUDE.md CRITICAL).
- `pages/` 디렉토리 만들지 마라. 이유: App Router만 사용 (ADR-003).
- `src/` 디렉토리 밖에 코드 두지 마라 (예: 루트의 `app/`). 이유: ARCHITECTURE.md §1 명시.
- `noUncheckedIndexedAccess`를 빼지 마라. 이유: ADR-009. LLM 응답 다룰 때 undefined 누락이 흔하다.
- 기존 `docs/`, `scripts/`, `phases/`, `CLAUDE.md`, `.git/`을 수정하거나 삭제하지 마라 (단, CLAUDE.md의 명령어 섹션만 §9 지시대로 갱신은 허용).
- 디자인 토큰, 컴포넌트, 라우트 페이지 본문 작성 금지. 이유: 본 step은 셋업만. 본격 UI는 step 3에서.
- 테스트 설정 금지. 이유: 본 step은 셋업만. 테스트 도구는 step 1에서.
- 기존 테스트를 깨뜨리지 마라 (현재 테스트 없음 — 새로 만든 lint/build만 통과시키면 됨).
