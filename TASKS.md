## 📋 Second Brain 페이지 인증 보호 추가

### 🤖 서브 에이전트 시스템

**1. daystep-frontend-dev** 🎨
- **담당 작업**: UI/UX 구현, 컴포넌트 개발, 스타일링, 반응형 디자인, 클라이언트 상태 관리
- **기술 스택**: React/TypeScript, Tailwind CSS, DaisyUI, Framer Motion, Zustand
- **특화 영역**: 접근성 (WCAG 준수), 브라우저 스토리지, 프론트엔드 최적화
- **병렬 사용**: UI 페이지/컴포넌트 개발 시 `#1`, `#2`, `#3`, `#4`... 번호 부여

**2. daystep-backend-dev** ⚙️
- **담당 작업**: API 개발, 데이터베이스 작업, 인증/권한, 서버 비즈니스 로직
- **기술 스택**: Supabase, PostgreSQL, Edge Functions
- **특화 영역**: CRUD, RLS 정책, 마이그레이션, 데이터 검증, 에러 처리

**3. mobile-developer** 📱
- **담당 작업**: 네이티브 통합, 플랫폼 최적화, 모바일 빌드
- **기술 스택**: Capacitor, iOS/Android SDK
- **특화 영역**: 로컬 알림, 생체 인증, WebView 최적화, 앱 배포

**4. daystep-qa-validator** ✅
- **담당 작업**: 테스트 작성, 빌드 검증, 버그 수정, 성능 테스트
- **기술 스택**: TypeScript, ESLint, Jest, Playwright
- **특화 영역**: 타입 체크, 회귀 테스트, 배포 전 검증
- **필수 원칙**: 모든 코드 변경 후 QA 검증 필수 (긴급 버그 수정, 간단한 변경 포함)

**5. debug-logger** 🔍
- **담당 작업**: 디버깅 로그 추가, 복잡한 버그 추적, 실행 흐름 모니터링
- **기술 스택**: Console API, Browser DevTools, 성능 프로파일링
- **특화 영역**: 전략적 로그 배치, 상태 변화 추적, API 경계 모니터링, 에러 추적
- **사용 시점**: 복잡한 상태 변화를 포함한 로직 구현 후, API 호출 및 사용자 상호작용이 있는 기능 후

**에이전트 배정 원칙:**
- 작업 영역과 에이전트 전문성 매칭
- 병렬 작업 시 동일 에이전트 타입에 `#1`, `#2`, `#3`... 번호 부여
- 크로스 기능 작업에는 여러 에이전트 협업
- **모든 코드 변경 후 QA 검증 필수**

---

### 📌 계획된 작업

**작업 상태 표시:**
- `[ ]` - 계획된 작업 (아직 시작 안함)
- `[-]` - 진행 중인 작업
- `[x]` - 완료된 작업 (담당: 에이전트명) - YYYY-MM-DD

---

### Phase 1: 페이지별 AuthGuard 적용 (병렬 처리)

**⚡ 병렬 작업 그룹 - 14개 Second Brain 페이지에 AuthGuard 동시 적용**

각 페이지에서 다음 작업 수행:
1. `'use client'` 지시어 확인 (없으면 추가)
2. `AuthGuard` import 추가: `import { AuthGuard } from '@/components/auth/AuthGuard';`
3. 페이지 컴포넌트를 `<AuthGuard requireAuth={true}>` 래퍼로 감싸기
4. 타임라인 페이지 패턴 참조 (app/timeline/page.tsx)

**참고 구현 예시:**
```typescript
'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
// ... 기타 imports

export default function PageName() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 기존 페이지 콘텐츠 */}
      </div>
      <SecondBrainBottomNav />
    </AuthGuard>
  );
}
```

**병렬 작업 목록:**

