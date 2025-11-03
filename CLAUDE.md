# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📖 목차

- [프로젝트 정보](#프로젝트-정보)
- [개발 명령어](#개발-명령어)
- [환경 설정](#환경-설정)
- [MCP 서버](#mcp-서버)
- [핵심 아키텍처 패턴](#핵심-아키텍처-패턴)
- [기본 규칙](#기본-규칙)
- [공통 패턴](#공통-패턴-절대-원칙)
- [서브 에이전트 시스템](#서브-에이전트-시스템)
- [품질 관리](#품질-관리)

---

## 프로젝트 정보

**저장소**: DayStep - 할일 관리 및 템플릿 기반 생산성 앱
**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Capacitor 7
**배포**: 웹 (Vercel) + iOS/Android 네이티브 앱

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

## 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**
- **TASKS.md 필수 확인**: 작업 시작 전과 진행 중에 항상 TASKS.md를 확인하고 업데이트하세요

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

## 🤖 서브 에이전트 시스템

상세 개발 가이드는 전문 에이전트 파일을 참조하세요:

### 🎨 UI/디자인 작업
📂 `.claude/agents/ui-agent.md`
- DaisyUI + Tailwind CSS 스타일 가이드
- 반응형 디자인 패턴 (Tailwind 우선)
- 페이지 레이아웃 및 모달 패턴
- 컴포넌트 패턴 및 디버깅

### 🧪 테스트 및 검증
📂 `.claude/agents/test-agent.md`
- 웹/모바일 테스트 환경 설정
- 테스트 시나리오 템플릿
- 이슈 리포팅 및 품질 검증
- 성능 테스트 및 디버깅 도구

### 📝 문서화 및 작업 관리
📂 `.claude/agents/docs-agent.md`
- TASKS.md 워크플로우 및 관리
- JSDoc/코드 주석 가이드 (한글)
- API 문서화 및 작업 이력
- 완료 체크리스트

### 📚 전체 시스템
📂 `.claude/sub-agents.md`
- 서브 에이전트 개요 및 협업 워크플로우
- 에이전트별 역할 및 책임
- 사용 가이드 및 예시

---

## ✅ 품질 관리

**상세 가이드**:
- **TASKS.md 워크플로우**: `.claude/agents/docs-agent.md`
- **테스트 전략**: `.claude/agents/test-agent.md`

### 기본 체크리스트

1. [ ] **TASKS.md 확인** - 현재 작업 파악
2. [ ] **코드 작성 완료** - 기능 구현
3. [ ] **기능 테스트** - 웹/모바일 환경
4. [ ] **TASKS.md 업데이트** - 완료 항목 체크
5. [ ] **사용자 검증 요청**
6. [ ] **git commit**
7. [ ] **다음 작업 시작**

### 2회 실패 시

→ Perplexity/Context7 MCP 사용 (근본 원인 분석, deprecated 확인)

### 자동 경고 트리거

| 트리거 | 조치 |
|--------|------|
| 구버전 패턴 | Context7 최신 패턴 확인 |
| 신규 라이브러리 | 호환성 확인 (React 19, Next.js 15) |
| 위험 컴포넌트 | 테스트 필수 (전역 상태, 인증, 네이티브 브리지 등) |

---

## 📚 참고 문서

- **Task Master AI**: `.taskmaster/CLAUDE.md`
- **서브 에이전트 시스템**: `.claude/sub-agents.md`
- **TASKS.md**: 현재 작업 계획 및 진행 상황
