# DayStep 프로젝트 작업 관리 규칙

## 절대 원칙
1. ** 할일/작업 목록/계획 생성 요청시 task-planner 서브 에이전트 사용 해서 TASKS.md 생성 필수 **
2. 작업 시작 전 TASKS.md 반드시 확인
3. **할당된 서브 에이전트를 Task tool로 실행 (TASKS.md "Assigned" 확인)**
   - 병렬 작업(#1, #2, #3...)이 있으면 **반드시 Task tool 사용**
   - 단일 메시지에 여러 Task tool 호출로 병렬 실행
   - 직접 Edit/Write 대신 서브 에이전트에 위임
4. 작업 진행/완료 시 즉시 TASKS.md 업데이트
5. Phase 순서 및 의존성 준수
6. 모든 작업은 TASKS.md 파일을 중심으로 진행합니다.
7. 작업은 한국어로 진행하세요. 커밋 메시지도 한국어로 생성하세요.
8. 커밋하기 전에 사용자에게 커밋 할지 확인 질문 하세요.

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
     - **새로 생성**: 기존 파일 삭제하고 새로운 파일 생성
     - **추가**: 기존 작업 목록에 새로운 작업 추가
     - **유지**: 기존 작업 완료 후 새로운 작업 시작
  3. 사용자 응답에 따라 처리

### 작업 진행 중

#### 병렬 작업 실행 (중요!)
- **TASKS.md에 병렬 작업이 정의된 경우 (예: daystep-frontend-dev #1, #2, #3...)**:
  1. **반드시 Task tool을 사용**하여 여러 서브 에이전트를 동시 실행
  2. **단일 메시지**에 여러 Task tool 호출 포함 (병렬 실행)
  3. 각 서브 에이전트에 개별 파일/작업 할당
  4. 모든 병렬 작업이 완료될 때까지 대기

**병렬 작업 예시:**
```typescript
// 잘못된 방법 (순차 실행) - 사용 금지!
❌ 직접 Edit tool로 파일1 수정
❌ 직접 Edit tool로 파일2 수정
❌ 직접 Edit tool로 파일3 수정

// 올바른 방법 (병렬 실행) - 필수!
✅ Task tool로 daystep-frontend-dev #1 호출 (파일1 담당)
✅ Task tool로 daystep-frontend-dev #2 호출 (파일2 담당)
✅ Task tool로 daystep-frontend-dev #3 호출 (파일3 담당)
→ 단일 메시지에 3개의 Task 호출을 모두 포함
```

#### 순차 작업 실행
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
