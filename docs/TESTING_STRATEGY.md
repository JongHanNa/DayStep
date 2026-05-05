# DayStep 통합 테스트 전략

> 프로젝트 전체(웹 + 모바일 RN)의 테스트 현황, 갭 분석, 우선순위, 실행 가이드

---

## 1. 테스트 피라미드 현황

```
                    ╔═══════════════╗
                    ║   E2E 테스트   ║
                    ║  (사용자 플로우) ║
                    ╠═══════════════╣
                    ║ 웹: 2파일 ⚠️   ║
                    ║ RN:  없음 ❌   ║
                ╔═══╩═══════════════╩═══╗
                ║     통합 테스트        ║
                ║  (컴포넌트 간 연동)     ║
                ╠═══════════════════════╣
                ║ 웹: 1파일 ⚠️          ║
                ║ RN:  없음 ❌          ║
            ╔═══╩═══════════════════════╩═══╗
            ║       컴포넌트 테스트          ║
            ║  (UI 렌더링 + 인터랙션)        ║
            ╠═══════════════════════════════╣
            ║ 웹: ~8파일 / 274개 컴포넌트 ⚠️ ║
            ║ RN:  2파일 / 66개 컴포넌트 ⚠️  ║
        ╔═══╩═══════════════════════════════╩═══╗
        ║       스토어 / 훅 테스트               ║
        ║  (상태 관리 + 비즈니스 로직)            ║
        ╠═══════════════════════════════════════╣
        ║ 웹: 스토어 1/27 + 훅 3/44 ⚠️          ║
        ║ RN:  스토어 3/14 ✅ 기본흐름            ║
    ╔═══╩═══════════════════════════════════════╩═══╗
    ║             순수 함수 테스트                    ║
    ║  (유틸리티 + 헬퍼 + 변환 로직)                  ║
    ╠═══════════════════════════════════════════════╣
    ║ 웹: 2파일 (audioManager, time-utils) ✅        ║
    ║ RN:  1파일 (timeStatus) ✅ 100%               ║
    ╚═══════════════════════════════════════════════╝
```

**범례**: ✅ 커버됨 | ⚠️ 부분적 | ❌ 없음

---

## 2. 플랫폼별 현황

### 웹 (apps/web/) — 14개 테스트 파일 + 2개 E2E

| 카테고리 | 파일 수 | 대상 규모 | 커버리지 | 상태 |
|---------|---------|----------|---------|------|
| 순수 함수 | 2 (audioManager, time-utils) | — | 부분 | ✅ |
| 엔티티 | 1 (todo.test.ts) | — | 부분 | ✅ |
| 스토어 | 1 (todoStore) | 27개 | ~4% | ⚠️ 핵심 갭 |
| 훅 | 3 (usePomodoro, useNotifications, useAudio) | 44개 | ~7% | ⚠️ |
| 컴포넌트 | 6 (Pomodoro 3 + Todos 3) | 274개 | ~2% | ⚠️ |
| 통합 | 1 (TodoFlow) | — | 최소 | ⚠️ |
| E2E | 2 (todos, auth) | — | 핵심 플로우만 | ⚠️ |

### 모바일 RN (apps/mobile-rn/) — 6개 테스트 파일

| 카테고리 | 파일 수 | 대상 규모 | 커버리지 | 상태 |
|---------|---------|----------|---------|------|
| 순수 함수 | 1 (timeStatus) | — | 100% | ✅ |
| 스토어 | 3 (auth, subscription, todo) | 14개 | ~21% 기본흐름 | ⚠️ |
| 컴포넌트 | 2 (AnimatedPressable, TodoCard) | 66개 | ~3% | ⚠️ |
| 통합 | 없음 | — | 0% | ❌ |
| E2E | 없음 | — | 0% | ❌ |

---

## 3. 안심할 수 있는 것 vs 없는 것

### ✅ 안심 가능 (테스트로 검증됨)

| 영역 | 검증된 내용 |
|------|-----------|
| **순수 로직** | `timeStatus` (시간 상태 판별, 기간 포맷팅), `time-utils`, `audioManager` |
| **스토어 기본 상태 전이** | 로그인/로그아웃, 할일 CRUD 기본 흐름, 구독 상태 조회 |
| **Optimistic Update** | 할일 생성/삭제 시 낙관적 업데이트 + 실패 시 롤백 |
| **구독 상태 판별** | active/expired/trial 상태 분기, 파생 상태 계산 |
| **포모도로 타이머** | 초기화, 타이머 상태, Web Worker 에러 처리 |
| **기본 UI 렌더링** | AnimatedPressable, TodoCard, TimerDisplay, CircularProgress |

