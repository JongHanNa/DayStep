// Date utility functions for timeline components
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isToday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  getWeek,
  getWeekOfMonth,
  getDayOfYear,
  parseISO,
  formatISO,
  isValid,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  getDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { TimelineViewMode } from '@/types/timeline-view';

// 한국 시간대 설정
export const KOREA_TIMEZONE = 'Asia/Seoul';
export const DEFAULT_LOCALE = ko;

// 날짜 포맷팅 상수
export const DATE_FORMATS = {
  FULL_DATE: 'yyyy년 M월 d일 EEEE',
  SHORT_DATE: 'M월 d일',
  MONTH_YEAR: 'yyyy년 M월',
  TIME_24H: 'HH:mm',
  TIME_12H: 'a h:mm',
  DATETIME: 'yyyy.MM.dd HH:mm',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
} as const;

// 뷰 모드별 날짜 범위 계산
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * 뷰 모드에 따른 날짜 범위를 계산합니다
 */
export function getDateRangeForViewMode(
  date: Date, 
  viewMode: TimelineViewMode
): DateRange {
  switch (viewMode) {
    case 'daily':
      return {
        start: startOfDay(date),
        end: endOfDay(date)
      };
    case 'weekly':
      return {
        start: startOfWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE }),
        end: endOfWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE })
      };
    case 'monthly':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    default:
      throw new Error(`Invalid view mode: ${viewMode}`);
  }
}

/**
 * 뷰 모드에 따른 날짜 네비게이션 계산
 */
export function navigateDate(
  currentDate: Date,
  viewMode: TimelineViewMode,
  direction: 'next' | 'previous'
): Date {
  const multiplier = direction === 'next' ? 1 : -1;
  
  switch (viewMode) {
    case 'daily':
      return addDays(currentDate, multiplier);
    case 'weekly':
      return addWeeks(currentDate, multiplier);
    case 'monthly':
      return addMonths(currentDate, multiplier);
    default:
      throw new Error(`Invalid view mode: ${viewMode}`);
  }
}

/**
 * 현재 시간으로 이동 (클라이언트 전용)
 */
export function navigateToToday(): Date {
  // SSR에서는 임시 날짜 반환, 클라이언트에서만 실제 현재 시간 사용
  if (typeof window === 'undefined') {
    // 서버에서는 고정된 날짜 반환 (hydration mismatch 방지)
    return new Date('2025-01-01');
  }
  return getKSTCurrentDate(); // KST 기준 현재 날짜
}

/**
 * 뷰 모드에 따른 날짜 표시 형식
 */
export function formatDateForViewMode(
  date: Date,
  viewMode: TimelineViewMode
): string {
  switch (viewMode) {
    case 'daily':
      return format(date, DATE_FORMATS.FULL_DATE, { locale: DEFAULT_LOCALE });
    case 'weekly': {
      const weekStart = startOfWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
      const startStr = format(weekStart, DATE_FORMATS.SHORT_DATE, { locale: DEFAULT_LOCALE });
      const endStr = format(weekEnd, DATE_FORMATS.SHORT_DATE, { locale: DEFAULT_LOCALE });
      return `${startStr} - ${endStr}`;
    }
    case 'monthly':
      return format(date, DATE_FORMATS.MONTH_YEAR, { locale: DEFAULT_LOCALE });
    default:
      return '';
  }
}

/**
 * 시간 포맷팅 (24시간 또는 12시간 형식)
 */
export function formatTime(
  date: Date,
  format24h: boolean = true
): string {
  const formatStr = format24h ? DATE_FORMATS.TIME_24H : DATE_FORMATS.TIME_12H;
  return format(date, formatStr, { locale: DEFAULT_LOCALE });
}

/**
 * 날짜가 현재 뷰 범위에 있는지 확인
 */
