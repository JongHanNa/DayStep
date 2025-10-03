/**
 * 애플리케이션 상수 정의
 * 매직 넘버와 하드코딩된 값들을 중앙집중화
 */

// 🔧 성능 및 타이밍 상수
export const PERFORMANCE = {
  OAUTH_TIMEOUT: 5000, // 5초
  SCROLL_THROTTLE_DELAY: 100, // 100ms
  CURRENT_TIME_SCROLL_DELAY: 1000, // 1초
  CACHE_VALIDITY_PERIOD: 300000, // 5분 (300,000ms)
  HMR_DEBOUNCE_DELAY: 300, // 300ms
  PULL_REFRESH_TIMEOUT: 2000, // 2초
} as const;

// 📐 UI 레이아웃 상수
export const UI_LAYOUT = {
  SLOT_HEIGHT: 96, // px - 시간 슬롯 높이
  TOAST_OFFSET: 48, // px - 모바일 상태바 여백
  MIN_SWIPE_DISTANCE: 100, // px - 최소 스와이프 거리
  MAX_VERTICAL_DISTANCE: 80, // px - 최대 수직 이동 거리
  DRAWER_PANEL_Z_INDEX: 50,
  FLOATING_ACTION_Z_INDEX: 40,
  DRAWER_HANDLE_HEIGHT: 35, // px - 드로어 핸들 높이
} as const;

// 🎨 스타일링 상수
export const STYLING = {
  TOAST_MIN_HEIGHT: 60, // px
  TOAST_BORDER_RADIUS: 12, // px
  TOAST_PADDING: '16px 20px',
  TOAST_FONT_SIZE: '16px',
  TOAST_BOX_SHADOW: '0 4px 12px rgba(0, 0, 0, 0.15)',
  MOBILE_TOAST_CLASS: 'mobile-toast',
} as const;

// 🗂️ 캐시 및 저장소 상수
export const STORAGE = {
  SUPABASE_AUTH_SESSION_KEY: 'supabase_auth_session',
  SETTINGS_STORAGE_KEY: 'daystep-settings',
  THEME_STORAGE_KEY: 'daystep-theme',
  TIMELINE_VIEW_STATE_KEY: 'timeline-view-state',
} as const;

// 🌐 네트워크 상수
export const NETWORK = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1초
  RETRY_DELAY_MULTIPLIER: 2,
  CONNECTION_TIMEOUT: 10000, // 10초
  REQUEST_TIMEOUT: 30000, // 30초
} as const;

// 📊 데이터 처리 상수
export const DATA_PROCESSING = {
  MAX_ITEMS_PER_PAGE: 50,
  BULK_OPERATION_BATCH_SIZE: 10,
  MAX_CONCURRENT_REQUESTS: 5,
  DATE_RANGE_BUFFER_DAYS: 7, // 전후 7일씩 미리 로드
} as const;

// 🔔 알림 상수
export const NOTIFICATIONS = {
  DEFAULT_DURATION: 3000, // 3초
  SUCCESS_DURATION: 2000, // 2초
  ERROR_DURATION: 5000, // 5초
  POSITION: 'top-right',
} as const;

// 📱 모바일 환경 상수
export const MOBILE = {
  SAFE_AREA_TOP: 44, // px - iOS 노치 영역
  SAFE_AREA_BOTTOM: 34, // px - iOS 홈 인디케이터 영역
  BOTTOM_NAV_HEIGHT: 64, // px
  STATUS_BAR_HEIGHT: 20, // px
  CAPACITOR_MIN_HEIGHT: 568, // px - 최소 지원 화면 높이
} as const;

// 🎯 우선순위 색상 상수
export const PRIORITY_COLORS = {
  HIGH: {
    border: 'border-red-500 dark:border-red-400',
    background: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-300',
    accent: 'accent-red-500',
  },
  MEDIUM: {
    border: 'border-yellow-500 dark:border-yellow-400',
    background: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    accent: 'accent-yellow-500',
  },
  LOW: {
    border: 'border-green-500 dark:border-green-400',
    background: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    accent: 'accent-green-500',
  },
} as const;

// 🔒 보안 상수
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 900000, // 15분
  SESSION_TIMEOUT: 86400000, // 24시간
  TOKEN_REFRESH_THRESHOLD: 300000, // 5분 전 갱신
} as const;

// 📋 유효성 검사 상수
export const VALIDATION = {
  TODO_TITLE_MAX_LENGTH: 100,
  TODO_DESCRIPTION_MAX_LENGTH: 500,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 8,
} as const;