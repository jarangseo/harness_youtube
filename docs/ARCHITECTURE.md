# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx              # 메인: URL 입력 + 히스토리
│   ├── report/[id]/page.tsx  # 리포트 상세
│   ├── settings/page.tsx     # API key 관리
│   └── layout.tsx
├── components/
│   ├── UrlInput.tsx          # YouTube URL 입력 + 분석 트리거
│   ├── ProgressPanel.tsx     # 수집/분석 진행 상태
│   ├── ReportView.tsx        # 리포트 전체 레이아웃
│   ├── SentimentBar.tsx      # 긍정/중립/부정 비율 바
│   ├── TopicList.tsx         # 토픽 카드 리스트
│   ├── FeedbackSection.tsx   # 잘하는 점 / 개선점 / 액션
│   └── HistorySidebar.tsx    # 과거 리포트 리스트
├── types/
│   ├── report.ts             # Report, Comment, Topic 등 타입
│   └── api.ts                # YouTube/Claude 응답 타입
├── lib/
│   ├── storage.ts            # LocalStorage CRUD 래퍼
│   ├── youtube.ts            # videoId 추출, 댓글 fetch
│   ├── claude.ts             # Anthropic SDK 호출
│   ├── prompt.ts             # 분석 프롬프트 빌더
│   └── id.ts                 # 리포트 ID 생성 (nanoid)
└── services/
    └── analyze.ts            # 전체 파이프라인 오케스트레이션
```

## 패턴
- **모든 분석 로직은 클라이언트에서 실행** — BYOK 구조라 서버 라우트가 필요 없다. 페이지는 거의 모두 `"use client"`.
- **Server Components는 정적 셸 용도만** — layout, 빈 페이지 골격.
- **외부 API 호출은 `lib/`에 격리** — 컴포넌트는 `services/analyze.ts`만 호출.

## 데이터 흐름
```
[메인 페이지]
   사용자가 URL 입력
       ↓
[services/analyze.ts]
   1. lib/youtube.ts → videoId 추출 + 메타데이터 + 댓글 수집 (페이지네이션)
   2. lib/claude.ts → 댓글 배치를 Claude에 전달 → 분석 결과 JSON
   3. Report 객체 조립 + lib/storage.ts로 LocalStorage 저장
       ↓
[router.push("/report/{id}")]
   리포트 페이지가 LocalStorage에서 id로 조회해 렌더
```

## 데이터 모델
```ts
// types/report.ts
type Comment = {
  id: string;
  text: string;
  author: string;
  likeCount: number;
  publishedAt: string;
};

type Topic = {
  name: string;            // "편집 속도"
  sentiment: "positive" | "negative" | "mixed";
  count: number;
  examples: string[];      // 대표 댓글 인용 2~3개
};

type Report = {
  id: string;              // nanoid(10)
  createdAt: string;       // ISO
  video: {
    id: string;
    title: string;
    channelTitle: string;
    thumbnailUrl: string;
    publishedAt: string;
  };
  commentCount: number;
  sentiment: {
    positive: number;      // 0~1
    neutral: number;
    negative: number;
  };
  topics: Topic[];
  strengths: string[];     // 잘하는 점, 3~5개
  improvements: string[];  // 개선점, 3~5개
  actionItems: string[];   // 다음 영상에 적용할 제안, 3~5개
  summary: string;         // 2~3문장 총평
};
```

## 상태 관리
- 클라이언트 상태만 존재. `useState` / `useReducer` 만으로 충분.
- 분석 진행 상태는 단순 reducer (`idle | fetching_comments | analyzing | done | error`).
- LocalStorage 키:
  - `cm:settings` — API key들
  - `cm:reports` — `{[id]: Report}` 형태

## 외부 의존성
| 라이브러리 | 용도 |
|-----------|------|
| `next` 15 | App Router |
| `react` 19 | UI |
| `tailwindcss` 4 | 스타일 |
| `@anthropic-ai/sdk` | Claude 호출 (`dangerouslyAllowBrowser: true` 필요) |
| `nanoid` | 리포트 ID |
| `zod` | Claude 응답 JSON 검증 |

YouTube Data API는 SDK 없이 `fetch`로 직접 호출.

## 에러 처리
- API key 없음 → 설정 페이지로 강제 이동
- YouTube API 4xx → 사용자에게 메시지 그대로 표시 ("영상을 찾을 수 없습니다" / "댓글이 비활성화됨")
- Claude 응답 JSON 파싱 실패 → 1회 재시도, 그래도 실패 시 raw 응답 보여주고 중단
