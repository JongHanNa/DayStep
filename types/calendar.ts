/**
 * Google Calendar 이벤트 타입 정의
 */
export interface CalendarEvent {
  /** 이벤트 고유 ID */
  id: string;
  /** 이벤트 제목 */
  title: string;
  /** 시작 시간 (ISO 8601 형식) */
  start: string;
  /** 종료 시간 (ISO 8601 형식) */
  end: string;
  /** 종일 이벤트 여부 */
  isAllDay: boolean;
  /** 이벤트 설명 */
  description?: string;
  /** 위치 정보 */
  location?: string;
  /** 소속 캘린더 ID */
  calendarId: string;
  /** 이벤트 소스 */
  source: 'google_calendar';
  /** 반복 패턴 정보 (있는 경우) */
  recurrence?: string[];
  /** 이벤트 생성자 */
  creator?: {
    email?: string;
    displayName?: string;
  };
  /** 이벤트 주최자 */
  organizer?: {
    email?: string;
    displayName?: string;
  };
  /** 참석자 목록 */
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
}

/**
 * Google Calendar 캘린더 정보
 */
export interface GoogleCalendar {
  /** 캘린더 고유 ID */
  id: string;
  /** 캘린더 이름 */
  name: string;
  /** 기본 캘린더 여부 */
  primary: boolean;
  /** 캘린더 배경색 */
  backgroundColor?: string;
  /** 캘린더 접근 권한 */
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  /** 캘린더 설명 */
  description?: string;
  /** 시간대 */
  timeZone?: string;
}

/**
 * Google Calendar API 응답 타입
 */
export interface GoogleCalendarApiEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

/**
 * Google Calendar API 캘린더 리스트 응답 타입
 */
export interface GoogleCalendarApiCalendar {
  id?: string;
  summary?: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
  timeZone?: string;
}

/**
 * 캘린더 동기화 설정
 */
export interface CalendarSyncSettings {
  /** 동기화 간격 (분 단위) */
  syncInterval: number;
  /** 자동 동기화 활성화 여부 */
  autoSync: boolean;
  /** 동기화할 기간 (일 단위) */
  syncPeriodDays: number;
  /** 선택된 캘린더 ID 목록 */
  selectedCalendars: string[];
  /** 마지막 동기화 시간 */
  lastSyncTime?: Date;
}

/**
 * OAuth 토큰 정보
 */
export interface GoogleOAuthTokens {
  /** 액세스 토큰 */
  access_token: string;
  /** 리프레시 토큰 */
  refresh_token?: string;
  /** 토큰 만료 시간 (Unix timestamp) */
  expiry_date?: number;
  /** 토큰 타입 */
  token_type?: string;
  /** 스코프 */
  scope?: string;
}

/**
 * 타임라인 통합을 위한 캘린더 이벤트 타입
 */
export interface TimelineCalendarEvent extends CalendarEvent {
  /** 타임라인 아이템 타입 */
  type: 'calendar_event';
  /** 완료 상태 (캘린더 이벤트는 항상 false) */
  isCompleted: false;
  /** 카테고리 */
  category: 'calendar';
  /** 시작 시간 (시간 지정 이벤트용) */
  startTime?: string;
  /** 종료 시간 (시간 지정 이벤트용) */
  endTime?: string;
}

/**
 * 캘린더 연동 상태
 */
export interface CalendarConnectionStatus {
  /** 연결 상태 */
  isConnected: boolean;
  /** 인증 상태 */
  isAuthenticated: boolean;
  /** 동기화 진행 중 여부 */
  isSyncing: boolean;
  /** 마지막 동기화 시간 */
  lastSyncTime?: Date;
  /** 연결된 캘린더 수 */
  connectedCalendarsCount: number;
  /** 총 이벤트 수 */
  totalEventsCount: number;
  /** 오류 메시지 */
  error?: string;
}