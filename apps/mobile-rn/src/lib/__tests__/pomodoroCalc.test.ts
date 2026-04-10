/**
 * 포모도로 계산 로직 테스트
 * pomodoroStore의 getDurationForType, calcStats 검증
 */

type TimerType = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';

interface PomodoroSettings {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
}

interface PomodoroSession {
  id: string;
  timerType: TimerType;
  duration: number; // seconds
  interrupted: boolean;
  completedAt: string;
}

/** pomodoroStore.getDurationForType 동일 로직 */
function getDurationForType(type: TimerType, settings: PomodoroSettings): number {
  switch (type) {
    case 'POMODORO':
      return settings.pomodoroDuration * 60;
    case 'SHORT_BREAK':
      return settings.shortBreakDuration * 60;
    case 'LONG_BREAK':
      return settings.longBreakDuration * 60;
  }
}

/** pomodoroStore.calcStats 동일 로직 */
function calcStats(sessions: PomodoroSession[]) {
  const today = new Date().toISOString().split('T')[0];
  const completed = sessions.filter(s => !s.interrupted);
  const pomodoros = completed.filter(s => s.timerType === 'POMODORO');
  const todayPomodoros = pomodoros.filter(s => s.completedAt.startsWith(today));

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  for (const s of sortedDesc) {
    if (s.timerType === 'POMODORO' && !s.interrupted) {
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else if (s.timerType === 'POMODORO') {
      if (currentStreak === 0) currentStreak = streak;
      streak = 0;
    }
  }
  if (currentStreak === 0) currentStreak = streak;

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    totalFocusTime: Math.round(
      pomodoros.reduce((sum, s) => sum + s.duration, 0) / 60,
    ),
    currentStreak,
    longestStreak,
    todaySessions: todayPomodoros.length,
  };
}

function createSession(overrides: Partial<PomodoroSession> = {}): PomodoroSession {
  return {
    id: 'session-1',
    timerType: 'POMODORO',
    duration: 1500, // 25분
    interrupted: false,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('getDurationForType', () => {
  const settings: PomodoroSettings = {
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
  };

  test('POMODORO → 25 * 60 = 1500초', () => {
    expect(getDurationForType('POMODORO', settings)).toBe(1500);
  });

  test('SHORT_BREAK → 5 * 60 = 300초', () => {
    expect(getDurationForType('SHORT_BREAK', settings)).toBe(300);
  });

  test('LONG_BREAK → 15 * 60 = 900초', () => {
    expect(getDurationForType('LONG_BREAK', settings)).toBe(900);
  });

  test('커스텀 설정', () => {
    const custom = {pomodoroDuration: 50, shortBreakDuration: 10, longBreakDuration: 30};
    expect(getDurationForType('POMODORO', custom)).toBe(3000);
  });
});

describe('calcStats', () => {
  test('빈 배열', () => {
    const stats = calcStats([]);
    expect(stats).toEqual({
      totalSessions: 0,
      completedSessions: 0,
      totalFocusTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      todaySessions: 0,
    });
  });

  test('완료된 포모도로 1개', () => {
    const stats = calcStats([createSession()]);
    expect(stats.totalSessions).toBe(1);
    expect(stats.completedSessions).toBe(1);
    expect(stats.totalFocusTime).toBe(25); // 1500초 / 60
    expect(stats.todaySessions).toBe(1);
  });

  test('중단된 세션은 완료에 포함하지 않음', () => {
    const sessions = [
      createSession({id: 's1'}),
      createSession({id: 's2', interrupted: true}),
    ];
    const stats = calcStats(sessions);
    expect(stats.totalSessions).toBe(2);
    expect(stats.completedSessions).toBe(1);
    expect(stats.totalFocusTime).toBe(25);
  });

  test('휴식 세션은 집중 시간에 포함하지 않음', () => {
    const sessions = [
      createSession({id: 's1', timerType: 'POMODORO', duration: 1500}),
      createSession({id: 's2', timerType: 'SHORT_BREAK', duration: 300}),
    ];
    const stats = calcStats(sessions);
    expect(stats.totalFocusTime).toBe(25); // 포모도로만
  });

  test('연속 완료 스트릭 계산', () => {
    const now = Date.now();
    const sessions = [
      createSession({id: 's1', completedAt: new Date(now - 3000).toISOString()}),
      createSession({id: 's2', completedAt: new Date(now - 2000).toISOString()}),
      createSession({id: 's3', completedAt: new Date(now - 1000).toISOString()}),
    ];
    const stats = calcStats(sessions);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
  });

  test('중단으로 스트릭 끊김', () => {
    const now = Date.now();
    const sessions = [
      createSession({id: 's1', completedAt: new Date(now - 4000).toISOString()}),
      createSession({id: 's2', completedAt: new Date(now - 3000).toISOString(), interrupted: true}),
      createSession({id: 's3', completedAt: new Date(now - 2000).toISOString()}),
      createSession({id: 's4', completedAt: new Date(now - 1000).toISOString()}),
    ];
    const stats = calcStats(sessions);
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
  });

  test('오늘 세션만 todaySessions에 카운트', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const sessions = [
      createSession({id: 's1', completedAt: new Date().toISOString()}),
      createSession({id: 's2', completedAt: yesterday.toISOString()}),
    ];
    const stats = calcStats(sessions);
    expect(stats.todaySessions).toBe(1);
  });

  test('총 집중시간 합산', () => {
    const sessions = [
      createSession({id: 's1', duration: 1500}),
      createSession({id: 's2', duration: 1500}),
      createSession({id: 's3', duration: 3000}),
    ];
    const stats = calcStats(sessions);
    expect(stats.totalFocusTime).toBe(100); // (1500+1500+3000)/60
  });
});