export function isDateInViewRange(
  date: Date,
  viewDate: Date,
  viewMode: TimelineViewMode
): boolean {
  switch (viewMode) {
    case 'daily':
      return isSameDay(date, viewDate);
    case 'weekly':
      return isSameWeek(date, viewDate, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
    case 'monthly':
      return isSameMonth(date, viewDate);
    default:
      return false;
  }
}

/**
 * 현재 뷰에서 오늘인지 확인 (클라이언트 전용)
 */
export function isTodayInViewRange(
  viewDate: Date,
  viewMode: TimelineViewMode
): boolean {
  // SSR에서는 false 반환, 클라이언트에서만 실제 체크
  if (typeof window === 'undefined') {
    return false;
  }
  const today = new Date();
  return isDateInViewRange(today, viewDate, viewMode);
}

/**
 * 날짜 차이 계산
 */
export function getDateDifference(
  startDate: Date,
  endDate: Date,
  unit: 'days' | 'weeks' | 'months'
): number {
  switch (unit) {
    case 'days':
      return differenceInDays(endDate, startDate);
    case 'weeks':
      return differenceInWeeks(endDate, startDate);
    case 'months':
      return differenceInMonths(endDate, startDate);
    default:
      return 0;
  }
}

/**
 * 주차 정보 계산
 */
export function getWeekInfo(date: Date): {
  weekOfYear: number;
  weekOfMonth: number;
  dayOfWeek: number;
  dayOfYear: number;
} {
  return {
    weekOfYear: getWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE }),
    weekOfMonth: getWeekOfMonth(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE }),
    dayOfWeek: getDay(date),
    dayOfYear: getDayOfYear(date)
  };
}

/**
 * 시간대별 슬롯 생성 (일간 뷰용)
 */
export function generateHourSlots(date: Date): Array<{
  hour: number;
  datetime: Date;
  label: string;
  isPastHour: boolean;
  isCurrentHour: boolean;
}> {
  const slots = [];
  // SSR에서는 현재 시간 계산을 비활성화
  const today = typeof window !== 'undefined' ? new Date() : date;
  const isToday_ = typeof window !== 'undefined' ? isSameDay(date, today) : false;
  const currentHour = isToday_ ? getHours(today) : -1;

  for (let hour = 0; hour < 24; hour++) {
    const datetime = setHours(setMinutes(startOfDay(date), 0), hour);
    slots.push({
      hour,
      datetime,
      label: format(datetime, 'HH:mm'),
      isPastHour: isToday_ && hour < currentHour,
      isCurrentHour: isToday_ && hour === currentHour
    });
  }

  return slots;
}

/**
 * 주간 뷰용 날짜 배열 생성
 */
export function generateWeekDays(date: Date): Array<{
  date: Date;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  isWeekend: boolean;
}> {
  const weekStart = startOfWeek(date, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
  const days = [];
  const today = typeof window !== 'undefined' ? new Date() : date;

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i);
    const dayOfWeek = getDay(dayDate);
    
    days.push({
      date: dayDate,
      dayNumber: dayDate.getDate(),
      dayName: format(dayDate, 'EEE', { locale: DEFAULT_LOCALE }),
      isToday: typeof window !== 'undefined' ? isSameDay(dayDate, today) : false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    });
  }

  return days;
}

/**
 * 월간 뷰용 주 배열 생성
 */