- [x] 시스템 설명 페이지 (app/second-brain/start/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #1) - 2025-01-05
- [x] 책임 영역 페이지 (app/second-brain/areas/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #2) - 2025-01-05
- [x] 자원 페이지 (app/second-brain/resources/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #3) - 2025-01-05
- [x] 목표 페이지 (app/second-brain/goals/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #4) - 2025-01-05
- [x] 프로젝트 페이지 (app/second-brain/projects/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #5) - 2025-01-05
- [x] 수집 페이지 (app/second-brain/inbox/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #6) - 2025-01-05
- [x] 명료화 페이지 (app/second-brain/clarify/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #7) - 2025-01-05
- [x] 계획 페이지 (app/second-brain/plan/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #8) - 2025-01-05
- [x] 점검 페이지 (app/second-brain/review/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #9) - 2025-01-05
- [x] 달력 페이지 (app/second-brain/calendar/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #10) - 2025-01-05
- [x] 목표 나침반 페이지 (app/second-brain/goal-compass/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #11) - 2025-01-05
- [x] 노트 페이지 (app/second-brain/notes/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #12) - 2025-01-05
- [x] 아카이브 페이지 (app/second-brain/archive/page.tsx) AuthGuard 적용 (담당: daystep-frontend-dev #13) - 2025-01-05

**→ 예상 처리 시간: 순차 대비 92% 단축 (13배 빠름)**

**병렬 처리 효과:**
- 총 작업 수: 13개 페이지
- 병렬 실행: 13개 동시
- 순차 실행 시간: 약 65분 (페이지당 5분)
- 병렬 실행 시간: 약 5분 (가장 느린 작업 기준)
- 시간 절감: 60분 (92% 단축)

---

### Phase 2: 통합 검증 (순차 작업)

**순차 작업 (Phase 1 완료 후 수행):**

- [x] 전체 페이지 인증 플로우 통합 테스트 (담당: daystep-qa-validator) - 2025-01-05
  - 의존성: Phase 1의 모든 작업 완료 ✅
  - 테스트 항목:
    1. ✅ 로그아웃 상태에서 각 페이지 접근 시 로그인 페이지로 리다이렉트 확인
    2. ✅ 로그인 후 정상 페이지 접근 확인
    3. ✅ AuthGuard 로딩 상태 표시 확인
    4. ✅ 타입 체크: `npx tsc --noEmit` (통과)
    5. ✅ Lint 검사: `npm run lint` (Warning만 있음, Error 없음)
    6. ✅ 웹 빌드 검증: `BUILD_TARGET=web npm run build` (성공)
    7. ⏭️  모바일 빌드 검증 (스킵 - 웹 환경만 적용)
    8. ✅ 기능 회귀 테스트 (기존 기능 정상 작동 확인)

  - 추가 수정 사항:
    - plan/page.tsx: JSX 닫기 태그 오류 수정
    - clarify/page.tsx: SSR 중 appUser null 처리 (`appUser?.id` 조건 추가)

- [ ] 인증 에러 처리 개선 (담당: debug-logger)
  - 의존성: QA 검증 완료 ✅
  - AuthGuard에서 발견된 에러 시나리오에 대한 디버깅 로그 추가
  - 에러 추적 및 모니터링 강화
  - **상태: 선택적 작업 - 필요시 진행**

---

### 작업 진행 가이드라인

**작업 시작 전:**
1. TASKS.md 확인
2. 할당된 페이지 확인
3. 타임라인 페이지 참고 구현 검토

**작업 진행 중:**
- 작업 시작 시: `[ ]` → `[-]` 변경
- 작업 완료 시: `[-]` → `[x]` 변경 + 날짜 기록

**작업 완료 후:**
- QA 검증 필수
- 다른 병렬 작업과의 충돌 확인
- Phase 2 통합 테스트 대기

**주의사항:**
- 각 페이지의 기존 구조를 최대한 유지
- 'use client' 지시어는 파일 맨 위에 위치
- AuthGuard는 페이지 콘텐츠 전체를 감싸야 함
- 로딩 상태는 AuthGuard가 자동 처리

---

### 예상 일정

- **Phase 1 (병렬 처리)**: 약 5분
- **Phase 2 (통합 검증)**: 약 10분
- **총 예상 시간**: 약 15분

**순차 처리 시 예상 시간**: 약 75분 (페이지당 5분 × 13개 + 검증 10분)
**병렬 처리 시간 절감**: 60분 (80% 단축)