### ❌ 안심 불가 (테스트 부재)

| 영역 | 위험도 | 설명 |
|------|-------|------|
| **`fetchTodosForDate` 복잡 쿼리** | 🔴 높음 | 날짜 필터링 + 반복 할일 + exclusion + completion 조합 |
| **반복 할일 로직** | 🔴 높음 | exclusion/completion 처리, 시간 정규화, 부모-자식 관계 |
| **할일 미루기/건너뛰기** | 🟡 중간 | postpone/skip의 상태 전이와 날짜 계산 |
| **결제/구독 전체 플로우** | 🔴 높음 | RevenueCat → webhook → DB → UI 전체 체인 |
| **조건부 UI 렌더링** | 🟡 중간 | 272개+ 미테스트 컴포넌트의 상태별 분기 |
| **플랫폼 간 데이터 정합성** | 🟡 중간 | 웹/RN 간 동일 Supabase 데이터 처리 차이 |
| **인증 플로우 (Google/Kakao/Apple)** | 🟡 중간 | OAuth 콜백, 토큰 갱신, 세션 복원 |
| **실제 사용자 시나리오** | 🔴 높음 | 로그인 → 할일 생성 → 완료 → 통계 확인 등 E2E |

---

## 4. 앞으로의 테스트 관점 가이드

### 언제 테스트를 작성하는가?

| 상황 | 작성 범위 | 이유 |
|------|----------|------|
| **새 기능 추가** | 해당 스토어 액션 + 핵심 컴포넌트 | 회귀 방지의 가장 효율적 시점 |
| **버그 수정** | 버그 재현 테스트 먼저 → 수정 | 같은 버그 재발 방지 |
| **리팩토링** | 기존 동작 보장 테스트 확인/추가 → 리팩토링 | 동작 변경 없음을 증명 |
| **복잡한 비즈니스 로직** | 경계값 + 예외 케이스 포함 | 수동 테스트로 커버 불가능 |

### 우선순위 매트릭스 (ROI 기준)

```
높은 ROI ──────────────────────────────────────── 낮은 ROI

1. 스토어 복잡 로직          2. 결제/구독        3. 조건부 UI       4. E2E
   fetchTodosForDate           RevenueCat          상태별 분기         핵심 플로우
   반복 할일 처리               webhook 연동        에러 상태           마지막 안전망
   postpone/skip               만료/갱신           빈 상태
```

**1순위 — 스토어 복잡 로직** (가장 높은 ROI)
- `fetchTodosForDate`: 날짜 필터 + 반복 할일 + exclusion 조합
- 반복 할일: 주기 계산, exclusion 처리, completion 상태
- postpone/skip: 날짜 이동 로직, 상태 전이

**2순위 — 결제/구독 플로우** (비즈니스 임팩트)
- 구독 상태 전이 (active → expired → renewed)
- 무료/유료 기능 분기
- 결제 실패 시 graceful degradation

**3순위 — 컴포넌트 조건부 렌더링** (사용자 경험)
- 로딩/에러/빈 상태 처리
- 구독 상태별 UI 분기
- 반응형 레이아웃

**4순위 — E2E 핵심 플로우** (마지막 안전망)
- 로그인 → 할일 생성 → 완료 → 확인
- 구독 결제 → 프리미엄 기능 접근

---

## 5. 플랫폼별 테스트 실행 가이드

### 웹 (apps/web/)

```bash
cd apps/web

# 단위 테스트
npm run test              # 전체 Jest 실행
npm run test:watch        # 개발 중 워치 모드 (변경 파일만 재실행)
npm run test:unit         # __tests__/unit/ 만 실행
npm run test:integration  # __tests__/integration/ 만 실행
npm run test:coverage     # 커버리지 리포트 생성 → coverage/ 디렉터리

# E2E 테스트 (Playwright)
npm run test:e2e          # 전체 E2E (dev 서버 자동 시작)
npm run test:e2e:ui       # Playwright UI 모드 (시각적 디버깅)
npm run test:e2e:debug    # 디버그 모드

# 전체 실행
npm run test:all          # 커버리지 + E2E 모두 실행
```

