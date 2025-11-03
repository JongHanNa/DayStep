# 명료화 페이지 디자인 일관성 작업

## 📋 개요
수집 페이지(inbox/page.tsx)의 디자인 스타일을 기준으로 명료화 페이지(clarify/page.tsx)의 디자인을 통일하는 작업입니다. 명료화 페이지의 고유 기능(진행중인 프로젝트, GTD 가이드)은 유지하면서 시각적 일관성을 확보합니다.

## 🎯 주요 디자인 차이점

### 1. 배경색 시스템
- **수집**: `bg-base-200` (전체), 카드 `bg-white hover:bg-base-100`
- **명료화**: `bg-base-100` (전체), 카드 `bg-base-200 hover:bg-base-300`
- **목표**: 배경색을 수집 페이지와 통일

### 2. 헤더 구조
- **수집**: 제목 + 설명 + 추가/편집 버튼, `tabs-boxed` 스타일, `sticky top-0`
- **명료화**: 제목 + 설명만, 별도 InboxTabs 컴포넌트, 단순 헤더
- **목표**: 헤더 레이아웃과 탭 스타일 통일

### 3. 탭 구현
- **수집**: DaisyUI `tabs-boxed` 클래스 사용, 배지 표시
- **명료화**: 커스텀 InboxTabs 컴포넌트, 아이콘 + 배지
- **목표**: `tabs-boxed` 스타일로 통일 (아이콘 유지 가능)

### 4. 카드 디자인
- **수집**:
  - `bg-white hover:bg-base-100`
  - `rounded-lg`
  - 스와이프 삭제 기능 (motion.div)
  - 편집 모드 체크박스
- **명료화**:
  - `bg-base-200 hover:bg-base-300`
  - `rounded-lg`
  - 단순 버튼 클릭
- **목표**: 카드 배경색과 호버 효과 통일

### 5. 빈 상태 디자인
- **수집**: 큰 이모지(📥) + 2단계 텍스트 (제목 + 설명)
- **명료화**: 텍스트만
- **목표**: 수집 페이지와 동일한 빈 상태 디자인 적용

## ✅ 완료

(없음)

## 🔄 진행중

(없음)

## 📝 Todo

### Phase 1: 메인 페이지 배경색 및 헤더 통일
- [ ] **1.1 배경색 변경** (clarify/page.tsx)
  - 파일: `/app/second-brain/clarify/page.tsx`
  - 변경: `bg-base-100` → `bg-base-200` (라인 250)
  - 헤더 배경: `bg-base-100` → `bg-base-200` (라인 252)
  - 우선순위: 높음

- [ ] **1.2 헤더 패딩 통일** (clarify/page.tsx)
  - 파일: `/app/second-brain/clarify/page.tsx`
  - 현재: `py-4` (라인 253)
  - 목표: 수집 페이지와 동일한 조건부 패딩 적용
  - 변경: `${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`
  - 우선순위: 중간

- [ ] **1.3 제목 하단 여백 제거** (clarify/page.tsx)
  - 파일: `/app/second-brain/clarify/page.tsx`
  - 현재: `mb-1` (라인 254)
  - 목표: 수집 페이지와 동일 (여백 없음)
  - 변경: `mb-1` 제거
  - 우선순위: 낮음

### Phase 2: InboxTabs 컴포넌트 스타일 통일
- [ ] **2.1 tabs-boxed 스타일 적용** (InboxTabs.tsx)
  - 파일: `/components/second-brain/clarify/InboxTabs.tsx`
  - 현재: 커스텀 스타일 (`bg-base-200 rounded-full`)
  - 목표: DaisyUI `tabs-boxed` 클래스 사용
  - 변경사항:
    - 컨테이너: `tabs tabs-boxed inline-flex` 클래스 사용
    - 버튼: `tab` 클래스, 활성화 시 `tab-active`
    - 배지: 수집 페이지와 동일한 스타일
  - 참고: `/app/second-brain/inbox/page.tsx` 라인 453-489
  - 우선순위: 높음

