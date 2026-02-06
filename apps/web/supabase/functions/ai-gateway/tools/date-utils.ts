/**
 * 날짜 유틸리티 (MCP 서버에서 복사)
 */

const DEFAULT_TIMEZONE = 'Asia/Seoul';

export interface DateContext {
  currentYear: number;
  currentQuarter: string;
  today: string;
  timezone: string;
}

/**
 * 현재 날짜 컨텍스트 생성
 */
export function getCurrentDateContext(timezone = DEFAULT_TIMEZONE): DateContext {
  const now = new Date();
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

  const quarter =
    month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';

  return {
    currentYear: year,
    currentQuarter: quarter,
    today: `${year}-${monthStr}-${day}`,
    timezone,
  };
}

/**
 * 날짜에 일수 추가
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Date를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 동적 날짜 또는 문자열을 실제 날짜로 변환
 */
export function resolveDate(
  input: string | undefined | null,
  context: DateContext
): string | null {
  if (!input) return null;

  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.split('T')[0];
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
      return addDays(context.today, 7);
    default:
      return input;
  }
}

/**
 * 한국시간 자정으로 변환 (DB 저장용)
 */
export function toKSTMidnight(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
}
