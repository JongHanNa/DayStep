/**
 * 청소 스트릭 계산 테스트
 * cleaningStore의 calculateStreak 로직 검증
 */
import {format} from 'date-fns';

/** cleaningStore.calculateStreak 동일 로직 */
function calculateStreak(completions: Record<string, any[]>): number {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    if (completions[key] && completions[key].length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return format(d, 'yyyy-MM-dd');
}

describe('calculateStreak (청소)', () => {
  test('빈 기록 → 0', () => {
    expect(calculateStreak({})).toBe(0);
  });

  test('오늘만 → 1', () => {
    expect(calculateStreak({[todayKey()]: [{id: '1'}]})).toBe(1);
  });

  test('오늘 + 어제 → 2', () => {
    const completions = {
      [todayKey()]: [{id: '1'}],
      [daysAgoKey(1)]: [{id: '2'}],
    };
    expect(calculateStreak(completions)).toBe(2);
  });

  test('연속 7일 → 7', () => {
    const completions: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      completions[daysAgoKey(i)] = [{id: `${i}`}];
    }
    expect(calculateStreak(completions)).toBe(7);
  });

  test('오늘 없고 어제부터 3일 연속 → 3 (i=0은 skip, i=1부터 연속)', () => {
    // 원래 로직: i=0(오늘) 없으면 break 안함 (else if i>0 조건)
    const completions: Record<string, any[]> = {};
    for (let i = 1; i <= 3; i++) {
      completions[daysAgoKey(i)] = [{id: `${i}`}];
    }
    expect(calculateStreak(completions)).toBe(3);
  });

  test('오늘 + 2일전 (어제 빠짐) → 1', () => {
    const completions = {
      [todayKey()]: [{id: '1'}],
      [daysAgoKey(2)]: [{id: '2'}],
    };
    expect(calculateStreak(completions)).toBe(1);
  });

  test('빈 배열은 기록 없음으로 취급', () => {
    const completions = {
      [todayKey()]: [],
    };
    expect(calculateStreak(completions)).toBe(0);
  });
});
