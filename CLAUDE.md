# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Capacitor 7
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱


## 1. 한글 응답
- 모든 응답은 한글로 작성

## 2. Git 커밋
- 사용자 명시적 허락 없이 커밋 금지

## 3. TASKS.md 워크플로우 (강제)
**⚠️ 모든 작업은 반드시 이 순서를 따름:**

```
시작 → TASKS.md 읽기 → 현재 작업 항목 파악 → 작업 진행
     ↓
각 작업 항목 완료 즉시 → TASKS.md 해당 체크박스 체크
     ↓
모든 항목 완료 → TASKS.md 상태 섹션 업데이트 → 사용자 보고
```

**금지 사항:**
- ❌ TASKS.md 체크박스 업데이트 없이 다음 작업 진행
- ❌ TodoWrite로 TASKS.md 대체
- ❌ "나중에 일괄 업데이트" 시도

---
## 🤖 서브 에이전트 시스템 (자동 트리거)

**⚠️ 메인 에이전트는 사용자 요청을 분석하여 적절한 서브 에이전트를 자동으로 호출해야 함**

### 자동 트리거 메커니즘

메인 에이전트는 다음 패턴을 감지하여 서브 에이전트를 호출합니다:

| 작업 유형 | 서브 에이전트 | 트리거 키워드 | 호출 시점 |
|----------|-------------|-------------|----------|
| **UI 작업** | 🎨 frontend-architect | UI, 디자인, 스타일, 컴포넌트, 페이지, 레이아웃, 반응형, 테마, 배경색, 버튼, 카드, 모달 | UI 수정/생성 요청 시 |
| **상태 관리** | 🗂️ zustand-architect | store, zustand, 상태, state, optimistic, 동기화, 캐싱, 롤백, getState | Store 설계/수정, 상태 관리 |
| **백엔드** | 🔧 backend-architect | supabase, database, DB, 쿼리, query, RLS, 인증, auth, API, 백엔드 | DB 쿼리, 인증, RLS 정책 |
| **테스트** | 🧪 test-agent | 테스트, 검증, 확인, 버그, 에러, 작동, 느림, 깨짐, iOS, Android, 모바일, 웹, 성능 | 기능 완료 후, 버그 리포트 |
| **할일 정리** | 📋 task-planner | 할일, 작업, 계획, 체크리스트, TODO, 정리, 문서화, TASKS.md | 작업 계획 요청, 할일 정리 |

### 호출 예시

**사용자**: "수집 페이지 디자인 일관성 개선해줘"
→ **메인 에이전트**: Task tool로 frontend-architect 호출

**사용자**: "Todo store에 optimistic update 추가"
→ **메인 에이전트**: Task tool로 zustand-architect 호출

**사용자**: "Supabase RLS 정책 검증"
→ **메인 에이전트**: Task tool로 backend-architect 호출

**사용자**: "구현 완료, 테스트 필요"
→ **메인 에이전트**: Task tool로 test-agent 호출

**사용자**: "할일 정리해서 TASKS.md 만들어줘"
→ **메인 에이전트**: Task tool로 task-planner 호출

### 📂 서브 에이전트 문서

#### 🎨 frontend-architect
- **위치**: `.claude/agents/frontend-architect.md`
- **전문 분야**: DaisyUI + Tailwind CSS, 반응형 디자인, 테마 호환성
- **주요 패턴**: 페이지 레이아웃, 모달, 카드, 버튼 스타일

#### 🗂️ zustand-architect
- **위치**: `.claude/agents/zustand-architect.md`
- **전문 분야**: Zustand store 설계, Optimistic updates, 상태 동기화
- **주요 패턴**: Store 구조, 낙관적 업데이트, 롤백 로직, 상태 지속성

#### 🔧 backend-architect
- **위치**: `.claude/agents/backend-architect.md`
- **전문 분야**: Supabase DB 접근, 인증 시스템, RLS 정책
- **주요 패턴**: DB 쿼리, supabaseWebViewHelper, userId 전달, 타입 안전성

#### 🧪 test-agent
- **위치**: `.claude/agents/test-agent.md`
- **전문 분야**: 웹/모바일 환경 테스트, 품질 검증, 성능 측정
- **주요 역할**: 테스트 시나리오 작성, 이슈 리포팅, 회귀 테스트

#### 📋 task-planner
- **위치**: `.claude/agents/task-planner.md`
- **전문 분야**: 할일 정리, 작업 계획 수립, TASKS.md 문서화
- **주요 역할**: 요구사항 분석, 작업 분해, 체크리스트 생성, 진행 상황 추적

### 📚 시스템 개요
- **전체 가이드**: `.claude/sub-agents.md`
- **협업 워크플로우**: 작업 시작 → 해당 에이전트 문서 읽기 → 작업 수행 → 다음 에이전트 호출

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


## 개발 명령어

### 일반 개발
```bash
npm install                    # 의존성 설치
npm run dev:web               # 웹 개발 서버 (BUILD_TARGET=web, 2초 시작)
npm run dev:mobile            # 모바일 개발 + Capacitor 동기화
npm run lint                  # ESLint 검사
npx tsc --noEmit             # 타입 체크
```

### 빌드 및 배포
```bash
npm run build                 # 웹 프로덕션 빌드 (BUILD_TARGET=web)
npm run build:mobile          # 모바일 빌드 + Capacitor 동기화
npm run preview:web           # 웹 프로덕션 미리보기
npm start                     # 프로덕션 서버
```

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

---


## 📚 참고 문서

- **Task Master AI**: `.taskmaster/CLAUDE.md`
- **서브 에이전트 시스템**: `.claude/sub-agents.md`
- **TASKS.md**: 현재 작업 계획 및 진행 상황
