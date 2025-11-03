# 명료화 페이지 디자인 일관성 개선 작업 계획

## 📋 현황 분석

### 수집 페이지 (디자인 기준)
- **배경색**: `bg-base-200` (통일된 배경)
- **헤더**:
  - 제목: `text-2xl font-bold`
  - 설명: `mt-2 text-sm font-medium text-base-content/70`
  - 헤더 컨테이너: `sticky top-0 z-10 bg-base-200 border-b border-base-300`
- **레이아웃**:
  - 콘텐츠: `max-w-3xl mx-auto px-4 py-2`
  - 섹션 구분: 없음 (단순 리스트 구조)
- **탭**:
  - DaisyUI `tabs tabs-boxed` 사용
  - 배지: `badge badge-sm`
- **카드**:
  - `bg-white` 고정
  - 스와이프 삭제 기능

### 명료화 페이지 (수정 대상)
- **배경색**: `bg-base-100` (밝은 배경)
- **헤더**:
  - 제목: `text-2xl font-bold mb-1`
  - 설명: `text-sm text-base-content/70`
  - 헤더 컨테이너: `sticky top-0 z-10 bg-base-100 border-b border-base-300`
- **레이아웃**:
  - 콘텐츠: `max-w-3xl mx-auto px-4 py-6 space-y-8`
  - 섹션 구분: `<div className="divider"></div>` 사용
- **탭**:
  - 커스텀 `InboxTabs` 컴포넌트 사용
  - 카운트 배지 표시

## 🎯 작업 목표

수집 페이지의 디자인을 기준으로 명료화 페이지의 디자인 일관성과 통일성을 개선합니다.

## ✅ 작업 항목

### 1. 배경색 통일
- [ ] 페이지 배경: `bg-base-100` → `bg-base-200` 변경
- [ ] 헤더 배경: `bg-base-100` → `bg-base-200` 변경

### 2. 헤더 스타일 통일
- [ ] 제목 여백: `mb-1` 제거
- [ ] 설명 스타일: `text-sm text-base-content/70` → `mt-2 text-sm font-medium text-base-content/70` 변경

### 3. 레이아웃 일관성
- [ ] 콘텐츠 패딩: `py-6` → `py-2` 변경
- [ ] 콘텐츠 간격: `space-y-8` 제거 또는 축소 검토

### 4. 섹션 구분 검토
- [ ] `<div className="divider"></div>` 사용 여부 재검토
- [ ] 명료화 페이지 특성상 섹션 구분 필요 시 디자인 결정

### 5. 하위 컴포넌트 스타일 검토 (필요시)
- [ ] InboxTabs 컴포넌트 스타일 확인
- [ ] TodoInboxList, NoteInboxList, ProjectInboxList, GoalInboxList 스타일 확인
- [ ] ActiveProjectsSection, GTDGuideSection 스타일 확인

## 📝 구현 방법

### app/second-brain/clarify/page.tsx 수정 포인트

```tsx
// 1. 배경색 변경 (250라인)
- <div className="min-h-screen bg-base-100 pb-20">
+ <div className="min-h-screen bg-base-200 pb-20">

// 2. 헤더 배경색 변경 (252라인)
- <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
+ <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">

// 3. 헤더 제목/설명 스타일 (254-257라인)
- <h1 className="text-2xl font-bold mb-1">명료화</h1>
- <p className="text-sm text-base-content/70">
+ <h1 className="text-2xl font-bold">명료화</h1>
+ <p className="mt-2 text-sm font-medium text-base-content/70">
    수집한 항목을 분류하고 처리하세요
  </p>

// 4. 콘텐츠 패딩 변경 (261라인)
- <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
+ <div className="max-w-3xl mx-auto px-4 py-2">

// 5. 섹션 간격 조정 (필요시)
// space-y-8 제거 후 개별 섹션에 mb-6 또는 mb-4 적용 검토
```

### 섹션 구조 조정 (선택사항)

```tsx
// divider 제거 또는 간격 축소
- <div className="divider"></div>
+ {/* 필요시 더 작은 간격으로 대체 */}
```

## 🔍 검증 사항

- [ ] 웹 환경에서 테스트 (`npm run dev:web`)
- [ ] 모바일 환경에서 테스트 (`npm run dev:mobile`)
- [ ] 라이트/다크 테마 모두에서 확인
- [ ] 수집함 탭 전환 동작 확인
- [ ] 프로젝트/목표 편집 모달 정상 작동 확인
- [ ] 반응형 디자인 확인 (모바일 상단 여백 `pt-10`)

## 🎨 주요 디자인 차이점 요약

| 항목 | 수집 페이지 (기준) | 명료화 페이지 (현재) | 변경 방향 |
|------|------------------|-------------------|----------|
| 배경색 | `bg-base-200` | `bg-base-100` | → `bg-base-200` |
| 헤더 배경 | `bg-base-200` | `bg-base-100` | → `bg-base-200` |
| 제목 여백 | 없음 | `mb-1` | `mb-1` 제거 |
| 설명 여백 | `mt-2` | 없음 | `mt-2` 추가 |
| 설명 폰트 | `font-medium` | 없음 | `font-medium` 추가 |
| 콘텐츠 패딩 | `py-2` | `py-6` | → `py-2` |
| 섹션 간격 | 없음 | `space-y-8` | 축소 검토 |

## 📌 참고사항

- 수집 페이지는 단순 리스트 구조, 명료화는 여러 섹션 구조 → 구조적 차이 유지
- 명료화 페이지의 섹션 구분(divider)은 정보 구조상 필요할 수 있으므로 유지 가능
- 하위 컴포넌트(InboxTabs 등)의 스타일은 기능에 영향을 주지 않는 범위에서 조정
- 편집 모달(ProjectEditDialog, GoalEditDialog)은 기존 디자인 유지

## 📂 관련 파일

- `app/second-brain/clarify/page.tsx` - 명료화 페이지 메인 파일 (수정 대상)
- `app/second-brain/inbox/page.tsx` - 수집 페이지 (디자인 기준)
- `components/second-brain/clarify/InboxTabs.tsx` - 수집함 탭 컴포넌트
- `components/second-brain/clarify/TodoInboxList.tsx` - 할일 수집함 리스트
- `components/second-brain/clarify/NoteInboxList.tsx` - 노트 수집함 리스트
- `components/second-brain/clarify/ProjectInboxList.tsx` - 프로젝트 수집함 리스트
- `components/second-brain/clarify/GoalInboxList.tsx` - 목표 수집함 리스트
- `components/second-brain/clarify/ActiveProjectsSection.tsx` - 진행중인 프로젝트 섹션
- `components/second-brain/clarify/GTDGuideSection.tsx` - GTD 가이드 섹션

## 🚀 다음 단계

1. 각 작업 항목을 순차적으로 구현
2. 각 변경사항마다 웹/모바일 환경에서 테스트
3. 라이트/다크 테마에서 모두 확인
4. 최종 검증 후 사용자 승인 요청
5. 승인 후 커밋

---

**작성일**: 2025-11-03
**작성자**: Claude Code
**상태**: 계획 완료, 구현 대기
**수정 대상**: 명료화 페이지 (app/second-brain/clarify/page.tsx)
**디자인 기준**: 수집 페이지 (app/second-brain/inbox/page.tsx)
