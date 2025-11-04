# TASKS.md - DayStep 작업 관리

## 📋 수집 페이지(inbox) - 할일 편집 모달 저장 오류 수정

### 오류 요약
**증상**: 수집 페이지에서 할일 편집 모달의 저장 버튼 클릭 시 `RangeError: Invalid time value` 발생
**원인**: `formatDistanceToNow` 함수가 유효하지 않은 날짜 값(`item.created_at`)을 받아 처리
**위치**: `app/second-brain/inbox/page.tsx:658`
**발생 시점**: 할일 항목 업데이트 후 목록 렌더링 시

### 🤖 서브 에이전트 시스템

**1. daystep-frontend-dev** 🎨
- **담당 작업**: UI/UX 구현, 컴포넌트 개발, 스타일링, 반응형 디자인, 클라이언트 상태 관리
- **기술 스택**: React 19, TypeScript, Tailwind CSS, DaisyUI, date-fns
- **특화 영역**: 날짜 처리, 에러 핸들링, 사용자 입력 검증

**2. daystep-qa-validator** ✅
- **담당 작업**: 테스트 작성, 빌드 검증, 버그 수정, 타입 검증
- **기술 스택**: TypeScript, ESLint, 타입 체크
- **특화 영역**: 타입 안전성, 회귀 테스트, 배포 전 검증

**3. debug-logger** 🔍
- **담당 작업**: 디버깅 로그 추가, 복잡한 버그 추적, 실행 흐름 모니터링
- **기술 스택**: Console API, Browser DevTools
- **특화 영역**: 상태 변화 추적, API 경계 모니터링, 에러 추적

---

## Phase 1: 문제 분석 및 원인 파악 (완료)

### 📌 계획된 작업

- [x] 오류 발생 지점 확인 (담당: daystep-frontend-dev) - 2025-01-04
  - `page.tsx:658` - `formatDistanceToNow(new Date(item.created_at))` 호출 시점
  - 할일 업데이트 후 `inboxItems` 배열 렌더링 시 발생

- [x] InboxItem 타입 정의 확인 (담당: daystep-frontend-dev) - 2025-01-04
  - `types/second-brain.ts` 파일 확인 필요
  - `created_at` 필드 타입 및 필수 여부 검증

- [x] inboxStore 업데이트 로직 확인 (담당: daystep-frontend-dev) - 2025-01-04
  - `state/stores/secondBrain/inboxStore.ts` 파일 확인 필요
  - `updateInboxItem` 함수에서 `created_at` 필드 처리 방식 검증

---

## Phase 2: 코드 수정 (계획됨)

### 📌 계획된 작업

**우선순위: 높음**

- [x] 날짜 유효성 검증 추가 (담당: daystep-frontend-dev) - 2025-01-04
  - 의존성: Phase 1 완료
  - `page.tsx:658` 라인에 날짜 유효성 검사 추가
  - 유효하지 않은 날짜 시 기본값 표시 또는 에러 처리
  - 수정 완료:
    - `isValidDate` 헬퍼 함수 추가 (24-29번째 줄)
    - 665-672번째 줄에 날짜 유효성 검사 적용
    - 유효하지 않은 날짜 시 "날짜 정보 없음" 표시

- [x] updateInboxItem 함수 수정 (담당: daystep-frontend-dev) - 2025-01-04
  - 의존성: Phase 1 완료
  - `inboxStore.ts`에서 `updated_at` 필드만 업데이트하고 `created_at` 보존
  - DB 스키마 확인: `created_at` 필드가 자동 생성되는지 검증
  - 검증 완료:
    - `updateInboxTodo`와 `updateInboxNote` 함수가 명시적으로 제공된 필드만 업데이트
    - `updateWithJWT` 함수가 PATCH 메소드로 전달된 필드만 업데이트
    - `created_at` 필드를 업데이트 payload에 포함하지 않으므로 DB에서 보존됨
    - 코드 레벨에서는 문제 없음

- [x] handleUpdate 함수 검토 (담당: daystep-frontend-dev) - 2025-01-04
  - 의존성: Phase 1 완료
  - `page.tsx:208-276` 라인의 `handleUpdate` 함수 검토
  - 검증 완료:
    - 할일 업데이트 payload(221-229번째 줄): `created_at` 필드 포함하지 않음
    - 노트 업데이트 payload(259-268번째 줄): `created_at` 필드 포함하지 않음
    - 불필요한 필드 없음, 코드 올바르게 작성됨

---

## Phase 3: 타입 안전성 강화 (계획됨)

### 📌 계획된 작업

**우선순위: 중간**

- [ ] InboxItem 타입 개선 (담당: daystep-frontend-dev)
  - 의존성: Phase 2 완료
  - `created_at` 필드를 필수(`required`)로 설정
  - 타입 정의에 날짜 형식 명시 (`string | Date`)
  - 업데이트 payload 타입과 생성 payload 타입 분리

