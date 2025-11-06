# DayStep 프로젝트 작업 관리 규칙

## Task Tool 사용 원칙

### 1. Plan Mode 워크플로우
사용자 요청을 받으면:
1. **Task tool의 Plan 에이전트로 조사**
2. **ExitPlanMode로 계획 제시**
3. **사용자 승인 후 작업 실행**
4. **TodoWrite로 진행 상황 추적**

### 2. 서브 에이전트 자동 선택
Plan 에이전트가 작업 내용을 분석하여 적절한 서브 에이전트 자동 선택:

- **프론트엔드 작업**: `daystep-frontend-dev`
  - UI 컴포넌트, React/Next.js 코드, 스타일링

- **백엔드 작업**: `daystep-backend-dev`
  - API, 데이터베이스, Supabase 연동, 서버 로직

- **QA 검증**: `daystep-qa-validator`
  - 타입 체크, 린트, 빌드 검증, 테스트

- **탐색/조사**: `Explore`
  - 코드베이스 구조 파악, 파일 검색, 패턴 분석

### 3. 병렬 서브 에이전트 실행 (중요!)

**병렬 실행 시점**:
- 여러 파일을 독립적으로 수정해야 할 때
- 순차 의존성이 없는 여러 작업이 있을 때

**병렬 실행 방법**:
```typescript
// ❌ 잘못된 방법 (순차 실행)
Edit tool로 파일1 수정
Edit tool로 파일2 수정
Edit tool로 파일3 수정

// ✅ 올바른 방법 (병렬 실행)
단일 메시지에 여러 Task tool 호출:
- Task(daystep-frontend-dev, "파일1 수정")
- Task(daystep-frontend-dev, "파일2 수정")
- Task(daystep-frontend-dev, "파일3 수정")
```

**주의사항**:
- 파일 간 의존성이 있으면 순차 실행
- 각 서브 에이전트에 명확한 작업 범위 지정
- 모든 병렬 작업 완료 후 다음 단계 진행

### 4. 기본 규칙
- **한국어 사용**: 모든 대화, 커밋 메시지 한국어로 작성
- **커밋 전 확인**: 사용자에게 커밋 여부 확인
- **Plan Mode 준수**: 항상 계획 제시 후 승인받고 실행

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

**Materialized View 사용 금지:**
- `inbox_todos`, `inbox_projects`, `inbox_goals` Materialized View 조회 금지
- 캐시된 스냅샷 반환 → DELETE/UPDATE 후 자동 갱신 안됨
- 새로고침해도 삭제된 데이터가 계속 보이는 문제 발생
- **필수**: `todos`, `projects`, `goals` 테이블 직접 조회 + 클라이언트 필터링

### 상태 관리

- `Object.assign(state.optimisticState, {...})`
- Optimistic updates 적용

---

## Claude Code 개발 가이드

### 기본 규칙

- **한글로 대답하세요**
- **커밋은 사용자에게 허락 확인 받고 하세요**

---

## 📝 문서 작업 원칙

### 모든 문서 추가/개선/업데이트 시
- **핵심만 간결하게**: 불필요한 예제 코드나 장황한 설명 지양
- **실용적 정보 우선**: 실제 개발에 필요한 핵심 내용만 포함
- **중복 제거**: 이미 다른 문서에 있는 내용은 참조만 표시
- **간결한 포맷**: 리스트, 짧은 문장, 핵심 키워드 중심

### 체크리스트
- [ ] 예제 코드가 반드시 필요한가? → 필요하지 않으면 제거
- [ ] 한 문장으로 표현 가능한가? → 가능하면 간결하게
- [ ] 다른 문서에 상세 내용이 있는가? → 참조 링크만 남기기
- [ ] 실제 개발에 도움이 되는가? → 이론적 내용은 최소화

---

## 📚 기타 가이드

### 쉬운 설명 규칙
**트리거**: 기술 용어, 복잡한 개념 설명 시
**형식**: 기술 설명 후 "쉽게 말하면:" + 실생활 비유
