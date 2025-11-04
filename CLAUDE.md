# DayStep 프로젝트 작업 관리 규칙

## 스키마 검증: Supabase MCP로 확인
## 절대 원칙
1. **화면/페이지/프론트엔드/백엔드 개발, 문제 해결, 수정, 바꾸기, 할일/작업 목록/계획 생성 및 오류 메시지 해결 및 모든 작업은 시 task-planner 서브 에이전트 사용 해서 TASKS.md 생성 필수**
2. 작업 시작 전 TASKS.md 반드시 확인
3. 할당된 서브 에이전트 사용 (TASKS.md "Assigned" 확인)
4. 작업 진행/완료 시 즉시 TASKS.md 업데이트
5. Phase 순서 및 의존성 준수
6.모든 작업은 TASKS.md 파일을 중심으로 진행합니다.
7.작업은 한국어로 진행하세요. 커밋 메시지도 한국어로 생성하세요.
8.커밋하기 전에 사용자에게 커밋 할지 확인 질문 하세요.

---

## 작업 진행 프로토콜

### 작업 시작 전
1. TASKS.md 읽기
2. 우선순위 및 의존성 파악
3. 할당된 서브 에이전트 확인 (TASKS.md의 "Assigned" 참조)

### 새로운 작업 목록 생성 시
- **새로운 주제의 작업 목록화 요청 시**, 기존 TASKS.md 파일 처리 방법을 사용자에게 확인:
  1. "기존 TASKS.md 파일이 있습니다. 어떻게 처리하시겠습니까?"
  2. 선택지 제공:
     - **새로 생성**: 기존 내용 삭제하고 새로운 작업 목록 생성
     - **추가**: 기존 작업 목록에 새로운 작업 추가
     - **유지**: 기존 작업 완료 후 새로운 작업 시작
  3. 사용자 응답에 따라 처리

### 작업 진행 중
- **작업 시작 시**: 체크박스 `[ ]` → `[-]` 변경 (진행 중 표시)
- **작업 완료 시**:
  - 체크박스 `[-]` → `[x]` 변경
  - 완료 날짜 추가: `(담당: 에이전트명) - YYYY-MM-DD`
  - 필요한 경우 추가 정보 기록 (선택사항):
    - 수정 파일 경로
    - 주요 변경 사항

**작업 상태 표시**:
- `[ ]` - 계획된 작업 (아직 시작 안함)
- `[-]` - 진행 중인 작업
- `[x]` - 완료된 작업

### Phase 순서 준수
- Phase 순차 진행 (N → N+1)
- Dependencies 확인 필수
- 우선순위: 높음 > 중간 > 낮음

**참고**: TASKS.md 파일 구조 및 섹션 구성은 `.claude/agents/task-planner.md`에 정의되어 있습니다.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Capacitor 7
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

## 환경 설정

`.env.example` → `.env.local`:

## MCP 서버

`.mcp.json` 참조:
- **taskmaster-ai**: 작업 관리 자동화
- **perplexity-ask**, **context7**: 코드 리서치, 문서 검색
- **playwright**: 브라우저 자동화, UI 테스트
- **supabase**: 데이터베이스 관리

## 핵심 아키텍처 패턴

### 환경별 빌드 시스템 (중요)
- **웹**: `BUILD_TARGET=web` → standalone 모드, SSR 지원
- **모바일**: `BUILD_TARGET=mobile` → export 모드, Capacitor WebView 최적화
- **StrictMode**: 모든 환경에서 OFF (웹: 개발 편의성, 모바일: WebView 안정성)

### 인증 시스템
- **웹**: Supabase Auth + OAuth (Google, Kakao)
- **모바일**: Capacitor 플러그인 + JWT 토큰
- **백업**: Capacitor Preferences (key: `supabase_auth_session`)


### 상태 관리 (Zustand)
- `todoStore`: Todo CRUD, optimistic updates
- `timelineStore`: 타임라인 뷰 상태
- `authStore`: 인증 상태, 사용자 정보
- `settingsStore`: 앱 설정

### 주요 라이브러리
- **DnD**: @dnd-kit
- **날짜**: date-fns, date-fns-tz
- **애니메이션**: framer-motion
- **UI**: shadcn/ui + Tailwind + DaisyUI
- **알림**: Capacitor Local Notifications

## Task Master AI

`.taskmaster/CLAUDE.md` 참조 - 작업 관리 워크플로우 및 명령어

---

## Claude Code 개발 가이드

### 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**

---

## 🚨 공통 패턴 (절대 원칙)

### 1. 🌐 환경별 개발 가이드

**절대 금지**:
- ❌ 한 환경의 빌드 오류로 다른 환경 코드 삭제/수정
- ❌ 모바일 오류 → 웹 코드 수정 | 웹 오류 → 모바일 코드 수정

**반응형 우선 (Tailwind) - 권장**:
- ✅ UI 크기/간격/폰트 → `className="w-20 sm:w-16"` (DevTools 테스트 가능)
- ✅ Breakpoint: `max-sm:` (< 640px), `sm:` (≥ 640px), `md:` (≥ 768px), `lg:` (≥ 1024px)

