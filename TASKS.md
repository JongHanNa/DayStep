# 수집 페이지 디자인 일관성 개선 작업 계획

## 📋 현황 분석

### 명료화 페이지 (기준)
- **배경색**: `bg-base-100` (밝은 배경)
- **헤더**:
  - 제목: `text-2xl font-bold mb-1`
  - 설명: `text-sm text-base-content/70`
  - 헤더 컨테이너: `sticky top-0 z-10 bg-base-100 border-b border-base-300`
- **레이아웃**:
  - 콘텐츠: `max-w-3xl mx-auto px-4 py-6 space-y-8`
  - 섹션 구분: `<div className="divider"></div>`
- **탭**:
  - 커스텀 `InboxTabs` 컴포넌트 사용
  - 카운트 배지 표시

### 수집 페이지 (현재)
- **배경색**: `bg-base-200` (어두운 배경)
- **헤더**:
  - 제목: `text-2xl font-bold`
  - 설명: `mt-2 text-sm font-medium text-base-content/70`
  - 헤더 컨테이너: `sticky top-0 z-10 bg-base-200 border-b border-base-300`
- **레이아웃**:
  - 콘텐츠: `max-w-3xl mx-auto px-4 py-2`
  - 섹션 구분: 없음
- **탭**:
  - DaisyUI `tabs tabs-boxed` 사용
  - 배지: `badge badge-sm`
- **카드**:
  - `bg-white` 고정 (명료화는 없음)
  - 스와이프 삭제 기능

## 🎯 작업 목표

명료화 페이지의 디자인을 기준으로 수집 페이지의 일관성을 개선합니다.

## ✅ 작업 항목

### 1. 배경색 통일
- [ ] `bg-base-200` → `bg-base-100` 변경
- [ ] 헤더 배경색도 `bg-base-200` → `bg-base-100` 변경

### 2. 헤더 스타일 통일
- [ ] 제목 여백: `mb-1` 추가 (명료화와 동일)
- [ ] 설명 스타일: `mt-2 font-medium` → 제거, `text-sm text-base-content/70`만 유지

### 3. 레이아웃 일관성
- [ ] 콘텐츠 패딩: `py-2` → `py-6` 변경
- [ ] 콘텐츠 간격: `space-y-2` → `space-y-8` 검토 (필요시)

### 4. 카드 스타일 개선
- [ ] 카드 배경: `bg-white` → `bg-base-100` 또는 테마에 따라 동적으로 변경
- [ ] hover 효과: `hover:bg-base-100` → `hover:bg-base-200` 검토

### 5. 빈 상태 메시지 개선 (선택사항)
- [ ] 이모지 크기, 메시지 스타일이 명료화와 일관되는지 확인

## 📝 구현 방법

### app/second-brain/inbox/page.tsx 수정 포인트

```tsx
// 1. 배경색 변경 (403라인)
- <div className="min-h-screen bg-base-200 pb-20">
+ <div className="min-h-screen bg-base-100 pb-20">

// 2. 헤더 배경색 변경 (405라인)
- <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
+ <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">

// 3. 헤더 제목/설명 스타일 (409-410라인)
- <h1 className="text-2xl font-bold">수집</h1>
- <p className="mt-2 text-sm font-medium text-base-content/70">빠른 수집을 위한 페이지입니다</p>
+ <h1 className="text-2xl font-bold mb-1">수집</h1>
+ <p className="text-sm text-base-content/70">빠른 수집을 위한 페이지입니다</p>

// 4. 콘텐츠 패딩 (547라인)
- <div className="max-w-3xl mx-auto px-4 py-2">
+ <div className="max-w-3xl mx-auto px-4 py-6">

// 5. 카드 배경색 (580라인)
- className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full"
+ className="relative bg-base-100 hover:bg-base-200 transition-colors cursor-pointer w-full"

// 6. 편집 모드 액션 바 배경 (493라인)
- <div className="mt-3 p-3 bg-base-200 rounded-lg flex items-center justify-between">
+ <div className="mt-3 p-3 bg-base-100 rounded-lg flex items-center justify-between">
```

## 🔍 검증 사항

- [ ] 웹 환경에서 테스트
- [ ] 모바일 환경에서 테스트 (BUILD_TARGET=mobile)
- [ ] 라이트/다크 테마 모두에서 확인
- [ ] 편집 모드 동작 확인
- [ ] 스와이프 삭제 기능 정상 작동 확인

## 📌 참고사항

- 명료화 페이지는 섹션 구분(`divider`)을 사용하지만, 수집 페이지는 단순 리스트이므로 추가하지 않음
- 탭 스타일은 기능상 차이가 있어 현재 유지 (수집: DaisyUI tabs, 명료화: 커스텀 컴포넌트)
- 스와이프 삭제 기능은 수집 페이지만의 고유 기능이므로 유지

## 📂 관련 파일

- `app/second-brain/inbox/page.tsx` - 수집 페이지 메인 파일
- `app/second-brain/clarify/page.tsx` - 명료화 페이지 (디자인 기준)
- `components/second-brain/TodoEditModal.tsx` - 할일 편집 모달
- `components/second-brain/NoteEditModal.tsx` - 노트 편집 모달

## 🚀 다음 단계

1. 각 작업 항목을 순차적으로 구현
2. 각 변경사항마다 웹/모바일 환경에서 테스트
3. 라이트/다크 테마에서 모두 확인
4. 최종 검증 후 커밋

---

**작성일**: 2025-11-03
**작성자**: Claude Code
**상태**: 계획 완료, 구현 대기
