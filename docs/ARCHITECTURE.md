# 아키텍처

## 1. 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                    # 메인: URL 입력 + 히스토리
│   ├── report/[id]/page.tsx        # 리포트 상세
│   ├── settings/page.tsx           # API key 관리
│   ├── onboarding/page.tsx         # 첫 방문 안내
│   └── layout.tsx
├── components/
│   ├── url/UrlInput.tsx            # YouTube URL 입력
│   ├── url/VideoPreview.tsx        # 메타데이터 + 예상 비용 미리보기
│   ├── progress/ProgressPanel.tsx  # 단계별 진행 상태
│   ├── progress/CancelButton.tsx
│   ├── report/ReportView.tsx
│   ├── report/SentimentBar.tsx
│   ├── report/TopicCard.tsx
│   ├── report/FeedbackList.tsx
│   ├── report/QuoteBlock.tsx
│   ├── history/HistorySidebar.tsx
│   ├── settings/ApiKeyField.tsx
│   └── ui/                          # 원자 컴포넌트 (Button, Input, Card)
├── types/
│   ├── report.ts                   # Report, Comment, Topic 도메인 타입
│   ├── api.ts                      # YouTube/Claude raw 응답 타입
│   └── progress.ts                 # 진행 상태 머신 타입
├── lib/
│   ├── storage/
│   │   ├── reports.ts              # Report CRUD
│   │   ├── settings.ts             # API key CRUD
│   │   ├── quota.ts                # LocalStorage 한도 추적
│   │   └── migrations.ts           # 스키마 버전 마이그레이션
│   ├── youtube/
│   │   ├── parseUrl.ts             # URL → videoId
│   │   ├── getVideo.ts             # videos.list
│   │   ├── getComments.ts          # commentThreads.list (페이지네이션)
│   │   └── errors.ts               # YouTube 에러 → 사용자 메시지 매핑
│   ├── claude/
│   │   ├── client.ts               # Anthropic SDK 래퍼
│   │   ├── prompts.ts              # system / user 프롬프트 빌더
│   │   ├── schemas.ts              # zod 응답 스키마
│   │   └── costEstimate.ts         # 토큰 추정 + 비용 계산
│   ├── pipeline/
│   │   ├── normalizeComment.ts     # 댓글 정규화 (URL/멘션/공백)
│   │   ├── filterSpam.ts           # 스팸 휴리스틱
│   │   ├── batchComments.ts        # 청크 분할
│   │   └── reducer.ts              # 진행 상태 머신
│   ├── id.ts                       # nanoid 래퍼
│   ├── retry.ts                    # exponential backoff
│   ├── lock.ts                     # 동시 분석 방지
│   └── logger.ts                   # devmode 로깅 (key 마스킹 포함)
└── services/
    └── analyze.ts                  # 전체 파이프라인 오케스트레이션
```

## 2. 패턴
- **모든 분석은 클라이언트.** BYOK 구조라 서버 라우트 없음. 페이지 컴포넌트 대부분 `"use client"`.
- **Server Component는 정적 셸 전용** — 레이아웃, 빈 페이지 골격, SEO 메타데이터.
- **외부 API는 `lib/<provider>/`에 격리.** 컴포넌트는 절대 직접 `fetch`하지 않는다. `services/analyze.ts`를 통해서만 호출.
- **응답 검증은 zod.** Claude 응답 JSON은 반드시 zod 스키마로 검증 후 사용. raw JSON 신뢰 금지.
- **에러는 도메인 타입으로.** `Result<T, AnalyzeError>` 패턴. throw는 진짜 예외 상황만.

## 3. 분석 파이프라인 (전체 흐름)

```
[메인 페이지]
    ↓ 사용자가 URL 입력
[1. URL 검증]              ─ lib/youtube/parseUrl.ts
    ↓ videoId 추출
[2. 영상 메타데이터 fetch]  ─ lib/youtube/getVideo.ts
    ↓ 제목/썸네일/댓글 활성화 여부 확인
[3. 사용자 확인]           ─ 예상 비용 표시, "분석 시작" 클릭
    ↓
