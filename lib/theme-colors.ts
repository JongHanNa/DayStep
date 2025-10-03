/**
 * 🎨 중앙화된 테마 색상 관리 시스템
 *
 * 📍 사용 위치별 색상 매핑:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 🛡️ SAFE AREA (세이프티 에리어)                                │
 * │ - app/layout.tsx: 화면 최외곽 테두리                         │
 * │ - app/globals.css: --background CSS 변수                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 📅 TIMELINE HEADER (타임라인 헤더)                           │
 * │ - TimelineHeader.tsx: 날짜 네비게이션, 버튼들, 달력 패널      │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 📋 TIMELINE BODY (타임라인 몸통)                             │
 * │ - ModernDayView.tsx: 메인 타임라인 컨테이너                   │
 * │ - TimelineContainer.tsx: 타임라인 래퍼                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 🏷️ SECTION HEADERS (섹션 헤더들)                            │
 * │ - AllDaySection.tsx: "종일 일정" 섹션                       │
 * │ - AnytimeSection.tsx: "언제든지" 섹션                        │
 * │ - TimedItemsSection.tsx: "시간 지정" 섹션                    │
 * │ - CompletedSection.tsx: "완료됨" 섹션                        │
 * └─────────────────────────────────────────────────────────────┘
 */

export const themeColors = {
  // 🛡️ 세이프티 에리어 (화면 최외곽 테두리) - 이제 앱 기본색 사용
  safeArea: {
    background: '#ffffff',   // 사용 위치: app/layout.tsx, app/globals.css (앱 기본 배경색)
  },

  // 📅 타임라인 전용 색상 (타임라인 화면에서만 사용)
  timeline: {
    header: '#f8f8f8',       // 사용 위치: TimelineHeader.tsx
    background: '#f8f8f8',   // 사용 위치: ModernDayView.tsx, TimelineContainer.tsx
    section: '#f8f8f8',      // 사용 위치: AllDay/Anytime/TimedItems/CompletedSection.tsx
    hover: '#eeeeee',        // 호버 상태 (모든 섹션 헤더들)
  },

  // 🎨 앱 기본 색상 (전역 사용)
  background: {
    primary: '#ffffff',      // 앱 기본 배경색 (모달, 버튼 등)
    secondary: '#ffffff',     // 카드, 모달 등
    accent: '#f1f5f9',       // 호버, 포커스 등 (약간 더 연한 회색)
  },

  // 다크 모드 색상 (필요시 확장)
  dark: {
    background: {
      primary: '#0f172a',    // 다크 모드 기본 배경색
      secondary: '#1e293b',   // 다크 카드 색상
      accent: '#334155',     // 다크 호버 색상
    },
    timeline: {
      background: '#1e293b',  // 다크 모드 타임라인 배경색 (기본보다 밝음)
      header: '#1e293b',
      section: '#1e293b',
      hover: '#334155',
    },
    safeArea: {
      background: '#0f172a',  // 다크 모드 앱 기본 배경색
    },
  }
} as const;

/**
 * CSS 변수명과 색상값 매핑
 */
export const cssVariableMap = {
  '--background': themeColors.background.primary,
  '--timeline-bg': themeColors.timeline.background,
  '--timeline-header-bg': themeColors.timeline.header,
  '--timeline-section-bg': themeColors.timeline.section,
  '--safe-area-bg': themeColors.safeArea.background,
} as const;

/**
 * 🏷️ Tailwind 클래스명 생성 헬퍼
 *
 * 사용법: const { timelineHeader, safeAreaBackground } = getTailwindClasses();
 *
 * 📍 각 클래스 사용 위치:
 * - safeAreaBackground: app/layout.tsx (화면 최외곽)
 * - timelineHeader: TimelineHeader.tsx (헤더 영역)
 * - timelineBackground: ModernDayView.tsx, TimelineContainer.tsx (몸통)
 * - timelineSection: AllDay/Anytime/TimedItems/CompletedSection.tsx (섹션들)
 */