export function generateMonthWeeks(date: Date): Array<Array<{
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}>> {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
  
  const weeks = [];
  let currentDate = calendarStart;
  const today = typeof window !== 'undefined' ? new Date() : date;

  while (currentDate <= calendarEnd) {
    const week = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(currentDate, i);
      const dayOfWeek = getDay(dayDate);
      
      week.push({
        date: dayDate,
        dayNumber: dayDate.getDate(),
        isCurrentMonth: isSameMonth(dayDate, date),
        isToday: typeof window !== 'undefined' ? isSameDay(dayDate, today) : false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    
    weeks.push(week);
    currentDate = addWeeks(currentDate, 1);
  }

  return weeks;
}

/**
 * 안전한 날짜 파싱
 */
export function safeParseDate(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  
  if (input instanceof Date) {
    return isValid(input) ? input : new Date();
  }
  
  if (typeof input === 'string') {
    // ISO 형식 시도
    let parsed = parseISO(input);
    if (isValid(parsed)) return parsed;
    
    // 일반 날짜 파싱 시도
    parsed = new Date(input);
    if (isValid(parsed)) return parsed;
  }
  
  return new Date();
}

/**
 * 날짜를 ISO 문자열로 안전하게 변환
 */
export function safeFormatISO(date: Date | string | null | undefined): string {
  const safeDate = safeParseDate(date);
  return formatISO(safeDate);
}

/**
 * 타임존을 고려한 현재 시간 가져오기
 */
export function getCurrentTimeInTimezone(timezone: string = KOREA_TIMEZONE): Date {
  const now = new Date();
  
  // 브라우저에서 Intl.DateTimeFormat을 사용하여 타임존 변환
  if (typeof window !== 'undefined' && 'Intl' in window) {
    try {
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
      
      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      console.warn('Failed to get timezone-specific time:', error);
    }
  }
  
  return now;
}

/**
 * KST 기준 현재 날짜 생성 (올바른 한국 날짜)
 */
export function getKSTCurrentDate(): Date {
  const now = new Date();
  // UTC+9 시간을 더해서 KST 기준 날짜 생성
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  // KST 날짜의 년,월,일만 추출해서 새로운 Date 객체 생성
  const year = parseInt(kstNow.toISOString().slice(0, 4));
  const month = parseInt(kstNow.toISOString().slice(5, 7)) - 1; // month는 0부터 시작
  const day = parseInt(kstNow.toISOString().slice(8, 10));
  
  // 현지 시간대에서 년월일만으로 Date 객체 생성 (시간은 00:00:00)
  return new Date(year, month, day);
}

/**
 * KST 날짜를 UTC 날짜 범위로 변환 (DB 쿼리용)
 */
export function convertKstDateToUtcRange(kstDate: Date): {
  utcStart: Date;
  utcEnd: Date;
  kstDateString: string;
} {
  // 주어진 날짜의 KST 기준 시작과 끝을 정확히 계산
  const year = kstDate.getFullYear();
  const month = kstDate.getMonth();
  const day = kstDate.getDate();
  
  // 🔧 KST 날짜의 정확한 시작/끝 시간을 UTC로 직접 생성
  // KST 8월 12일 00:00:00 = UTC 8월 11일 15:00:00 (KST = UTC+9)
  // KST 8월 12일 23:59:59 = UTC 8월 12일 14:59:59
  
  // Date.UTC()를 사용하여 UTC 기준으로 직접 계산
  // KST 하루의 시작 = UTC 전날 15:00:00
  const utcStart = new Date(Date.UTC(year, month, day - 1, 15, 0, 0, 0));
  
  // KST 하루의 끝 = UTC 당일 14:59:59.999  
  const utcEnd = new Date(Date.UTC(year, month, day, 14, 59, 59, 999));
  
  const kstDateString = format(kstDate, DATE_FORMATS.FULL_DATE, { locale: DEFAULT_LOCALE });
  
  // 🔧 KST→UTC 변환 결과 디버깅 (성능 최적화를 위해 주석 처리)
  // console.log('🔧 KST→UTC 변환 결과:', {
  //   input_kst: kstDate.toISOString(),
  //   input_local: kstDate.toLocaleString('ko-KR'),
  //   input_year_month_day: { year, month, day },
  //   utc_start_result: utcStart.toISOString(),
  //   utc_end_result: utcEnd.toISOString(),
  //   kst_date_string: kstDateString
  // });
  
  return {
    utcStart,
    utcEnd,
    kstDateString
  };
}

/**
 * UTC 날짜를 KST 날짜로 변환 (표시용)
 */
export function convertUtcToKst(utcDate: Date): Date {
  // UTC에 9시간을 더하면 KST
  return new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * 뷰 모드 변경시 날짜 조정
 */
export function adjustDateForViewMode(
  currentDate: Date,
  newViewMode: TimelineViewMode,
  oldViewMode?: TimelineViewMode
): Date {
  // 같은 뷰 모드면 변경하지 않음
  if (newViewMode === oldViewMode) return currentDate;
  
  // 일간 → 주간: 해당 주의 시작일로
  if (newViewMode === 'weekly') {
    return startOfWeek(currentDate, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
  }
  
  // 일간/주간 → 월간: 해당 월의 1일로
  if (newViewMode === 'monthly') {
    return startOfMonth(currentDate);
  }
  
  // 주간/월간 → 일간: 현재 날짜 유지 또는 오늘로
  if (newViewMode === 'daily') {
    // 현재 뷰 범위에 오늘이 포함되어 있으면 오늘로, 아니면 현재 날짜 유지
    const today = new Date();
    if (oldViewMode && isDateInViewRange(today, currentDate, oldViewMode)) {
      return today;
    }
    return currentDate;
  }
  
  return currentDate;
}

/**
 * 목표 나침반 페이지용 유틸리티 함수들
 */

/**
 * 디데이 계산 (종료일까지 남은 일수)
 */
export function calculateDaysUntil(endDate: string | Date): number {
  const today = typeof window !== 'undefined' ? getKSTCurrentDate() : new Date();
  const target = safeParseDate(endDate);

  return differenceInDays(startOfDay(target), startOfDay(today));
}

/**
 * 디데이 포맷팅 (D-7, D-day, D+3 형식)
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'D-day';
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

/**
 * 분기 정보 가져오기 (2024년 2분기)
 */
export function getQuarterInfo(date: Date | string): {
  year: number;
  quarter: number;
  label: string;
} {
  const d = safeParseDate(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3);

  return {
    year,
    quarter,
    label: `${year}년 ${quarter}분기`
  };
}

/**
 * 주차 범위 포맷팅 (2024년 4월 1~7일)
 */
export function getWeekRange(date: Date | string): string {
  const d = safeParseDate(date);
  const weekStart = startOfWeek(d, { weekStartsOn: 0, locale: DEFAULT_LOCALE });
  const weekEnd = endOfWeek(d, { weekStartsOn: 0, locale: DEFAULT_LOCALE });

  const year = weekStart.getFullYear();
  const month = weekStart.getMonth() + 1;
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  // 같은 달인 경우
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${year}년 ${month}월 ${startDay}~${endDay}일`;
  }

  // 다른 달인 경우
  const endMonth = weekEnd.getMonth() + 1;
  return `${year}년 ${month}월 ${startDay}일~${endMonth}월 ${endDay}일`;
}

/**
 * 월별 그룹화 키 생성 (2024년 4월)
 */
export function getMonthKey(date: Date | string): string {
  const d = safeParseDate(date);
  return format(d, 'yyyy년 M월', { locale: DEFAULT_LOCALE });
}

/**
 * 년도 추출
 */
export function getYear(date: Date | string): number {
  const d = safeParseDate(date);
  return d.getFullYear();
}

// ============================================
// 목표 나침반 페이지용 진행률/상태 유틸리티
// ============================================

/**
 * 날짜 상태 타입 (목표/프로젝트 카드에서 사용)
 */
export type DateStatus =
  | 'no_dates'           // 시작일/종료일 둘 다 없음
  | 'no_start_date'      // 시작일만 없음
  | 'no_end_date'        // 종료일만 없음
  | 'not_started'        // 시작일 이전
  | 'in_progress'        // 진행 중 (기간 내)
  | 'overdue'            // 종료일 지남 (미완료)
  | 'completed'          // 완료됨
  | 'completed_early'    // 조기 완료 (종료일 전 완료)
  | 'completed_late';    // 지연 완료 (종료일 후 완료)

/**
 * 기간 기준 진행률 계산 (시작일~종료일 경과 %)
 * @returns 0-100 또는 null (날짜 미설정 시)
 */
export function calculatePeriodProgress(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number | null {
  if (!startDate || !endDate) return null;

  const today = typeof window !== 'undefined' ? getKSTCurrentDate() : new Date();
  const start = startOfDay(safeParseDate(startDate));
  const end = startOfDay(safeParseDate(endDate));

  // 시작일 이전
  if (today < start) return 0;
  // 종료일 이후
  if (today > end) return 100;

  const totalDays = differenceInDays(end, start);
  if (totalDays <= 0) return 100;

  const elapsedDays = differenceInDays(today, start);
  return Math.round((elapsedDays / totalDays) * 100);
}

/**
 * 목표/프로젝트 날짜 상태 분석
 */
export function analyzeDateStatus(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  status: string,
  completedAt?: string | Date | null
): DateStatus {
  const today = typeof window !== 'undefined' ? getKSTCurrentDate() : new Date();
  const start = startDate ? startOfDay(safeParseDate(startDate)) : null;
  const end = endDate ? startOfDay(safeParseDate(endDate)) : null;

  // 완료 상태 체크
  if (status === 'completed') {
    if (!end || !completedAt) return 'completed';
    const completed = startOfDay(safeParseDate(completedAt));
    if (completed <= end) return 'completed_early';
    return 'completed_late';
  }

  // 날짜 미설정 체크
  if (!start && !end) return 'no_dates';
  if (!start) return 'no_start_date';
  if (!end) return 'no_end_date';

  // 기간 체크
  if (today < start) return 'not_started';
  if (today > end) return 'overdue';
  return 'in_progress';
}

/**
 * 상태별 라벨/색상 정보 가져오기
 */
export function getDateStatusInfo(status: DateStatus): {
  label: string;
  color: 'neutral' | 'info' | 'success' | 'warning' | 'error';
} {
  const statusMap: Record<DateStatus, { label: string; color: 'neutral' | 'info' | 'success' | 'warning' | 'error' }> = {
    no_dates: { label: '날짜 미설정', color: 'neutral' },
    no_start_date: { label: '시작일 미설정', color: 'neutral' },
    no_end_date: { label: '종료일 미설정', color: 'neutral' },
    not_started: { label: '시작 전', color: 'info' },
    in_progress: { label: '진행 중', color: 'success' },
    overdue: { label: '기한 초과', color: 'error' },
    completed: { label: '완료', color: 'success' },
    completed_early: { label: '조기 완료', color: 'success' },
    completed_late: { label: '지연 완료', color: 'warning' },
  };
  return statusMap[status];
}