[4. 댓글 수집]             ─ lib/youtube/getComments.ts
    ↓ 100개씩 페이지네이션, 최대 500개
[5. 정규화 + 스팸 필터]    ─ lib/pipeline/normalizeComment.ts, filterSpam.ts
    ↓
[6. 배치 분할]             ─ lib/pipeline/batchComments.ts (100개씩 청크)
    ↓
[7. Claude 분석 (병렬)]    ─ lib/claude/client.ts
    ↓ 각 청크: sentiment + topics 추출
[8. 종합 분석 (단일 호출)] ─ lib/claude/client.ts
    ↓ 청크 결과 + 비디오 메타 → strengths/improvements/actions
[9. 응답 검증]             ─ lib/claude/schemas.ts (zod)
    ↓
[10. Report 객체 조립]
    ↓
[11. LocalStorage 저장]    ─ lib/storage/reports.ts
    ↓
[12. /report/[id] 이동]
```

각 단계는 `progress` 머신의 한 상태로 표현되며, 사용자는 현재 단계와 진행률(N/M)을 본다.

## 4. 진행 상태 머신

```ts
type ProgressState =
  | { kind: "idle" }
  | { kind: "validating_url" }
  | { kind: "fetching_video" }
  | { kind: "fetching_comments"; fetched: number; estimatedTotal: number }
  | { kind: "normalizing"; processed: number; total: number }
  | { kind: "analyzing_batches"; completed: number; total: number }
  | { kind: "synthesizing" }
  | { kind: "persisting" }
  | { kind: "done"; reportId: string }
  | { kind: "cancelled" }
  | { kind: "error"; error: AnalyzeError };
```

상태 머신은 `lib/pipeline/reducer.ts`에서 관리. `services/analyze.ts`가 dispatch.

## 5. 데이터 모델

```ts
// types/report.ts

export const REPORT_SCHEMA_VERSION = 1;

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";

export type Comment = {
  id: string;             // YouTube comment id
  text: string;           // 원문 (HTML decoded)
  textNormalized: string; // 정규화된 본문 (URL/멘션 제거)
  author: string;         // 표시는 마스킹된 형태로
  likeCount: number;
  publishedAt: string;    // ISO
  isSpam: boolean;        // 스팸 휴리스틱 결과
};

export type Topic = {
  name: string;
  sentiment: Sentiment;
  count: number;          // 이 토픽이 언급된 댓글 수
  examples: Array<{
    commentId: string;
    quote: string;        // 원문 그대로 (LLM이 지어내면 안 됨, 검증 필요)
  }>;
};