**커버리지 임계값** (jest.config.js):
- branches: 70%, functions: 70%, lines: 80%, statements: 80%

**Playwright 브라우저**: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12), Google Chrome

### 모바일 RN (apps/mobile-rn/)

```bash
cd apps/mobile-rn

# 기본 실행
npm run test              # 전체 Jest 실행
npm run test:watch        # 워치 모드
npm run test:coverage     # 커버리지 리포트

# 선택적 실행
npx jest timeStatus                    # 특정 파일명 매칭
npx jest --testPathPattern=stores      # 스토어 테스트만
npx jest --testPathPattern=components  # 컴포넌트 테스트만
npx jest --verbose                     # 상세 출력
```

---

## 6. 테스트 작성 패턴

### a. 순수 함수 — 가장 쉬움

> 외부 의존성 없이 입력 → 출력만 검증

```typescript
// 패턴: import → 호출 → expect
import { getTimeStatus } from '../timeStatus';

describe('getTimeStatus', () => {
  it('완료된 할일은 completed 반환', () => {
    const todo = { is_completed: true, start_time: '09:00', end_time: '10:00' };
    expect(getTimeStatus(todo)).toBe('completed');
  });
});
```

**예시 파일**:
- RN: `apps/mobile-rn/src/lib/__tests__/timeStatus.test.ts`
- 웹: `apps/web/__tests__/lib/time-utils.test.ts`

### b. Zustand 스토어 — 핵심

> 외부 의존성(Supabase 등) mock → `getState()`/`setState()`로 직접 테스트

**웹 패턴** (renderHook):
```typescript
jest.mock('@/lib/supabase', () => ({ supabase: mockSupabase }));

import { renderHook, act } from '@testing-library/react';
import { useTodoStore } from '@/state/todoStore';

it('할일 생성', async () => {
  const { result } = renderHook(() => useTodoStore());
  await act(async () => { await result.current.createTodo(newTodo); });
  expect(result.current.todos).toHaveLength(1);
});
```

**RN 패턴** (require — dynamic import 불가):
```typescript
jest.mock('@/lib/supabase', () => ({ supabase: mockSupabase }));

// beforeEach에서 모듈 리셋 후 require
let store: any;
beforeEach(() => {
  jest.resetModules();
  store = require('../authStore').useAuthStore;
});

it('로그인 성공', async () => {
  await store.getState().signInWithIdToken('google', 'token');
  expect(store.getState().user).toBeTruthy();
});
```

**예시 파일**:
- 웹: `apps/web/__tests__/unit/stores/todoStore.test.ts`
- RN: `apps/mobile-rn/src/stores/__tests__/authStore.test.ts`

> ⚠️ **RN 주의**: `import()` dynamic import가 Jest에서 동작하지 않음 → `require()` 사용

### c. 컴포넌트 — UI 검증

> Provider 래퍼 + fireEvent + getByText/getByRole

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';

it('버튼 클릭 시 콜백 호출', () => {
  const onPress = jest.fn();
  const { getByText } = renderWithProviders(
    <AnimatedPressable onPress={onPress}><Text>클릭</Text></AnimatedPressable>
  );
  fireEvent.press(getByText('클릭'));
  expect(onPress).toHaveBeenCalled();
});
```

**예시 파일**:
- 웹: `apps/web/__tests__/components/pomodoro/TimerDisplay.test.tsx`
- RN: `apps/mobile-rn/src/components/core/__tests__/AnimatedPressable.test.tsx`

### d. 커스텀 훅 — renderHook

> `renderHook` + `act` + `waitFor`

```typescript
import { renderHook, act } from '@testing-library/react';

it('타이머 시작/정지', async () => {
  const { result } = renderHook(() => usePomodoro());
  act(() => { result.current.start(); });
  expect(result.current.isRunning).toBe(true);
});
```

**예시 파일**: `apps/web/__tests__/hooks/usePomodoro.test.tsx`

### e. E2E (웹 전용) — Playwright

> page.goto → locator → click/fill → expect

```typescript
import { test, expect } from '@playwright/test';

test('할일 생성', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '추가' }).click();
  await page.getByPlaceholder('할일 입력').fill('새 할일');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('새 할일')).toBeVisible();
});
```

**예시 파일**: `apps/web/e2e/todos.spec.ts`

---

## 7. 새 네이티브 모듈 mock 추가 (RN)

RN에서 새 네이티브 모듈을 사용할 때, 테스트가 깨지면 `jest.setup.ts`에 mock 추가:

```typescript
// apps/mobile-rn/jest.setup.ts 에 추가

