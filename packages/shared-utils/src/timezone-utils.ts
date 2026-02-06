// Timezone utilities for cross-platform date handling
import { format, formatISO, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 지원하는 타임존 목록
export const TIMEZONES = {
  KOREA: 'Asia/Seoul',
  UTC: 'UTC',
  TOKYO: 'Asia/Tokyo',
  SHANGHAI: 'Asia/Shanghai',
  NEW_YORK: 'America/New_York',
  LOS_ANGELES: 'America/Los_Angeles',
  LONDON: 'Europe/London',
  PARIS: 'Europe/Paris'
} as const;

export type TimezoneType = typeof TIMEZONES[keyof typeof TIMEZONES];

// 타임존 표시 이름
export const TIMEZONE_NAMES = {
  [TIMEZONES.KOREA]: '한국 표준시 (KST)',
  [TIMEZONES.UTC]: '협정 세계시 (UTC)',
  [TIMEZONES.TOKYO]: '일본 표준시 (JST)',
  [TIMEZONES.SHANGHAI]: '중국 표준시 (CST)',
  [TIMEZONES.NEW_YORK]: '동부 표준시 (EST)',
  [TIMEZONES.LOS_ANGELES]: '태평양 표준시 (PST)',
  [TIMEZONES.LONDON]: '그리니치 표준시 (GMT)',
  [TIMEZONES.PARIS]: '중앙 유럽 표준시 (CET)'
} as const;

/**
 * 브라우저의 현재 타임존 감지
 */
export function detectBrowserTimezone(): string {
  if (typeof window !== 'undefined' && 'Intl' in window) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Failed to detect browser timezone:', error);
    }
  }
  return TIMEZONES.KOREA; // 기본값
}

/**
 * 타임존이 한국인지 확인
 */
export function isKoreanTimezone(timezone?: string): boolean {
  const tz = timezone || detectBrowserTimezone();
  return tz === TIMEZONES.KOREA || tz.includes('Seoul');
}

/**
 * 날짜를 특정 타임존으로 변환
 */
export function convertToTimezone(
  date: Date, 
  timezone: string = TIMEZONES.KOREA
): Date {
  if (typeof window === 'undefined' || !('Intl' in window)) {
    return date; // 서버사이드에서는 원본 반환
  }

  try {
    // 현재 날짜의 각 부분을 대상 타임존에서 가져오기
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.warn('Failed to convert timezone:', error);
    return date;
  }
}

/**
 * 현재 시간을 특정 타임존으로 가져오기
 */
export function getCurrentTimeInTimezone(timezone: string = TIMEZONES.KOREA): Date {
  return convertToTimezone(new Date(), timezone);
}

/**
 * 타임존 오프셋 계산 (분 단위)
 */
export function getTimezoneOffset(timezone: string = TIMEZONES.KOREA): number {
  if (typeof window === 'undefined' || !('Intl' in window)) {
    return -540; // KST는 UTC+9 (-9 * 60)
  }

  try {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = convertToTimezone(now, timezone).getTime();
    return Math.round((targetTime - utcTime) / 60000);
  } catch (error) {
    console.warn('Failed to calculate timezone offset:', error);
    return -540; // 기본값 (KST)
  }
}

/**
 * 타임존 정보가 포함된 날짜 문자열 생성
 */
export function formatWithTimezone(
  date: Date,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss',
  timezone: string = TIMEZONES.KOREA
): string {
  const convertedDate = convertToTimezone(date, timezone);
  const offset = getTimezoneOffset(timezone);
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
  
  return `${format(convertedDate, formatStr, { locale: ko })} (UTC${offsetStr})`;
}

/**
 * ISO 문자열을 타임존을 고려하여 파싱
 */
export function parseISOWithTimezone(
  isoString: string,
  targetTimezone: string = TIMEZONES.KOREA
): Date {
  try {
    const parsed = parseISO(isoString);
    return convertToTimezone(parsed, targetTimezone);
  } catch (error) {
    console.warn('Failed to parse ISO string with timezone:', error);
    return new Date();
  }
}

/**
 * 날짜를 타임존을 고려한 ISO 문자열로 변환
 */
export function toISOWithTimezone(
  date: Date,
  timezone: string = TIMEZONES.KOREA
): string {
  const convertedDate = convertToTimezone(date, timezone);
  return formatISO(convertedDate);
}

/**
 * 타임존 간 시간 차이 계산 (시간 단위)
 */
export function getTimeDifference(
  fromTimezone: string,
  toTimezone: string
): number {
  const now = new Date();
  const fromOffset = getTimezoneOffset(fromTimezone);
  const toOffset = getTimezoneOffset(toTimezone);
  return (toOffset - fromOffset) / 60;
}

/**
 * 타임존 목록과 현재 시간 가져오기
 */
export function getAllTimezonesWithCurrentTime(): Array<{
  timezone: string;
  name: string;
  currentTime: Date;
  offset: string;
}> {
  return Object.entries(TIMEZONES).map(([key, timezone]) => {
    const currentTime = getCurrentTimeInTimezone(timezone);
    const offset = getTimezoneOffset(timezone);
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset >= 0 ? '+' : '-';
    const offsetStr = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

    return {
      timezone,
      name: TIMEZONE_NAMES[timezone as TimezoneType],
      currentTime,
      offset: offsetStr
    };
  });
}

/**
 * 사용자 친화적인 타임존 선택 옵션 생성
 */
export function getTimezoneSelectOptions(): Array<{
  value: string;
  label: string;
  group: string;
}> {
  const groups = {
    '아시아': [TIMEZONES.KOREA, TIMEZONES.TOKYO, TIMEZONES.SHANGHAI],
    '아메리카': [TIMEZONES.NEW_YORK, TIMEZONES.LOS_ANGELES],
    '유럽': [TIMEZONES.LONDON, TIMEZONES.PARIS],
    '기타': [TIMEZONES.UTC]
  };

  return Object.entries(groups).flatMap(([group, timezones]) =>
    timezones.map(timezone => ({
      value: timezone,
      label: TIMEZONE_NAMES[timezone as TimezoneType],
      group
    }))
  );
}

/**
 * 디버그용 타임존 정보 로깅
 */
export function logTimezoneInfo(): void {
  if (typeof window === 'undefined') return;

  console.group('🕐 Timezone Information');
  console.log('Browser Timezone:', detectBrowserTimezone());
  console.log('Is Korean Timezone:', isKoreanTimezone());
  
  const allTimezones = getAllTimezonesWithCurrentTime();
  allTimezones.forEach(({ timezone, name, currentTime, offset }) => {
    console.log(`${name} (${timezone}):`, format(currentTime, 'yyyy-MM-dd HH:mm:ss'), offset);
  });
  
  console.groupEnd();
}