export type Report = {
  schemaVersion: number;       // REPORT_SCHEMA_VERSION
  id: string;                  // nanoid(10)
  createdAt: string;           // ISO
  video: {
    id: string;
    title: string;
    channelTitle: string;
    thumbnailUrl: string;
    publishedAt: string;
    durationSeconds: number;
  };
  stats: {
    totalComments: number;     // YouTube가 보고한 전체 댓글 수
    fetchedComments: number;   // 실제 수집한 수
    analyzedComments: number;  // 스팸 필터 후 분석에 쓰인 수
    spamFiltered: number;
  };
  sentiment: {
    positive: number;          // 0~1
    neutral: number;
    negative: number;
  };
  topics: Topic[];
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  summary: string;
  cost: {
    inputTokens: number;
    outputTokens: number;
    estimatedUsd: number;
  };
  modelUsed: string;           // "claude-haiku-4-5"
};
```

## 6. Claude 프롬프트 설계

### 6.1 단계 A — 청크별 분석 (병렬 호출, 모델: claude-haiku-4-5)
- **system 프롬프트** (캐시 가능, 모든 청크에서 동일):
  - 역할 정의: "YouTube 댓글 분석 어시스턴트"
  - 작업: sentiment 분류 + 토픽 후보 추출
  - 출력 형식: 엄격한 JSON 스키마 명시
  - 금지: 댓글 원문을 변형하거나 새로 지어내지 말 것
- **user 프롬프트**: 댓글 100개를 번호 매겨서 전달
- **응답 스키마**:
  ```ts
  z.object({
    perComment: z.array(z.object({
      id: z.string(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      topics: z.array(z.string()), // 토픽 이름만
    })),
    topicCandidates: z.array(z.object({
      name: z.string(),
      commentIds: z.array(z.string()),
    })),
  })
  ```
- **temperature**: 0.2 (결정성 우선)
- **max_tokens**: 4000

### 6.2 단계 B — 종합 (단일 호출, 모델: claude-sonnet-4-6)
- 입력: 청크별 결과 + 비디오 메타 + 대표 댓글 인용 후보
- 출력: strengths / improvements / actionItems / summary / 최종 topics
- 인용은 `commentId` 참조로만 받고, 클라이언트에서 원문 매핑
- **응답 스키마**: `Report`에서 `video`/`stats`/`sentiment`/`cost`/`modelUsed` 제외한 부분
- **temperature**: 0.3
- **max_tokens**: 2000

### 6.3 프롬프트 캐싱
- 단계 A의 system 프롬프트는 `cache_control: ephemeral`로 캐싱
- 같은 사용자가 여러 영상을 연속 분석 시 비용 절감

### 6.4 인용 검증 (hallucination 방지)
- LLM이 반환한 `commentId`가 실제 수집한 댓글 ID 집합에 존재하는지 검증
- 없는 ID 참조 시: 해당 인용 제외 + 디버그 로그 (사용자에게는 노출 안 함)

## 7. 댓글 정규화

`lib/pipeline/normalizeComment.ts`:

```ts
// 1. HTML 디코딩 (&amp; → &)
// 2. URL 제거 (http(s)://... → [link])
// 3. @멘션 제거 (@username → [user])
// 4. 연속 공백 1개로 축소
// 5. 1000자 초과 시 잘라냄 (Claude 토큰 절약)
// 6. 빈 문자열은 분석 대상에서 제외
```

원문(`text`)은 보존하고, 정규화 본문(`textNormalized`)을 별도 필드로 저장. 인용은 항상 원문 사용.

## 8. 스팸 필터 (휴리스틱)

`lib/pipeline/filterSpam.ts`. 다음 중 2개 이상 해당 시 스팸 추정:

- "구독", "맞구독", "구독자", "팔로우" 키워드 포함 + 본문 30자 이하
- 같은 이모지 5개 이상 연속 반복
- URL 2개 이상 포함
- 같은 댓글 작성자의 다른 댓글이 분석 영상 댓글 중 5개 이상 (도배)
- 본문 90% 이상이 비ASCII 특수문자

스팸은 분석에서 제외하지만 카운트는 `stats.spamFiltered`로 보존.

## 9. 배치 / 토큰 / 비용 추정

| 항목 | 값 |
|------|-----|
| 청크 크기 | 100개 댓글 |
| 청크 수 (500 댓글 기준) | 5개 |
| 청크당 평균 입력 토큰 | ~6,000 (댓글 평균 60토큰 가정) |
| 청크당 평균 출력 토큰 | ~1,500 |
| 종합 단계 입력 토큰 | ~5,000 |
| 종합 단계 출력 토큰 | ~1,200 |
| 총 토큰 (입력 + 출력) | ~45,000 |
| Haiku 4.5 단가 (가정) | $1/MTok in, $5/MTok out |
| 예상 비용 (500 댓글) | $0.03~$0.05 |

수치는 가정이며 실제 단가 변동 시 `lib/claude/costEstimate.ts`에서 조정.

## 10. 재시도 / 백오프

`lib/retry.ts`:

```ts
retry(fn, {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoff: "exponential", // 500 → 1000 → 2000
  jitter: 0.3,            // ±30% 랜덤
  retryOn: (err) => isTransient(err), // 5xx, 429, network
});
```

- 429 (rate limit) → `Retry-After` 헤더 존중
- 401/403 → 즉시 실패 (재시도 무의미)
- 4xx (404 등) → 즉시 실패
- 5xx, 네트워크 에러 → 재시도

## 11. Rate Limit 처리

### 11.1 YouTube Data API
- 무료 일일 쿼터 10,000 unit
- `commentThreads.list` = 1 unit/호출, `videos.list` = 1 unit/호출
- 영상 1개 분석 ≈ 6 unit (videos + comments × 5 페이지)
- 사용자가 하루 1,500회 분석 가능 (충분)
- 쿼터 초과 응답(403, `quotaExceeded`) → 사용자에게 명확한 메시지 + 다음날 안내

### 11.2 Anthropic API
- 사용자 본인의 tier에 따라 RPM/TPM 다름
- 429 응답 시 `retry-after-ms` 헤더 기반 대기 후 재시도
- 청크 병렬 호출 시 동시성 제한: 최대 3개 동시 (`Promise.allSettled` + concurrency limit)

## 12. 동시 실행 방지

`lib/lock.ts`:
- LocalStorage `cm:in_progress`에 `{ videoId, startedAt }` 기록
- 분석 시작 전 lock 확인 → 5분 이내 진행 중인 분석이 있으면 거부
- 완료/실패/취소 시 lock 해제
- 타임아웃 5분 — 비정상 종료된 lock은 만료 후 자동 무시

## 13. 분석 취소

- `AbortController` 인스턴스를 파이프라인 진입 시 생성
- 모든 fetch 호출에 `signal` 전달
- Anthropic SDK 호출은 `AbortError`로 중단
- 취소 시: 부분 결과 폐기, lock 해제, 상태 `cancelled`로 전이

## 14. LocalStorage 관리

`lib/storage/quota.ts`:

- 사용량 추적: `navigator.storage.estimate()`로 주기적 측정 (지원 브라우저에서)
- 폴백: 모든 키 합산 byte 길이 계산
- 5MB의 80% 도달 시: 사용자에게 알림 + 가장 오래된 리포트 5개 자동 후보 제시
- 5MB 한도 도달 시: 새 분석 차단, "이전 리포트를 삭제해주세요" 모달

저장 키 구조:
```
cm:settings              # { youtubeKey, anthropicKey, ... } (key는 평문 — LocalStorage 한계)
cm:reports               # { [reportId]: Report }
cm:reports:index         # [{ id, createdAt, videoTitle }] (사이드바용 경량 인덱스)
cm:in_progress           # 현재 진행 중 lock
cm:schema_version        # 1
```

`cm:reports:index`를 별도로 두는 이유: 사이드바 렌더에 전체 리포트 본문을 파싱할 필요 없음.

## 15. 스키마 마이그레이션

`lib/storage/migrations.ts`:
- 앱 시작 시 `cm:schema_version` 확인
- 현재 버전보다 낮으면 순차 마이그레이션 적용
- 마이그레이션 실패 시: 백업 키(`cm:reports:backup_v{n}`)에 원본 보관 후 진행
- 향후 `Report` 구조 변경 시 새 버전 + migration 함수 추가

## 16. 보안

### 16.1 API key 보호
- LocalStorage에 평문 저장 (브라우저 환경의 한계)
- 메모리 노출 최소화: 사용 시점에만 읽고, 변수에 오래 보관하지 않음
- 절대 콘솔 로그에 출력 안 함 — `lib/logger.ts`에서 key 패턴(`sk-ant-...`, `AIza...`) 자동 마스킹
- 에러 메시지에 key가 포함되면 마스킹 후 표시
- 네트워크 요청 페이로드/URL에 key 포함 안 함 (Authorization 헤더만)

### 16.2 XSS
- 댓글 본문은 React 기본 이스케이프로 충분 (절대 `dangerouslySetInnerHTML` 금지)
- 사용자가 입력하는 URL은 영상 임베드에 사용하지 않음 (썸네일만)
- Claude 응답의 문자열도 React 이스케이프 신뢰

### 16.3 CSP
- `next.config.ts`에서 CSP 헤더 (정적 export 시 메타 태그로):
  - `default-src 'self'`
  - `connect-src 'self' https://www.googleapis.com https://api.anthropic.com`
  - `img-src 'self' https://i.ytimg.com data:`
  - `script-src 'self'`
  - `style-src 'self' 'unsafe-inline'` (Tailwind JIT 대응)

## 17. 에러 분류 및 사용자 메시지

```ts
type AnalyzeError =
  | { kind: "invalid_url"; message: string }
  | { kind: "video_not_found"; videoId: string }
  | { kind: "video_private" }
  | { kind: "video_live" }
  | { kind: "comments_disabled" }
  | { kind: "no_comments" }
  | { kind: "youtube_quota_exceeded"; resetAt?: string }
  | { kind: "youtube_key_invalid" }
  | { kind: "anthropic_key_invalid" }
  | { kind: "anthropic_rate_limit"; retryAfterMs?: number }
  | { kind: "anthropic_overloaded" }
  | { kind: "schema_validation"; details: string }
  | { kind: "storage_full"; bytesUsed: number }
  | { kind: "concurrent_analysis"; videoId: string }
  | { kind: "network"; cause: string }
  | { kind: "cancelled" }
  | { kind: "unknown"; cause: unknown };
```

각 종류마다 `lib/youtube/errors.ts` / `lib/claude/errors.ts`에서 사용자용 한국어 메시지 매핑.

## 18. 로깅 / 디버깅

`lib/logger.ts`:
- 개발 환경 (`process.env.NODE_ENV === "development"`) 에서만 `console.log` 출력
- 프로덕션에서는 `console.error`만 (사용자 디버깅 지원)
- 모든 로그는 key 마스킹 필터 통과
- 진행 단계 / 청크 응답 / 비용을 디버그 콘솔에서 확인 가능

## 19. 테스트 전략

| 레벨 | 도구 | 범위 |
|------|------|------|
| 단위 | Vitest | `lib/*` 순수 함수 (URL 파싱, 정규화, 스팸 필터, 토큰 추정) |
| 단위 | Vitest | 진행 상태 reducer |
| 단위 | Vitest | zod 스키마 (유효/무효 응답 케이스) |
| 컴포넌트 | Vitest + Testing Library | 주요 컴포넌트 렌더 + 인터랙션 |
| 통합 | Vitest + MSW | 파이프라인 (YouTube/Anthropic 모킹) |
| E2E | (Phase 2) | Playwright — 실제 키로 실 영상 분석 1건 |

목표 커버리지:
- `lib/` 90% 이상
- `services/analyze.ts` 80% 이상
- 컴포넌트 핵심 시나리오 (행복 경로 + 에러 경로 2개)

## 20. 빌드 / 배포

- `next.config.ts`: `output: "export"`, `images.unoptimized: true`
- `pnpm build` → `out/` 정적 디렉토리
- Vercel 정적 호스팅 또는 GitHub Pages
- CI: GitHub Actions
  - `pnpm install`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - PR 미리보기 배포 (Vercel 자동)
  - main 머지 시 프로덕션 배포

## 21. 성능 최적화

- 메인 페이지 코드 스플리팅: `report/[id]` 라우트는 dynamic import
- 사이드바 가상 스크롤 (리포트 1,000개 이상 시) — 1차에는 불필요
- 이미지: `i.ytimg.com` 썸네일은 `loading="lazy"`
- Tailwind 4 JIT으로 사용된 클래스만 번들

## 22. 접근성

- 모든 인터랙티브 요소에 visible focus ring
- 진행 상태 변화는 `aria-live="polite"` 영역에 텍스트 출력
- 색상에만 의존한 정보 전달 금지 (감정 바에는 텍스트 라벨 병기)
- `prefers-reduced-motion: reduce`에 fade-in 끔
- 키보드 단축키: `Cmd/Ctrl + Enter`로 분석 시작

## 23. 외부 의존성

| 라이브러리 | 용도 | 버전 |
|-----------|------|------|
| next | App Router | 15.x |
| react | UI | 19.x |
| tailwindcss | 스타일 | 4.x |
| @anthropic-ai/sdk | Claude 호출 | latest |
| nanoid | ID 생성 | 5.x |
| zod | 스키마 검증 | 3.x |
| vitest | 단위 테스트 | 1.x |
| @testing-library/react | 컴포넌트 테스트 | latest |
| msw | API 모킹 | 2.x |

YouTube Data API는 SDK 없이 `fetch` 직접.
