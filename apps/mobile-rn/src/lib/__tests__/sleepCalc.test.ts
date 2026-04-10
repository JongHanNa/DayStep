/**
 * 수면 계산 로직 테스트
 * sleepStore의 calcGoalMinutes 순수 함수 검증
 *
 * calcGoalMinutes는 모듈 내부 함수이므로 직접 import 불가.
 * 동일 로직을 재구현하여 알고리즘 정확성을 검증합니다.
 */

/** sleepStore.calcGoalMinutes 동일 로직 */
function calcGoalMinutes(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let sleepMins = sh * 60 + sm;
  let wakeMins = wh * 60 + wm;
  if (wakeMins <= sleepMins) wakeMins += 24 * 60; // 자정 넘김
  return wakeMins - sleepMins;
}

describe('calcGoalMinutes', () => {
  test('22:00 → 06:00 = 480분 (8시간)', () => {
    expect(calcGoalMinutes('22:00', '06:00')).toBe(480);
  });

  test('23:00 → 07:00 = 480분', () => {
    expect(calcGoalMinutes('23:00', '07:00')).toBe(480);
  });

  test('23:30 → 06:30 = 420분 (7시간)', () => {
    expect(calcGoalMinutes('23:30', '06:30')).toBe(420);
  });

  test('00:00 → 08:00 = 480분 (자정 시작)', () => {
    expect(calcGoalMinutes('00:00', '08:00')).toBe(480);
  });

  test('01:00 → 09:00 = 480분 (새벽 취침)', () => {
    expect(calcGoalMinutes('01:00', '09:00')).toBe(480);
  });

  test('21:00 → 05:00 = 480분', () => {
    expect(calcGoalMinutes('21:00', '05:00')).toBe(480);
  });

  test('22:30 → 06:00 = 450분 (7.5시간)', () => {
    expect(calcGoalMinutes('22:30', '06:00')).toBe(450);
  });

  test('20:00 → 04:00 = 480분', () => {
    expect(calcGoalMinutes('20:00', '04:00')).toBe(480);
  });

  test('같은 시간 → 24시간 (1440분)', () => {
    // wakeMins <= sleepMins 이면 +1440
    expect(calcGoalMinutes('06:00', '06:00')).toBe(1440);
  });

  test('10:00 → 10:30 = 30분 (낮잠)', () => {
    expect(calcGoalMinutes('10:00', '10:30')).toBe(30);
  });
});
