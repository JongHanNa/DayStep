/**
 * koreanNLP.ts
 * 한국어 약속 텍스트에서 날짜/시간/장소/사람을 추출하는 파서
 * - 순수 TypeScript, ML 의존 없음
 * - 5-pass 순차 추출 (매칭된 토큰은 working string에서 제거)
 */
import {format, addDays, nextDay, addWeeks, setMonth, setDate} from 'date-fns';
import type {FormData, ScheduleType} from '@/components/todo/useTodoForm';

// ============================================
// Types
// ============================================

export interface ParsedAppointment {
  title: string;
  date: string | null; // yyyy-MM-dd
  time: string | null; // HH:mm
  endTime: string | null; // HH:mm
  location: string | null;
  person: string | null;
  confidence: number; // 0-1
}

// ============================================
// Constants
// ============================================

/** 요일 인덱스 (date-fns: 0=일, 1=월, ..., 6=토) */
const DAY_MAP: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
  일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6,
};

/** 시간대 → 24시 보정값 */
const PERIOD_OFFSET: Record<string, number> = {
  새벽: 0,
  오전: 0,
  아침: 0,
  AM: 0,
  am: 0,
  낮: 0,
  오후: 12,
  저녁: 12,
  밤: 12,
  PM: 12,
  pm: 12,
};

/** 장소 힌트 (명사 끝에 올 수 있는 장소 관련 키워드) */
const LOCATION_HINTS = [
  '역', '카페', '식당', '공원', '병원', '센터', '빌딩', '건물',
  '학교', '대학', '회사', '사무실', '호텔', '마트', '백화점',
  '극장', '영화관', '도서관', '체육관', '헬스장', '교회', '성당',
  '은행', '약국', '편의점', '음식점', '레스토랑', '바', '클럽',
  '터미널', '공항', '항구', '정류장', '주차장', '아파트', '집',
  '거리', '로', '길', '동', '구청', '시청', '경찰서', '소방서',
];

// ============================================
// Pass 1: 날짜 추출
// ============================================

interface ExtractResult {
  value: string | null;
  remaining: string;
}

function extractDate(text: string, ref: Date): ExtractResult & {dateValue: Date | null} {
  let remaining = text;
  let dateValue: Date | null = null;

  // 상대 날짜 (우선순위 높음)
  const relativePatterns: [RegExp, (m: RegExpMatchArray) => Date][] = [
    [/오늘/, () => ref],
    [/내일/, () => addDays(ref, 1)],
    [/모레/, () => addDays(ref, 2)],
    [/글피/, () => addDays(ref, 3)],
    // 다다음주 X요일
    [/다다음\s*주\s*(월|화|수|목|금|토|일)(?:요일)?/, (m) => {
      const dayIdx = DAY_MAP[m[1]];
      return addWeeks(nextDay(ref, dayIdx), 2);
    }],
    // 다음주 X요일
    [/다음\s*주\s*(월|화|수|목|금|토|일)(?:요일)?/, (m) => {
      const dayIdx = DAY_MAP[m[1]];
      return addWeeks(nextDay(ref, dayIdx), 1);
    }],
    // 이번 주 X요일
    [/이번\s*주\s*(월|화|수|목|금|토|일)(?:요일)?/, (m) => {
      const dayIdx = DAY_MAP[m[1]];
      return nextDay(ref, dayIdx);
    }],
    // 이번 주말
    [/이번\s*주말/, () => {
      const sat = nextDay(ref, 6);
      return sat;
    }],
    // 다음 주말
    [/다음\s*주말/, () => {
      return addWeeks(nextDay(ref, 6), 1);
    }],
    // 단독 요일 (다음 해당 요일)
    [/(월|화|수|목|금|토|일)요일/, (m) => {
      const dayIdx = DAY_MAP[m[1]];
      return nextDay(ref, dayIdx);
    }],
  ];

  for (const [pattern, resolver] of relativePatterns) {
    const match = remaining.match(pattern);
    if (match) {
      dateValue = resolver(match);
      remaining = remaining.replace(match[0], ' ').trim();
      break;
    }
  }

  // 절대 날짜 (상대 날짜 없을 때만)
  if (!dateValue) {
    // M월 D일
    const mdMatch = remaining.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (mdMatch) {
      const month = parseInt(mdMatch[1], 10);
      const day = parseInt(mdMatch[2], 10);
      let d = setDate(setMonth(ref, month - 1), day);
      // 이미 지난 날짜면 내년으로
      if (d < ref) {
        d = setDate(setMonth(new Date(ref.getFullYear() + 1, 0, 1), month - 1), day);
      }
      dateValue = d;
      remaining = remaining.replace(mdMatch[0], ' ').trim();
    }
  }

  if (!dateValue) {
    // M/D 또는 M.D
    const slashMatch = remaining.match(/(\d{1,2})[/.]\s*(\d{1,2})(?!\d)/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10);
      const day = parseInt(slashMatch[2], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        let d = setDate(setMonth(ref, month - 1), day);
        if (d < ref) {
          d = setDate(setMonth(new Date(ref.getFullYear() + 1, 0, 1), month - 1), day);
        }
        dateValue = d;
        remaining = remaining.replace(slashMatch[0], ' ').trim();
      }
    }
  }

  return {
    value: dateValue ? format(dateValue, 'yyyy-MM-dd') : null,
    dateValue,
    remaining,
  };
}