// 1. 단순 모듈 (빈 객체/함수)
jest.mock('react-native-new-module', () => ({
  doSomething: jest.fn(),
}));

// 2. 컴포넌트 모듈 (JSX 반환)
jest.mock('react-native-new-component', () => {
  const { View } = require('react-native');
  return {
    NewComponent: (props: any) => <View {...props} />,
  };
});

// 3. default export 모듈
jest.mock('react-native-new-default', () => ({
  __esModule: true,
  default: jest.fn(),
}));
```

**현재 mock된 모듈** (27개+): MMKV, Reanimated, Gesture Handler, Navigation, Bottom Sheet, Supabase, RevenueCat, Notifee, Google Sign-In, Apple Auth, NativeWind, Skia, Lottie 등

---

## 8. 주의사항 / Gotchas

| 문제 | 원인 | 해결 |
|------|------|------|
| NativeWind babel 충돌 | NativeWind의 babel 프리셋이 Jest와 충돌 | `jest.config.js`에 `transform` 설정 시 `configFile: false` 사용 |
| react / react-test-renderer 버전 불일치 | 서로 다른 버전 설치 | `package.json`에서 정확히 같은 버전 명시 |
| RN 스토어 테스트에서 `import()` 실패 | Jest가 dynamic import 미지원 | `require()`로 대체, `beforeEach`에서 `jest.resetModules()` |
| `setupFiles`에서 `beforeAll`/`expect` 사용 불가 | setupFiles는 테스트 프레임워크 로드 전 실행 | `setupFilesAfterSetup`(= `setupFilesAfterEnv`) 사용 |
| 웹 커버리지 임계값 미달 | 글로벌 branches 70%, lines 80% | `jest.config.js`의 `coverageThreshold` 조정 또는 테스트 추가 |
| Reanimated mock 경고 | `react-native-reanimated/mock` deprecated | `jest.setup.ts`에서 수동 mock 정의 |
| Supabase 체인 mock 복잡도 | `select().eq().order()` 같은 체인 호출 | fixture에서 체인 mock 헬퍼 사전 정의 |

---

## 테스트 디렉터리 구조 요약

```
DayStep/
├── apps/web/
│   ├── jest.config.js              # Jest 설정 (next/jest 기반)
│   ├── jest.setup.js               # 글로벌 mock (router, matchMedia 등)
│   ├── playwright.config.ts        # E2E 설정 (6개 브라우저)
│   ├── test-utils/
│   │   ├── helpers/
│   │   │   ├── renderWithProviders.tsx
│   │   │   └── testData.ts
│   │   ├── mocks/
│   │   │   ├── handlers.ts         # MSW 핸들러
│   │   │   └── supabase.ts         # Supabase mock
│   │   └── setup.ts
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── stores/todoStore.test.ts
│   │   │   └── entities/todo.test.ts
│   │   ├── hooks/
│   │   │   ├── usePomodoro.test.tsx
│   │   │   ├── useNotifications.test.tsx
│   │   │   └── useAudio.test.tsx
│   │   ├── components/
│   │   │   ├── pomodoro/ (3파일)
│   │   │   └── todos/ (3파일)
│   │   ├── integration/
│   │   │   └── components/TodoFlow.test.tsx
│   │   └── lib/
│   │       ├── audioManager.test.ts
│   │       └── time-utils.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       └── todos.spec.ts
│
└── apps/mobile-rn/
    ├── jest.config.js              # Jest 설정 (react-native preset)
    ├── jest.setup.ts               # 27+ 네이티브 모듈 mock
    └── src/
        ├── __tests__/
        │   ├── test-utils.tsx      # renderWithProviders
        │   └── fixtures/
        │       ├── auth.ts         # createMockUser/Session
        │       └── todos.ts        # createMockTodo 등
        ├── lib/__tests__/
        │   └── timeStatus.test.ts
        ├── stores/__tests__/
        │   ├── authStore.test.ts
        │   ├── subscriptionStore.test.ts
        │   └── todoStore.test.ts
        └── components/
            ├── core/__tests__/
            │   └── AnimatedPressable.test.tsx
            └── todo/__tests__/
                └── TodoCard.test.tsx
```