export const getTailwindClasses = () => ({
  // 🛡️ 세이프티 에리어 (화면 테두리)
  safeAreaBackground: `bg-[${themeColors.safeArea.background}]`,
  darkSafeArea: `dark:bg-[${themeColors.dark.safeArea.background}]`,

  // 📅 타임라인 헤더 (상단 네비게이션)
  timelineHeader: `bg-[${themeColors.timeline.header}]`,
  darkTimelineHeader: `dark:bg-[${themeColors.dark.timeline.header}]`,

  // 📋 타임라인 몸통 (메인 컨테이너)
  timelineBackground: `bg-[${themeColors.timeline.background}]`,
  darkTimelineBackground: `dark:bg-[${themeColors.dark.timeline.background}]`,

  // 🏷️ 섹션 헤더들 (종일, 언제든지, 시간지정, 완료됨)
  timelineSection: `bg-[${themeColors.timeline.section}]`,

  // 🎯 호버 효과
  timelineHover: `hover:bg-[${themeColors.timeline.hover}]`,
});

/**
 * 🎨 인라인 스타일 생성 헬퍼
 *
 * 사용법: const { timelineHeader } = getInlineStyles();
 *         <div style={timelineHeader}>...</div>
 *
 * 📍 각 스타일 사용 위치:
 * - timelineHeader: TimelineHeader.tsx (조건부 버튼 스타일)
 * - timelineBackground: TimelineContainer.tsx (!important 필요시)
 * - safeAreaBackground: ThemeProvider.tsx (CSS 변수 동적 설정)
 */
export const getInlineStyles = () => ({
  // 📅 타임라인 헤더 (조건부 스타일용)
  timelineHeader: {
    backgroundColor: themeColors.timeline.header,
    '--tw-bg-opacity': '1',
  },

  // 📋 타임라인 몸통 (!important 오버라이드용)
  timelineBackground: {
    backgroundColor: themeColors.timeline.background,
    '--tw-bg-opacity': '1',
  },

  // 🛡️ 세이프티 에리어 (CSS 변수 동적 설정용)
  safeAreaBackground: {
    backgroundColor: themeColors.safeArea.background,
    '--tw-bg-opacity': '1',
  },
});

/**
 * 🔧 CSS 변수 업데이트 함수
 *
 * 사용 위치: components/theme-provider.tsx
 * 역할: 테마 변경 시 CSS 변수를 동적으로 업데이트
 */
export const updateCSSVariables = (element: HTMLElement = document.documentElement) => {
  Object.entries(cssVariableMap).forEach(([variable, value]) => {
    element.style.setProperty(variable, value);
  });
};

/**
 * 📋 사용 가이드
 *
 * 🎯 색상 변경하기:
 * 1. 이 파일에서 원하는 색상 값만 변경
 * 2. 모든 관련 영역이 자동으로 업데이트됨
 *
 * 예시: 모든 타임라인 배경을 빨간색으로 변경
 * ┌─────────────────────────────────────────────────┐
 * │ safeArea: {                                     │
 * │   background: '#ffebee',  // 연한 빨간색         │
 * │ },                                              │
 * │ timeline: {                                     │
 * │   header: '#ffebee',      // 연한 빨간색         │
 * │   background: '#ffebee',  // 연한 빨간색         │
 * │   section: '#ffebee',     // 연한 빨간색         │
 * │ }                                               │
 * └─────────────────────────────────────────────────┘
 *
 * 🔍 어디가 바뀌는지 확인:
 * - 세이프티 에리어: 화면 최외곽 테두리
 * - 타임라인 헤더: 날짜 네비게이션, 버튼들
 * - 타임라인 몸통: 할일 목록이 표시되는 메인 영역
 * - 섹션 헤더: "종일", "언제든지", "시간지정", "완료됨" 섹션들
 */