- [ ] **2.2 아이콘 및 배지 스타일 조정** (InboxTabs.tsx)
  - 파일: `/components/second-brain/clarify/InboxTabs.tsx`
  - 현재: 아이콘 + 라벨 + 배지 (라인 42-52)
  - 목표: 아이콘 유지하되 배지 스타일 수집 페이지와 통일
  - 변경:
    - 배지 조건: `{count > 0 && ...}`
    - 배지 스타일: `badge badge-sm` (활성 탭 여부 무관)
  - 우선순위: 중간

- [ ] **2.3 탭 위치 조정** (clarify/page.tsx)
  - 파일: `/app/second-brain/clarify/page.tsx`
  - 현재: "수집함 비우기" 제목 아래 위치 (라인 267)
  - 목표: 헤더 내부로 이동 (페이지 제목 + 설명 아래)
  - 변경:
    - InboxTabs를 헤더 div 내부로 이동
    - `overflow-x-auto` 래퍼 추가 (수집 페이지 라인 452 참고)
  - 우선순위: 높음

### Phase 3: 카드 리스트 디자인 통일
- [ ] **3.1 TodoInboxList 카드 스타일 변경**
  - 파일: `/components/second-brain/clarify/TodoInboxList.tsx`
  - 현재: `bg-base-200 hover:bg-base-300` (라인 181)
  - 목표: `bg-white hover:bg-base-100`
  - 변경: 배경색 클래스 교체
  - 우선순위: 높음

- [ ] **3.2 NoteInboxList 카드 스타일 변경**
  - 파일: `/components/second-brain/clarify/NoteInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: `bg-white hover:bg-base-100`
  - 우선순위: 높음

- [ ] **3.3 ProjectInboxList 카드 스타일 변경**
  - 파일: `/components/second-brain/clarify/ProjectInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: `bg-white hover:bg-base-100`
  - 우선순위: 높음

- [ ] **3.4 GoalInboxList 카드 스타일 변경**
  - 파일: `/components/second-brain/clarify/GoalInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: `bg-white hover:bg-base-100`
  - 우선순위: 높음

### Phase 4: 빈 상태 디자인 통일
- [ ] **4.1 TodoInboxList 빈 상태**
  - 파일: `/components/second-brain/clarify/TodoInboxList.tsx`
  - 현재: 이모지 + 2단계 텍스트 (라인 162-170)
  - 목표: 수집 페이지와 동일한 스타일 확인
  - 참고: `/app/second-brain/inbox/page.tsx` 라인 549-557
  - 우선순위: 낮음

- [ ] **4.2 NoteInboxList 빈 상태**
  - 파일: `/components/second-brain/clarify/NoteInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: 수집 페이지와 동일한 패턴
  - 우선순위: 낮음

