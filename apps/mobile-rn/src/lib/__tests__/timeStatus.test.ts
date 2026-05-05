import {getTimeStatus, formatDuration, getTimeStatusText} from '../timeStatus';

describe('getTimeStatus', () => {
  const now = new Date('2026-03-12T10:00:00.000Z');

  test('completed → status: completed', () => {
    const result = getTimeStatus('2026-03-12T09:00:00.000Z', '2026-03-12T10:00:00.000Z', true, now);
    expect(result.status).toBe('completed');
  });

  test('no startTime → status: upcoming', () => {
    const result = getTimeStatus(null, null, false, now);
    expect(result.status).toBe('upcoming');
  });

  test('before start → status: upcoming', () => {
    const result = getTimeStatus('2026-03-12T11:00:00.000Z', '2026-03-12T12:00:00.000Z', false, now);
    expect(result.status).toBe('upcoming');
  });

  test('in progress (with endTime) → elapsed/remaining/progress', () => {
    // 09:00~11:00, now=10:00 → 50% progress
    const result = getTimeStatus('2026-03-12T09:00:00.000Z', '2026-03-12T11:00:00.000Z', false, now);
    expect(result.status).toBe('in_progress');
    expect(result.elapsedMinutes).toBe(60);
    expect(result.remainingMinutes).toBe(60);
    expect(result.progressPercent).toBe(50);
  });

  test('in progress (no endTime, within 10min grace) → in_progress', () => {
    // start=09:55, no end, now=10:00 → 5분 경과, 5분 남음
    const result = getTimeStatus('2026-03-12T09:55:00.000Z', null, false, now);
    expect(result.status).toBe('in_progress');
    expect(result.elapsedMinutes).toBe(5);
    expect(result.remainingMinutes).toBe(5);
    expect(result.progressPercent).toBe(50);
  });

  test('missed (no endTime, >10min past) → missed with overdueMinutes', () => {
    // start=09:30, no end, now=10:00 → deadline=09:40, overdue=20분
    const result = getTimeStatus('2026-03-12T09:30:00.000Z', null, false, now);
    expect(result.status).toBe('missed');
    expect(result.overdueMinutes).toBe(20);
  });

  test('missed (past endTime) → missed with overdueMinutes', () => {
    // 08:00~09:00, now=10:00 → overdue=60분
    const result = getTimeStatus('2026-03-12T08:00:00.000Z', '2026-03-12T09:00:00.000Z', false, now);
    expect(result.status).toBe('missed');
    expect(result.overdueMinutes).toBe(60);
  });

  test('cross-day correction (22:30~05:30)', () => {
    // 22:30~05:30, now=23:00 → in_progress
    const crossDayNow = new Date('2026-03-12T23:00:00.000Z');
    const result = getTimeStatus(
      '2026-03-12T22:30:00.000Z',
      '2026-03-12T05:30:00.000Z', // endTime < startTime
      false,
      crossDayNow,
    );
    expect(result.status).toBe('in_progress');
    expect(result.elapsedMinutes).toBe(30);
  });

  test('string date input works same as Date', () => {
    const withString = getTimeStatus('2026-03-12T09:00:00.000Z', '2026-03-12T11:00:00.000Z', false, now);
    const withDate = getTimeStatus(
      new Date('2026-03-12T09:00:00.000Z'),
      new Date('2026-03-12T11:00:00.000Z'),
      false,
      now,
    );
    expect(withString).toEqual(withDate);
  });

  test('exactly at grace period boundary → missed', () => {
    // start=09:50, now=10:00 → exactly at 10min deadline
    const result = getTimeStatus('2026-03-12T09:50:00.000Z', null, false, now);
    expect(result.status).toBe('missed');
    expect(result.overdueMinutes).toBe(0);
  });
});

describe('formatDuration', () => {
  test('0분', () => {
    expect(formatDuration(0)).toBe('0분');
  });

  test('45분', () => {
    expect(formatDuration(45)).toBe('45분');
  });

  test('60분 → 1시간', () => {
    expect(formatDuration(60)).toBe('1시간');
  });

  test('150분 → 2시간 30분', () => {
    expect(formatDuration(150)).toBe('2시간 30분');
  });

  test('음수 → 0분', () => {
    expect(formatDuration(-10)).toBe('0분');
  });
});

describe('getTimeStatusText', () => {
  test('in_progress → primary + secondary', () => {
    const result = getTimeStatusText({
      status: 'in_progress',
      elapsedMinutes: 30,
      remainingMinutes: 30,
      progressPercent: 50,
    });
    expect(result.primary).toBe('30분 전 시작');
    expect(result.secondary).toBe('30분 남음');
  });

  test('missed → primary only', () => {
    const result = getTimeStatusText({
      status: 'missed',
      overdueMinutes: 15,
    });
    expect(result.primary).toBe('종료 시간 15분 지남');
    expect(result.secondary).toBeUndefined();
  });

  test('upcoming → empty', () => {
    const result = getTimeStatusText({status: 'upcoming'});
    expect(result.primary).toBeUndefined();
    expect(result.secondary).toBeUndefined();
  });

  test('completed → empty', () => {
    const result = getTimeStatusText({status: 'completed'});
    expect(result.primary).toBeUndefined();
  });
});
