# UI 디자인 가이드

## 디자인 원칙
1. **도구처럼 보여야 한다.** 마케팅 페이지가 아니라 매일 쓰는 대시보드 톤. 환영 배너, 큰 히어로 카피, 데모 영상 없음.
2. **숫자와 인용이 주인공.** 차트는 보조. 댓글 원문 인용이 가장 강력한 증거다.
3. **색은 데이터에만 쓴다.** 브랜드 색상으로 화면을 칠하지 않는다. 색이 보이면 그건 의미 있는 데이터(긍정/부정)다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | `#0a0a0a` |
| 카드 | `#141414` |
| 입력/호버 | `#1a1a1a` |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 (제목, 숫자) | `text-white` |
| 본문 | `text-neutral-300` |
| 보조 (라벨, 메타) | `text-neutral-400` |
| 비활성 | `text-neutral-500` |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 긍정 (positive) | `#22c55e` (green-500) |
| 부정 (negative) | `#ef4444` (red-500) |
| 중립 (neutral) | `#525252` (neutral-600) |
| 강조 (CTA) | `#ffffff` 배경 + 검은 텍스트 |

## 컴포넌트
### 카드
```
rounded-lg bg-[#141414] border border-neutral-800 p-6
```

### 버튼
```
Primary: rounded-lg bg-white text-black hover:bg-neutral-200 px-4 py-2 text-sm font-medium
Secondary: rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-900 px-4 py-2 text-sm
Text: text-neutral-500 hover:text-neutral-300
```

### 입력 필드
```
rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none
```

### 감정 바 (SentimentBar)
- 가로 stacked bar, 높이 6px (`h-1.5`)
- 색상: 긍정 → 중립 → 부정 순서, 색은 위 시맨틱 색상 사용
- 라벨은 바 아래 `text-xs text-neutral-400`로 "긍정 64% · 중립 22% · 부정 14%"

### 인용구 (댓글 인용)
```
border-l-2 border-neutral-700 pl-3 text-sm text-neutral-300 italic
```

## 레이아웃
- 전체 너비: `max-w-5xl mx-auto`
- 사이드바: 좌측 `w-64`, 본문 영역 `flex-1`
- 정렬: 좌측 정렬 기본. 중앙 정렬은 빈 상태(empty state)만.
- 간격: 카드 내부 `space-y-4`, 섹션 간 `space-y-8`, 페이지 패딩 `px-6 py-8`

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-3xl font-semibold text-white` |
| 섹션 제목 | `text-lg font-medium text-white` |
| 카드 라벨 | `text-xs uppercase tracking-wide text-neutral-500` |
| 본문 | `text-sm text-neutral-300 leading-relaxed` |
| 큰 숫자 (감정 비율 등) | `text-4xl font-semibold tabular-nums text-white` |

## 애니메이션
- `fade-in` (0.3s) — 리포트 로드 시 카드 등장
- 진행 인디케이터: 단순 점멸 점 3개 (`animate-pulse` 활용)
- 그 외 모든 애니메이션 금지 (호버 색상 변화는 transition 150ms까지만 허용)

## 아이콘
- SVG 인라인, `strokeWidth={1.5}`, `size={16}` 기본
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다
- 아이콘 색은 항상 텍스트 색을 상속 (`currentColor`)

## 리포트 페이지 레이아웃 (참고)
```
┌─────────────────────────────────────────────────┐
│ [영상 썸네일] 영상 제목                          │
│              채널명 · 게시일 · 댓글 N개          │
├─────────────────────────────────────────────────┤
│ 총평 (2~3문장)                                   │
├─────────────────────────────────────────────────┤
│ 감정 분포  ████████░░░░░  긍정 64% · 부정 14%   │
├─────────────────────────────────────────────────┤
│ 잘하는 점          │  개선점                     │
│ • ...              │  • ...                      │
│ • ...              │  • ...                      │
├─────────────────────────────────────────────────┤
│ 자주 언급된 주제 (토픽 카드 그리드 2열)          │
├─────────────────────────────────────────────────┤
│ 다음 영상 액션 아이템                            │
│ 1. ...                                          │
│ 2. ...                                          │
└─────────────────────────────────────────────────┘
```