// ============================================
// Pass 2: 시간 추출
// ============================================

function extractTime(text: string): ExtractResult {
  let remaining = text;
  let value: string | null = null;

  // 한국어 시간 패턴: (오전/오후/저녁/밤/새벽/아침) N시 (M분|반)
  const korTimeRegex =
    /(새벽|오전|아침|낮|오후|저녁|밤|AM|PM|am|pm)?\s*(\d{1,2})시\s*(?:(\d{1,2})분|반)?/;
  const match = remaining.match(korTimeRegex);
  if (match) {
    let hour = parseInt(match[2], 10);
    const minute = match[3] ? parseInt(match[3], 10) : (remaining.includes('반') && match[0].includes('반') ? 30 : 0);
    const period = match[1];

    if (period && PERIOD_OFFSET[period] !== undefined) {
      // 오후 1시 → 13시, 오후 12시 → 12시
      if (PERIOD_OFFSET[period] === 12 && hour < 12) {
        hour += 12;
      }
      // 오전 12시 → 0시
      if (PERIOD_OFFSET[period] === 0 && hour === 12) {
        hour = 0;
      }
    } else if (!period && hour <= 6) {
      // 시간대 없이 1~6시면 오후로 추정 (약속 맥락)
      hour += 12;
    }

    value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    remaining = remaining.replace(match[0], ' ').trim();
    return {value, remaining};
  }

  // HH:MM 패턴
  const colonMatch = remaining.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const hour = parseInt(colonMatch[1], 10);
    const minute = parseInt(colonMatch[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      remaining = remaining.replace(colonMatch[0], ' ').trim();
    }
  }

  return {value, remaining};
}

// ============================================
// Pass 3: 장소 추출
// ============================================

function extractLocation(text: string): ExtractResult {
  let remaining = text;
  let value: string | null = null;

  // 패턴: (명사구)(에서|에|앞에서|근처에서)
  // 장소 힌트가 있는 경우
  const locWithPostposition = /([\w가-힣]+(?:역|카페|식당|공원|병원|센터|빌딩|건물|학교|대학|회사|사무실|호텔|마트|백화점|극장|영화관|도서관|체육관|헬스장|음식점|레스토랑|아파트|집))\s*(?:에서|에|앞에서|근처에서|앞)?/;
  const hintMatch = remaining.match(locWithPostposition);
  if (hintMatch) {
    value = hintMatch[1];
    remaining = remaining.replace(hintMatch[0], ' ').trim();
    return {value, remaining};
  }

  // 장소 힌트 없이 에서/에 패턴 — 앞 2-6글자 명사구
  const genericLoc = /([\w가-힣]{2,8})(?:에서|앞에서|근처에서)/;
  const genericMatch = remaining.match(genericLoc);
  if (genericMatch) {
    // '에서' 앞 단어가 시간/사람 관련이 아닌지 확인
    const candidate = genericMatch[1];
    const timeWords = ['시', '분', '오전', '오후', '저녁', '새벽', '밤', '아침'];
    const isTimeRelated = timeWords.some(tw => candidate.includes(tw));
    if (!isTimeRelated) {
      value = candidate;
      remaining = remaining.replace(genericMatch[0], ' ').trim();
    }
  }

  return {value, remaining};
}

// ============================================
// Pass 4: 사람 추출
// ============================================