**BUILD_TARGET - 제한적**:
- ⚠️ Capacitor 전용, SSR 분기만 → `{process.env.BUILD_TARGET === 'mobile' && ...}`
- ⚠️ DevTools 불가, 실제 빌드 필요

| 요구사항 | 사용 패턴 |
|---------|---------|
| 화면 크기별 UI | Tailwind Responsive |
| Capacitor 네이티브 | BUILD_TARGET |

### 2. 📚 외부 리소스 활용

**MCP 선택**: 라이브러리 명시? → Context7만 | 미정 → Perplexity → Context7

**예외 조건** (모두 만족 시만 커스텀):
- [ ] MCP로 적합한 라이브러리 없음
- [ ] 환경 호환성 문제 확인
- [ ] 요구사항 매우 특수
- [ ] 성능상 커스텀 필수

### 3. ♻️ 코드 재사용 우선

- 중복 150줄+ → 컴포넌트 추출
- 유사 로직 2곳+ → 공통 함수/Hook
- 새 기능 전 유사 코드 탐색

---

## 🎨 프론트엔드 개발 패턴

### 스타일 규칙

| 항목 | 사용 ✅ | 금지 ❌ |
|------|--------|---------|
| 색상 | `bg-primary`, `bg-accent` | `bg-purple-500`, `bg-[#3B82F6]` |
| 버튼 | `btn-ghost`, `btn-soft` | `btn-outline` |
| 아이콘 | Lucide React | 이모지 |
| 효과 | - | 그라디언트 |

### UI 컴포넌트 패턴

| 패턴 | 규칙 |
|------|------|
| 아이콘 컨테이너 | `rounded-full`, 테두리 없음, `text-white` |
| 액션 버튼 | `rounded-full` (pill shape) |
| 아이콘 전용 버튼 | `btn-circle` |
| 아코디언 | `bg-transparent hover:opacity-80` |

### 아이콘 + 제목 입력 (편집 모달)

| 요소 | 스타일 |
|------|--------|
| 아이콘 버튼 | `w-12 h-12 rounded-lg bg-[#f3f4f6]` |
| 색상 인디케이터 | `w-5 h-5 rounded-full absolute -bottom-1 -left-1` |
| 입력 필드 | `border-0 border-b-2 text-[20px] font-semibold` |

### 폼 섹션 (편집 모달)

- 컨테이너: `my-4`
- 제목: `flex items-center gap-3 text-lg font-semibold mb-3`
- 래퍼: `p-3 rounded-lg bg-base-200 border border-base-300`

### 모달 패턴

**DaisyUI dialog 우선**:
- 구조: `<dialog open>` + `modal-box` + `modal-backdrop`
- 헤더: 취소(좌)-제목(중)-삭제-저장(우), 모두 `rounded-full`
- 패딩: `pt-[30px] sm:pt-2` (헤더), `px-3` (양쪽)
- Capacitor: `useModalStore`로 하단 네비 자동 숨김

**기존 react-modal-sheet**: 점진적 마이그레이션 (14개 파일)

### 즉시 생성 패턴

- 추가 버튼 → DB 즉시 생성 + spinner

---

## 🔧 백엔드 개발 패턴

### 인증

- `useAuth()` Hook → userId 파라미터 전달
- Store에서 `getState().user?.id` 직접 호출 금지
- Capacitor 백업: Preferences (`supabase_auth_session`)

### DB 접근

- `supabaseWebViewHelper.ts` JWT 방식만
- `supabase.from()` 직접 호출 금지
- DB 필터링: 서버에서만 (클라이언트 중복 금지)
- 스키마 검증: Supabase MCP로 확인

### 상태 관리

- `Object.assign(state.optimisticState, {...})`
- Optimistic updates 적용

---

## 🔄 개발 워크플로우

### 표준 5단계

1. 요구사항 분석
2. 라이브러리 탐색 (Perplexity MCP)
3. 공식 문서 확인 (Context7 MCP)
4. 기존 패턴 탐색 (`components/ui/`, DaisyUI)
5. 구현 및 검증 (웹/모바일 테스트)

---

## ✅ 품질 관리

### 작업 완료 체크리스트

1. [ ] 코드 작성 완료
2. [ ] 기능 테스트 수행
3. [ ] 사용자 검증 요청
4. [ ] git commit
5. [ ] 다음 작업 시작

### 2회 실패 시

→ Perplexity/Context7 MCP 사용 (근본 원인 분석, deprecated 확인)

### 자동 경고 트리거

| 트리거 | 조치 |
|--------|------|
| 구버전 패턴 | Context7 최신 패턴 확인 |
| 신규 라이브러리 | 호환성 확인 (React 19, Next.js 15) |
| 위험 컴포넌트 | 테스트 필수 (전역 상태, 인증, 네이티브 브리지 등) |

---

## 📚 기타 가이드

### 쉬운 설명 규칙

**트리거**: 기술 용어, 복잡한 개념 설명 시

**형식**: 기술 설명 후 "쉽게 말하면:" + 실생활 비유
