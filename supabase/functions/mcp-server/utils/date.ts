/**
 * 날짜 유틸리티
 *
 * 동적 날짜 계산, 분기 계산, 시간대 처리
 */

import type { DynamicDate, Quarter } from '../types/tools.ts';

// ============================================================================
// 날짜 컨텍스트
// ============================================================================

export interface DateContext {
  currentYear: number;
  currentQuarter: Quarter;
  today: string; // YYYY-MM-DD
  timezone: string;
}

const DEFAULT_TIMEZONE = 'Asia/Seoul';

/**
 * 현재 날짜 컨텍스트 생성
 */
export function getCurrentDateContext(timezone = DEFAULT_TIMEZONE): DateContext {
  const now = new Date();
  // 간단한 타임존 처리 (Deno에서는 Intl 사용)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2025');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1');
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const monthStr = parts.find((p) => p.type === 'month')?.value || '01';

  return {
    currentYear: year,
    currentQuarter: getQuarter(month),
    today: `${year}-${monthStr}-${day}`,
    timezone,
  };
}

/**
 * 월에서 분기 계산
 */
export function getQuarter(month: number): Quarter {
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

/**
 * 분기 종료일 계산
 */
export function getQuarterEndDate(year: number, quarter: Quarter): string {
  const quarterEnds: Record<Quarter, string> = {
    Q1: `${year}-03-31`,
    Q2: `${year}-06-30`,
    Q3: `${year}-09-30`,
    Q4: `${year}-12-31`,
  };
  return quarterEnds[quarter];
}

// ============================================================================
// 날짜 계산 유틸리티
// ============================================================================

/**
 * 날짜에 일수 추가
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * 날짜에 주 추가
 */
export function addWeeks(dateStr: string, weeks: number): string {
  return addDays(dateStr, weeks * 7);
}

/**
 * 날짜에 월 추가
 */
export function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return formatDate(date);
}

/**
 * 주의 시작일 계산 (월요일 기준)
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 월요일 기준
  return addDays(dateStr, diff);
}

/**
 * 월의 시작일 계산
 */
export function getMonthStart(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Date를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// 동적 날짜 해결
// ============================================================================

/**
 * 동적 날짜 또는 문자열을 실제 날짜로 변환
 */
export function resolveDate(
  input: string | DynamicDate | undefined | null,
  context: DateContext
): string | null {
  if (!input) return null;

  // 이미 ISO 날짜 형식인 경우
  if (typeof input === 'string') {
    // YYYY-MM-DD 또는 ISO datetime
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      return input.split('T')[0]; // 날짜 부분만 반환
    }

    // 상대 키워드 처리
    switch (input.toLowerCase()) {
      case 'today':
        return context.today;
      case 'tomorrow':
        return addDays(context.today, 1);
      case 'yesterday':
        return addDays(context.today, -1);
      case 'next_week':
        return addWeeks(context.today, 1);
      case 'next_month':
        return addMonths(context.today, 1);
      case 'week_start':
        return getWeekStart(context.today);
      case 'month_start':
        return getMonthStart(context.today);
      case 'quarter_end':
        return getQuarterEndDate(context.currentYear, context.currentQuarter);
      case 'year_end':
        return `${context.currentYear}-12-31`;
      case 'current':
        return context.today;
      default:
        return input; // 알 수 없는 값은 그대로 반환
    }
  }

  // DynamicDate 객체 처리
  if (typeof input === 'object' && input.base) {
    let baseDate = resolveDate(input.base, context);
    if (!baseDate) return null;

    if (input.offset) {
      if (input.offset.days) {
        baseDate = addDays(baseDate, input.offset.days);
      }
      if (input.offset.weeks) {
        baseDate = addWeeks(baseDate, input.offset.weeks);
      }
      if (input.offset.months) {
        baseDate = addMonths(baseDate, input.offset.months);
      }
    }

    return baseDate;
  }

  return null;
}

/**
 * 동적 datetime을 ISO datetime으로 변환
 */
export function resolveDateTime(
  input: string | DynamicDate | undefined | null,
  context: DateContext,
  time?: string // HH:MM 형식
): string | null {
  const date = resolveDate(input, context);
  if (!date) return null;

  if (time) {
    // 한국시간 기준으로 datetime 생성
    return `${date}T${time}:00+09:00`;
  }

  // 시간이 없으면 자정으로 설정 (한국시간)
  return `${date}T00:00:00+09:00`;
}

/**
 * 한국시간 자정으로 변환 (DB 저장용)
 * CLAUDE.md 규칙: 날짜만 저장할 때 한국시간 자정 → UTC 변환
 */
export function toKSTMidnight(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
}

// ============================================================================
// year_goal, quarter_goal 해결
// ============================================================================

/**
 * year_goal 값 해결 ('current' → 현재 연도)
 */
export function resolveYearGoal(
  input: number | 'current' | undefined | null,
  context: DateContext
): number | null {
  if (input === null || input === undefined) return null;
  if (input === 'current') return context.currentYear;
  return input;
}

/**
 * quarter_goal 값 해결 ('current' → 현재 분기)
 */
export function resolveQuarterGoal(
  input: string | 'current' | undefined | null,
  context: DateContext
): Quarter | null {
  if (input === null || input === undefined) return null;
  if (input === 'current') return context.currentQuarter;
  return input as Quarter;
}