- [ ] **4.3 ProjectInboxList 빈 상태**
  - 파일: `/components/second-brain/clarify/ProjectInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: 수집 페이지와 동일한 패턴
  - 우선순위: 낮음

- [ ] **4.4 GoalInboxList 빈 상태**
  - 파일: `/components/second-brain/clarify/GoalInboxList.tsx`
  - 현재 스타일 확인 필요
  - 목표: 수집 페이지와 동일한 패턴
  - 우선순위: 낮음

### Phase 5: 추가 섹션 디자인 조정
- [ ] **5.1 ActiveProjectsSection 배경색 확인**
  - 파일: `/components/second-brain/clarify/ActiveProjectsSection.tsx`
  - 목표: `bg-base-200` 환경에 맞게 카드 배경 조정
  - 확인: 카드 배경이 `bg-white` 또는 적절한 대비색인지 확인
  - 우선순위: 중간

- [ ] **5.2 GTDGuideSection 배경색 확인**
  - 파일: `/components/second-brain/clarify/GTDGuideSection.tsx`
  - 목표: `bg-base-200` 환경에 맞게 카드 배경 조정
  - 확인: 카드 배경이 `bg-white` 또는 적절한 대비색인지 확인
  - 우선순위: 중간

- [ ] **5.3 섹션 타이틀 스타일 통일**
  - 파일: `/app/second-brain/clarify/page.tsx`
  - 현재: "수집함 비우기" (라인 264), "진행중인 프로젝트", "GTD 알고리즘"
  - 목표: 수집 페이지와 유사한 타이틀 스타일
  - 변경: 폰트 크기, 여백 등 확인 및 조정
  - 우선순위: 낮음

### Phase 6: 최종 검증 및 개선
- [ ] **6.1 웹 환경 시각적 검증**
  - 테스트: 브라우저에서 수집/명료화 페이지 비교
  - 확인:
    - 배경색 일관성
    - 카드 스타일 일관성
    - 탭 위치 및 스타일
    - 호버 효과
  - 우선순위: 높음

- [ ] **6.2 모바일 환경 시각적 검증**
  - 테스트: Capacitor 빌드 후 iOS/Android 확인
  - 확인:
    - 반응형 디자인 동작
    - 터치 인터랙션
    - 헤더 상단 패딩 (상태바 대응)
  - 우선순위: 중간

- [ ] **6.3 접근성 확인**
  - 확인:
    - 색상 대비 (WCAG 기준)
    - 키보드 네비게이션
    - 스크린 리더 호환성
  - 우선순위: 낮음

## 🔮 향후 고려사항

- [ ] 명료화 페이지에 편집 모드 추가 (수집 페이지 기능)
- [ ] 명료화 페이지에 스와이프 삭제 기능 추가
- [ ] 명료화 페이지에 Shift + 클릭 범위 선택 기능 추가

## 📌 작업 주의사항

### 1. 환경별 빌드 고려
- `BUILD_TARGET` 환경 변수 사용 시 웹/모바일 모두 테스트
- 반응형 우선: Tailwind breakpoint 활용

### 2. 고유 기능 유지
- 진행중인 프로젝트 섹션 (ActiveProjectsSection)
- GTD 가이드 섹션 (GTDGuideSection)
- 수집함 비우기 로직 및 GTD 알고리즘

### 3. 기존 패턴 준수
- DaisyUI 컴포넌트 우선 사용
- 색상: 테마 변수 (`bg-primary`, `bg-accent`)
- 버튼: `rounded-full` (pill shape)

### 4. 테스트 필수
- 각 Phase 완료 후 웹 환경 테스트
- Phase 6 완료 후 모바일 환경 테스트
- 기능 동작 확인 (편집 모달, 데이터 동기화 등)

## 📊 우선순위 요약

| 우선순위 | 작업 | 예상 소요 시간 |
|---------|------|---------------|
| 높음 | Phase 1 (배경색), Phase 2.1 (탭 스타일), Phase 2.3 (탭 위치), Phase 3 (카드 스타일) | 1-2시간 |
| 중간 | Phase 1.2 (헤더 패딩), Phase 2.2 (배지), Phase 5 (추가 섹션), Phase 6.2 (모바일 테스트) | 1시간 |
| 낮음 | Phase 1.3 (제목 여백), Phase 4 (빈 상태), Phase 5.3 (타이틀), Phase 6.3 (접근성) | 30분 |

**총 예상 소요 시간**: 2.5-3.5시간

## 🎯 작업 순서 권장

1. **Phase 1** → 페이지 전체 배경색 및 헤더 통일 (즉시 시각적 변화)
2. **Phase 2** → 탭 스타일 통일 (핵심 네비게이션 요소)
3. **Phase 3** → 카드 리스트 스타일 통일 (주요 콘텐츠 영역)
4. **Phase 6.1** → 웹 환경 검증 (중간 점검)
5. **Phase 4, 5** → 세부 요소 조정
6. **Phase 6.2, 6.3** → 최종 검증