- [ ] 날짜 처리 유틸리티 함수 생성 (담당: daystep-frontend-dev)
  - 의존성: Phase 2 완료
  - `lib/utils.ts` 또는 새 파일에 날짜 유틸리티 추가
  - `formatSafeDate`, `isValidDate` 등 재사용 가능한 함수 작성
  - 다른 페이지에서도 사용 가능하도록 공통 모듈화

---

## Phase 4: 테스트 및 검증 (계획됨)

### 📌 계획된 작업

**우선순위: 높음**

- [x] 타입 체크 실행 (담당: daystep-qa-validator) - 2025-01-04
  - 의존성: Phase 2, Phase 3 완료
  - `npx tsc --noEmit` 실행하여 타입 오류 확인
  - ✅ 타입 체크 통과 - 타입 오류 없음

- [x] Lint 검사 실행 (담당: daystep-qa-validator) - 2025-01-04
  - 의존성: Phase 2, Phase 3 완료
  - `npm run lint` 실행하여 코드 품질 확인
  - ✅ Lint 검사 통과 - 오류 없음 (경고는 프로젝트 전체 스타일 관련)

- [ ] 웹 빌드 검증 (담당: daystep-qa-validator)
  - 의존성: 타입 체크, Lint 검사 완료
  - `BUILD_TARGET=web npm run build` 실행
  - 빌드 오류 없이 완료되는지 확인

- [ ] 모바일 빌드 검증 (담당: daystep-qa-validator)
  - 의존성: 웹 빌드 검증 완료
  - `BUILD_TARGET=mobile npm run build` 실행
  - 빌드 오류 없이 완료되는지 확인

---

## Phase 5: 기능 테스트 (계획됨)

### 📌 계획된 작업

**우선순위: 높음**

- [ ] 할일 생성 테스트 (담당: daystep-qa-validator)
  - 의존성: Phase 4 완료
  - 새 할일 생성 시 `created_at` 필드가 자동 생성되는지 확인
  - 생성된 할일이 목록에 정상적으로 표시되는지 확인
  - 날짜 표시가 올바른지 확인 (예: "방금 전")

- [ ] 할일 수정 테스트 (담당: daystep-qa-validator)
  - 의존성: 할일 생성 테스트 완료
  - 기존 할일 수정 시 `created_at` 필드가 유지되는지 확인
  - 수정 후 목록 렌더링 시 날짜 오류가 발생하지 않는지 확인
  - 수정된 내용이 정상적으로 저장되는지 확인

- [ ] 엣지 케이스 테스트 (담당: daystep-qa-validator)
  - 의존성: 할일 수정 테스트 완료
  - `created_at`이 null인 경우 처리 확인
  - `created_at`이 undefined인 경우 처리 확인
  - `created_at`이 유효하지 않은 문자열인 경우 처리 확인
  - 각 케이스에서 UI가 깨지지 않고 적절한 fallback 표시 확인

- [ ] 회귀 테스트 (담당: daystep-qa-validator)
  - 의존성: 엣지 케이스 테스트 완료
  - 노트 생성/수정 기능이 정상 작동하는지 확인
  - 편집 모드 기능이 정상 작동하는지 확인
  - 스와이프 삭제 기능이 정상 작동하는지 확인
  - 탭 전환 기능이 정상 작동하는지 확인

---

## Phase 6: 디버깅 로그 추가 (선택 사항)

### 📌 계획된 작업

**우선순위: 낮음**

- [ ] 전략적 로그 배치 (담당: debug-logger)
  - 의존성: Phase 5 완료
  - `updateInboxItem` 함수에 로그 추가 (업데이트 전/후 상태)
  - `handleUpdate` 함수에 로그 추가 (payload 확인)
  - 날짜 파싱 시점에 로그 추가 (유효성 검증 결과)
  - 프로덕션 환경에서는 로그 제거 또는 조건부 활성화

---

## 작업 진행 상황 요약

- **완료**: Phase 1 (문제 분석), Phase 2 (코드 수정), Phase 4 (일부 - 타입 체크, Lint 검사)
- **진행 중**: 없음
- **대기 중**: Phase 4 (웹/모바일 빌드), Phase 5 (기능 테스트) - 사용자 확인 필요
- **차단됨**: 없음

---

## 다음 단계

1. Phase 4 시작: 테스트 및 검증 (daystep-qa-validator)
2. 우선순위: 타입 체크 → Lint 검사 → 웹 빌드 → 모바일 빌드
3. 각 작업 완료 시 TASKS.md 업데이트 필수

**Phase 2 완료 요약**:
- ✅ 날짜 유효성 검증 헬퍼 함수 추가
- ✅ `formatDistanceToNow` 호출 전 유효성 검사 적용
- ✅ `updateInboxItem` 및 `handleUpdate` 함수 검증 완료
- 💡 코드 레벨 수정 완료 - 이제 테스트 단계로 진행
