# 프로젝트: 댓글거울 (Comment Mirror)

YouTube 영상 URL을 받아 댓글을 감정 분석하고, 크리에이터에게 "잘하는 점 / 개선점 / 다음 영상 액션"을 리포트로 제공하는 클라이언트 전용 웹 앱.

## 기술 스택
- Next.js 15 (App Router, `output: "export"` 정적 배포)
- TypeScript strict mode
- Tailwind CSS 4
- `@anthropic-ai/sdk` (브라우저 직접 호출, `dangerouslyAllowBrowser: true`)
- YouTube Data API v3 (fetch 직접)
- LocalStorage 단일 저장소

## 아키텍처 규칙
- CRITICAL: 백엔드/서버 라우트를 만들지 않는다. 모든 외부 API 호출은 브라우저에서 직접 (BYOK).
- CRITICAL: API key는 LocalStorage에만 저장하고, 절대 로그/콘솔/네트워크 페이로드로 노출하지 않는다.
- CRITICAL: 외부 API 호출 로직은 `lib/`에 격리. 컴포넌트는 `services/analyze.ts`만 호출한다.
- 페이지는 기본적으로 `"use client"`. 서버 컴포넌트는 레이아웃 셸로만 사용.
- Claude 응답은 항상 zod로 스키마 검증 후 사용한다 (raw 신뢰 금지).

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식 (feat:, fix:, docs:, refactor:, test:)
- UI 변경은 `docs/UI_GUIDE.md`의 안티패턴 표를 반드시 확인 후 진행

## 명령어
```
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (정적 export)
npm run lint     # ESLint
npm run test     # Vitest
```

## 참고 문서
- `docs/PRD.md` — 제품 목표 및 사용자
- `docs/ARCHITECTURE.md` — 디렉토리, 데이터 모델, 흐름
- `docs/ADR.md` — 주요 기술 결정과 그 이유
- `docs/UI_GUIDE.md` — 디자인 시스템과 AI 슬롭 안티패턴