function extractPerson(text: string): ExtractResult {
  let remaining = text;
  let value: string | null = null;

  // "이랑" 조사 특별 처리: 받침 있는 글자 + 이랑 → "이"는 조사의 일부
  // 한글 받침 판별: (charCode - 0xAC00) % 28 !== 0 이면 받침 있음
  const hasJongseong = (ch: string) => {
    const code = ch.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
  };

  // 패턴 1: (이름)이랑 — "이"가 조사의 일부인 경우
  const yirangMatch = remaining.match(/([\w가-힣]{1,5})이랑(?:\s*같이)?/);
  if (yirangMatch) {
    const name = yirangMatch[1];
    const lastChar = name[name.length - 1];
    // 마지막 글자에 받침이 있으면 "이랑"은 조사 → 이름은 그대로
    // 받침이 없으면 "이"는 이름의 일부일 수도 있지만, 일반적으로 조사
    value = name;
    remaining = remaining.replace(yirangMatch[0], ' ').trim();
    return {value, remaining};
  }

  // 패턴 2: (이름)(랑|하고|와|과|한테)
  const personRegex = /([\w가-힣]{1,5})(?:랑|하고|와\s|과\s|한테)/;
  const match = remaining.match(personRegex);
  if (match) {
    value = match[1];
    remaining = remaining.replace(match[0], ' ').trim();
    return {value, remaining};
  }

  // (이름)(씨|님)
  const honorificRegex = /([\w가-힣]{1,5})(씨|님)/;
  const honorificMatch = remaining.match(honorificRegex);
  if (honorificMatch) {
    value = honorificMatch[1] + honorificMatch[2];
    remaining = remaining.replace(honorificMatch[0], ' ').trim();
  }

  return {value, remaining};
}

// ============================================
// Pass 5: 제목 생성
// ============================================

function generateTitle(remaining: string, original: string): string {
  // 남은 텍스트 정리
  let title = remaining
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-·]+/, '')
    .replace(/[\s,.\-·]+$/, '')
    .trim();

  // 조사/접속사만 남았거나 너무 짧으면 원본 사용
  if (title.length < 2) {
    title = original.replace(/\s+/g, ' ').trim();
  }

  // 최대 50자
  if (title.length > 50) {
    title = title.substring(0, 50) + '…';
  }

  return title;
}

// ============================================
// Main Parser
// ============================================

export function parseKoreanAppointment(
  text: string,
  referenceDate: Date = new Date(),
): ParsedAppointment {
  const original = text.trim();
  if (!original) {
    return {
      title: '',
      date: null,
      time: null,
      endTime: null,
      location: null,
      person: null,
      confidence: 0,
    };
  }

  let working = original;
  let fieldsFound = 0;

  // Pass 1: 날짜
  const dateResult = extractDate(working, referenceDate);
  working = dateResult.remaining;
  if (dateResult.value) fieldsFound++;

  // Pass 2: 시간
  const timeResult = extractTime(working);
  working = timeResult.remaining;
  if (timeResult.value) fieldsFound++;

  // Pass 3: 장소
  const locationResult = extractLocation(working);
  working = locationResult.remaining;
  if (locationResult.value) fieldsFound++;

  // Pass 4: 사람
  const personResult = extractPerson(working);
  working = personResult.remaining;
  if (personResult.value) fieldsFound++;

  // Pass 5: 제목
  const title = generateTitle(working, original);

  // confidence: 추출 필드 수 기반 (최소 0.2 — 제목은 항상 있으므로)
  const confidence = Math.min(1, 0.2 + fieldsFound * 0.2);

  return {
    title,
    date: dateResult.value,
    time: timeResult.value,
    endTime: null, // 종료 시간은 시작 +1시간으로 FormData 변환 시 설정
    location: locationResult.value,
    person: personResult.value,
    confidence,
  };
}

// ============================================
// FormData 변환
// ============================================

export function appointmentToFormData(
  parsed: ParsedAppointment,
): Partial<FormData> {
  const result: Partial<FormData> = {};

  // 제목
  if (parsed.title) {
    result.title = parsed.title;
  }

  // 날짜
  if (parsed.date) {
    result.scheduledDate = parsed.date;
  }

  // 시간 → schedule_type + startTime + endTime
  if (parsed.time) {
    const [h, m] = parsed.time.split(':').map(Number);
    const dateStr = parsed.date || format(new Date(), 'yyyy-MM-dd');
    const start = new Date(`${dateStr}T${parsed.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1시간

    result.scheduleType = 'timed' as ScheduleType;
    result.startTime = start;
    result.endTime = end;
  } else if (parsed.date) {
    // 날짜만 있고 시간 없으면 anytime
    result.scheduleType = 'anytime' as ScheduleType;
  }

  // 장소 + 사람 → content
  const contentParts: string[] = [];
  if (parsed.location) {
    contentParts.push(`장소: ${parsed.location}`);
  }
  if (parsed.person) {
    contentParts.push(`함께: ${parsed.person}`);
  }
  if (contentParts.length > 0) {
    result.content = contentParts.join('\n');
  }

  return result;
}
