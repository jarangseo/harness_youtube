# Architecture Decision Records

## 철학
MVP 속도와 운영 부담 최소화가 최우선. 사용자 수가 늘어도 내가 비용을 부담하지 않는 구조를 택한다. 서버 없음, DB 없음, 로그인 없음 — 모든 책임은 사용자 브라우저에.

---

### ADR-001: BYOK (사용자가 본인 API key 입력) 채택
**결정**: YouTube Data API key와 Anthropic API key를 사용자가 직접 발급받아 입력하고, LocalStorage에 저장한다.
**이유**:
- 서버가 필요 없어 정적 배포(Vercel static)만으로 운영 가능.
- 트래픽이 늘어도 내가 API 비용을 부담하지 않는다.
- 사용자가 본인 사용량을 직접 통제·확인할 수 있다.
**트레이드오프**: 사용자 온보딩이 무거워진다 (API key 2개 발급 절차). 기술에 익숙한 크리에이터만 쓸 수 있는 진입 장벽이 생긴다. → 설정 페이지에 발급 가이드 링크를 명확히 제공해 완화.

### ADR-002: Claude (Anthropic) 모델 선택
**결정**: 감정 분석 + 토픽 추출 + 피드백 생성 모두 Claude로 처리. 기본 모델은 `claude-haiku-4-5` (빠르고 저렴), 길이가 긴 종합 피드백 단계에서만 `claude-sonnet-4-6`로 업그레이드 옵션.
**이유**:
- 한국어 뉘앙스 처리에 강함 (한국 크리에이터 비중이 클 것으로 예상).
- Haiku 4.5는 댓글 수백 개 배치 분석에 비용 효율이 좋다.
- Anthropic SDK가 브라우저 직접 호출을 공식 지원 (`dangerouslyAllowBrowser`).
**트레이드오프**: BYOK 구조에서 사용자에게 OpenAI/Gemini 대신 Anthropic key를 요구 → key 발급 경험이 OpenAI보다 덜 익숙할 수 있음.

### ADR-003: Next.js App Router 채택 (서버 라우트는 사용하지 않음)
**결정**: Next.js 15 App Router + Tailwind 4. 모든 페이지는 `"use client"`. 서버 컴포넌트는 레이아웃 셸로만 사용. `next.config.ts`에서 `output: "export"`로 정적 배포.
**이유**:
- 향후 serverless function 도입(예: 공유 링크, 결제)이 필요해질 때 가장 매끄럽게 확장 가능.
- 파일 기반 라우팅, 빌트인 코드 스플리팅 등 기본기가 좋다.
**트레이드오프**: 순수 Vite + React 대비 빌드가 무겁고, 정적 배포만 할 거라면 Next.js의 절반 이상은 안 쓰게 된다. 하지만 학습 곡선과 확장성 측면에서 이득이 크다고 판단.

### ADR-004: LocalStorage를 유일한 저장소로 사용
**결정**: API key, 분석 리포트, 설정 모두 LocalStorage. IndexedDB는 사용하지 않는다.
**이유**: 리포트 한 건이 평균 5~20KB 수준이라 LocalStorage 5MB 한도 안에서 수백 건 저장 가능. API가 단순(`getItem/setItem`)해서 래퍼 코드가 짧다.
**트레이드오프**: 브라우저/기기 간 동기화 불가. 사용자가 캐시 지우면 전부 사라짐. → 리포트 JSON 다운로드/업로드 기능을 백업 수단으로 제공 (Phase 2).

### ADR-005: 답글(reply) 분석 제외, top-level 댓글만 사용
**결정**: YouTube `commentThreads.list`에서 `topLevelComment`만 수집. `replies`는 무시.
**이유**: 답글은 대부분 크리에이터 본인이거나 댓글러끼리의 대화라 피드백 신호가 약하다. API 쿼터도 절약된다.
**트레이드오프**: 답글에 있는 보석 같은 피드백을 놓칠 수 있다. → 사용자가 명시적으로 "답글까지 포함" 옵션을 켤 수 있게 Phase 2에서 고려.

### ADR-006: 댓글 수집 상한 500개
**결정**: 한 영상당 최대 500개 댓글까지만 수집. 정렬은 `relevance` (YouTube 기본).
**이유**:
- 500개면 토픽/감정 분포가 통계적으로 안정된다.
- YouTube API 페이지네이션 5회 (페이지당 100개) → 쿼터 5 unit, 충분히 가볍다.
- Claude 입력 토큰도 합리적인 범위 (대략 30~60K tokens).
**트레이드오프**: 댓글 수천 개짜리 대형 영상에서는 long-tail 의견을 놓칠 수 있음.
