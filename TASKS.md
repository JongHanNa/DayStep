## 📋 14개 페이지에 AuthGuard 추가 작업

### 🎯 작업 목표
로그아웃 상태에서 접속 시 로그인 페이지로 리다이렉트되는 기능을 14개 페이지에 추가

### 🤖 서브 에이전트 시스템

**daystep-frontend-dev** 🎨
- **담당 작업**: UI 컴포넌트 통합, AuthGuard 래퍼 추가
- **기술 스택**: React/TypeScript, Next.js 15
- **특화 영역**: 클라이언트 컴포넌트, 인증 상태 관리

**daystep-qa-validator** ✅
- **담당 작업**: 타입 체크, 빌드 검증, 인증 흐름 테스트
- **기술 스택**: TypeScript, ESLint
- **특화 영역**: 타입 체크, 회귀 테스트

### 📌 작업 계획

#### Phase 1: Second Brain 시스템 페이지 (7개)
**우선순위**: 높음 | **의존성**: 없음

- [x] 시스템 설명 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #1) - 2025-11-05
  - 파일: `app/second-brain/start/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가 (timeline/page.tsx 패턴 참조)
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 래핑 완료

- [x] 책임 영역 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #2) - 2025-11-05
  - 파일: `app/second-brain/areas/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 자원 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #3) - 2025-11-05
  - 파일: `app/second-brain/resources/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 목표 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #4) - 2025-11-05
  - 파일: `app/second-brain/goals/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 프로젝트 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #5) - 2025-11-05
  - 파일: `app/second-brain/projects/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 루틴 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #6) - 2025-11-05
  - 파일: `app/routine/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 수집(Inbox) 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #7) - 2025-11-05
  - 파일: `app/second-brain/inbox/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

#### Phase 2: GTD 워크플로우 페이지 (4개)
**우선순위**: 높음 | **의존성**: Phase 1 완료

- [x] 명료화 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #8) - 2025-11-05
  - 파일: `app/second-brain/clarify/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료, 기존 appUser 체크 로딩 UI 제거

- [x] 계획 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #9) - 2025-11-05
  - 파일: `app/second-brain/plan/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 점검 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #10) - 2025-11-05
  - 파일: `app/second-brain/review/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 달력 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #11) - 2025-11-05
  - 파일: `app/second-brain/calendar/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

#### Phase 3: 부가 기능 페이지 (3개)
**우선순위**: 중간 | **의존성**: Phase 2 완료

- [x] 목표 나침반 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #12) - 2025-11-05
  - 파일: `app/second-brain/goal-compass/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 노트 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #13) - 2025-11-05
  - 파일: `app/second-brain/notes/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

- [x] 아카이브 페이지에 AuthGuard 추가 (담당: daystep-frontend-dev #14) - 2025-11-05
  - 파일: `app/second-brain/archive/page.tsx`
  - 작업: AuthGuard 임포트 및 래퍼 추가
  - 완료: AuthGuard 임포트 및 requireAuth={true} 속성으로 전체 페이지 래핑 완료

#### Phase 4: QA 검증
**우선순위**: 높음 | **의존성**: Phase 1, 2, 3 완료

- [x] 타입 체크 및 빌드 검증 (담당: daystep-qa-validator) - 2025-11-05
  - TypeScript 타입 체크: `npx tsc --noEmit` - 통과
  - Lint 검사: `npm run lint` - 오류 없음
  - 웹 빌드: `BUILD_TARGET=web npm run build` - 성공
  - 모바일 빌드: `BUILD_TARGET=mobile npm run build` - 성공
  - 완료: 타입 에러 수정 (app/second-brain/clarify/page.tsx의 appUser?.id 처리), 모든 빌드 통과

- [x] 인증 흐름 테스트 (담당: daystep-qa-validator) - 2025-11-05
  - 14개 페이지 모두 AuthGuard import 확인 완료
  - 14개 페이지 모두 requireAuth={true} 속성 사용 확인 완료
  - 완료: 코드 검토를 통해 인증 흐름 구현 검증 완료

### 📝 참고 사항

**AuthGuard 사용 패턴 (timeline/page.tsx 참조)**:
```typescript
import { AuthGuard } from '@/components/auth/AuthGuard';

// 페이지 컴포넌트 내에서
return (
  <AuthGuard requireAuth={true}>
    {/* 기존 페이지 콘텐츠 */}
  </AuthGuard>
);
```

**주의 사항**:
- 모든 페이지는 'use client' 컴포넌트
- AuthGuard는 이미 로딩 상태 처리 포함
- requireAuth={true} 속성 필수
- 기존 페이지 구조는 유지하고 AuthGuard로 감싸기만 함

### 📊 진행 상황
- **전체 작업**: 16개 (페이지 14개 + QA 2개)
- **완료**: 16개 ✅
- **진행 중**: 0개
- **대기 중**: 0개

### ✅ 작업 완료 요약
모든 14개 페이지에 AuthGuard 적용 및 QA 검증 완료했습니다.

**수정된 파일**:
1. app/second-brain/clarify/page.tsx - 타입 에러 수정 (appUser?.id || '')
2. app/second-brain/areas/page.tsx - AuthGuard 추가

**검증 결과**:
- TypeScript 타입 체크: 통과 ✅
- ESLint 검사: 오류 없음 ✅
- 웹 빌드: 성공 ✅
- 모바일 빌드: 성공 ✅
- 14개 페이지 AuthGuard 검증: 모두 완료 ✅
