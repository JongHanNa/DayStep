# Timeline Components

타임라인 컴포넌트들이 기능별로 정리된 구조입니다.

## 📁 폴더 구조

```
components/timeline/
├── index.ts                    # 메인 entry point - 모든 컴포넌트 export
├── containers/                 # 메인 컨테이너 컴포넌트들
│   ├── index.ts               # containers export
│   ├── TimelineContainer.tsx  # 메인 타임라인 컨테이너
│   ├── ModernDayView.tsx      # 일별 타임라인 뷰
│   ├── TimelineWeekView.tsx   # 주별 타임라인 뷰
│   └── TimelineMonthView.tsx  # 월별 타임라인 뷰
├── sections/                   # 섹션별 컴포넌트들
│   ├── index.ts               # sections export
│   ├── AllDaySection.tsx      # 종일 일정 섹션
│   ├── AnytimeSection.tsx     # 언제든 할일 섹션
│   ├── CompletedSection.tsx   # 완료된 일정 섹션
│   └── TimedItemsSection.tsx  # 시간 지정 일정 섹션
├── items/                      # 개별 아이템 관련
│   ├── index.ts               # items export
│   ├── TimelineItemCard.tsx   # 타임라인 아이템 카드
│   └── InlineEditableText.tsx # 인라인 편집 텍스트
├── indicators/                 # 시간/상태 표시 컴포넌트들
│   ├── index.ts                      # indicators export
│   ├── CurrentTimeIndicator.tsx      # 현재 시간 인디케이터 (토글 버튼 포함)
│   ├── CurrentTimeMarker.tsx         # 현재 시간 마커 라인
│   ├── NextTaskTimeIndicator.tsx     # 다음 할일 시간 표시
│   ├── RemainingTimeIndicator.tsx    # 남은 시간 표시
│   ├── SimpleRemainingTime.tsx       # 간단한 남은 시간 위젯
│   ├── TimeGapIndicator.tsx          # 시간 간격 표시
│   ├── TimeIndicator.tsx             # 시간 표시
│   └── TimelineGapIndicator.tsx      # 타임라인 간격 표시
├── dnd/                        # 드래그앤드롭 관련
│   ├── index.ts                     # dnd export
│   ├── TimelineDndProvider.tsx      # DnD 컨텍스트 제공자
│   ├── DraggableTimelineItem.tsx    # 드래그 가능한 아이템
│   ├── DraggableRemainingTime.tsx   # 드래그 가능한 남은 시간
│   └── DroppableTimelineArea.tsx    # 드롭 가능한 영역
├── controls/                   # 입력/컨트롤 컴포넌트들
│   ├── index.ts                    # controls export
│   ├── DatePicker.tsx              # 날짜 선택기
│   ├── DateTimeRangePicker.tsx     # 날짜/시간 범위 선택기
│   ├── TimePicker.tsx              # 시간 선택기
│   ├── TimelineFilters.tsx         # 타임라인 필터
│   ├── TimelineHeader.tsx          # 타임라인 헤더
│   ├── CalendarPanel.tsx          # 드래그업 모달 달력
│   └── FloatingActionButton.tsx   # 플로팅 액션 버튼
└── README.md                   # 이 파일
```

## 🎯 사용 방법

### 개별 컴포넌트 import
```typescript
// 특정 컴포넌트만 import
import { TimelineContainer } from '@/components/timeline/containers';
import { AllDaySection } from '@/components/timeline/sections';
import { CurrentTimeIndicator } from '@/components/timeline/indicators';
```

### 전체 컴포넌트 import
```typescript
// 메인 entry point에서 모든 컴포넌트 import
import { 
  TimelineContainer, 
  ModernDayView,
  AllDaySection,
  CurrentTimeIndicator,
  TimelineDndProvider
} from '@/components/timeline';
```

## 📋 컴포넌트 분류 기준

- **containers**: 다른 컴포넌트들을 조합하는 메인 컨테이너들
- **sections**: 타임라인의 각 영역을 담당하는 섹션 컴포넌트들  
- **items**: 개별 아이템 표시 및 편집 관련 컴포넌트들
- **indicators**: 시간, 상태 등의 정보를 시각적으로 표시하는 컴포넌트들
- **dnd**: 드래그앤드롭 기능을 위한 컴포넌트들
- **controls**: 사용자 입력 및 제어를 위한 컴포넌트들

## 🔄 의존성 관계

```
containers (최상위)
    ↓ imports
sections + controls + dnd
    ↓ imports
items + indicators
```

상위 레벨 컴포넌트가 하위 레벨 컴포넌트를 import하는 구조로 되어 있어 순환 의존성을 방지합니다.