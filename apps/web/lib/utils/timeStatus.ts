/**
 * ADHD 사용자를 위한 시간 인지 기능 유틸리티
 * 할일의 시간 상태를 계산하고 경과/남은 시간을 제공합니다.
 */

export type TimeStatus = 'upcoming' | 'in_progress' | 'missed' | 'completed';

export interface TimeStatusResult {
  status: TimeStatus;
  /** 시작 후 경과 시간 (분) - in_progress 상태에서만 유효 */
  elapsedMinutes?: number;
  /** 남은 시간 (분) - in_progress 상태에서만 유효 */
  remainingMinutes?: number;
  /** 진행률 (0-100) - in_progress 상태에서만 유효 */
  progressPercent?: number;
  /** 종료 후 경과 시간 (분) - missed 상태에서만 유효 */
  overdueMinutes?: number;
}

/** 종료 시간이 없는 할일의 기본 유예 시간 (분) */
const DEFAULT_GRACE_PERIOD_MINUTES = 10;

/**
 * 할일의 시간 상태를 계산합니다.
 *
 * @param startTime - 시작 시간
 * @param endTime - 종료 시간 (없을 경우 시작 후 10분이 지나면 놓침으로 처리)
 * @param completed - 완료 여부
 * @param now - 현재 시간 (테스트용, 기본값: new Date())
 * @returns 시간 상태 결과
 */
export function getTimeStatus(
  startTime: Date | string | null,
  endTime: Date | string | null,
  completed: boolean,
  now: Date = new Date()
): TimeStatusResult {
  // 완료된 할일
  if (completed) {
    return { status: 'completed' };
  }

  // startTime이 없으면 upcoming으로 처리
  if (!startTime) {
    return { status: 'upcoming' };
  }

  // Date 인스턴스가 아닌 경우 변환 (문자열로 전달될 수 있음)
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : null;

  const startMs = start.getTime();
  const nowMs = now.getTime();

  // 아직 시작 전
  if (nowMs < startMs) {
    return { status: 'upcoming' };
  }

  // endTime이 없는 경우: 시작 후 10분이 지나면 놓침
  if (!end) {
    const gracePeriodMs = DEFAULT_GRACE_PERIOD_MINUTES * 60 * 1000;
    const deadlineMs = startMs + gracePeriodMs;

    if (nowMs < deadlineMs) {
      // 10분 이내: 진행 중
      const elapsed = nowMs - startMs;
      const remaining = deadlineMs - nowMs;
      return {
        status: 'in_progress',
        elapsedMinutes: Math.floor(elapsed / (1000 * 60)),
        remainingMinutes: Math.floor(remaining / (1000 * 60)),
        progressPercent: Math.min(100, Math.floor((elapsed / gracePeriodMs) * 100)),
      };
    }

    // 10분 초과: 놓침
    const overdue = nowMs - deadlineMs;
    return {
      status: 'missed',
      overdueMinutes: Math.floor(overdue / (1000 * 60)),
    };
  }

  // endTime이 있는 경우
  const endMs = end.getTime();

  // 크로스데이 보정: endTime이 startTime보다 이전인 경우 (자정을 넘는 할일, 예: 22:30~05:30)
  const adjustedEndMs = endMs < startMs ? endMs + 24 * 60 * 60 * 1000 : endMs;

  // 진행 중
  if (nowMs >= startMs && nowMs < adjustedEndMs) {
    const totalDuration = adjustedEndMs - startMs;
    const elapsed = nowMs - startMs;
    const remaining = adjustedEndMs - nowMs;

    return {
      status: 'in_progress',
      elapsedMinutes: Math.floor(elapsed / (1000 * 60)),
      remainingMinutes: Math.floor(remaining / (1000 * 60)),
      progressPercent: Math.min(100, Math.floor((elapsed / totalDuration) * 100)),
    };
  }

  // 놓침 (종료 시간 지남 && 미완료)
  const overdue = nowMs - adjustedEndMs;
  return {
    status: 'missed',
    overdueMinutes: Math.floor(overdue / (1000 * 60)),
  };
}

/**
 * 분을 읽기 쉬운 시간 문자열로 변환합니다.
 *
 * @param minutes - 분
 * @returns 포맷된 시간 문자열 (예: "2시간 30분", "45분")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '0분';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}분`;
  }

  if (mins === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${mins}분`;
}

/**
 * 시간 상태에 따른 표시 텍스트를 생성합니다.
 *
 * @param result - 시간 상태 결과
 * @returns 표시용 텍스트 객체
 */
export function getTimeStatusText(result: TimeStatusResult): {
  primary?: string;
  secondary?: string;
} {
  switch (result.status) {
    case 'in_progress':
      return {
        primary: `${formatDuration(result.elapsedMinutes ?? 0)} 전 시작`,
        secondary: `${formatDuration(result.remainingMinutes ?? 0)} 남음`,
      };
    case 'missed':
      return {
        primary: `종료 시간 ${formatDuration(result.overdueMinutes ?? 0)} 지남`,
      };
    default:
      return {};
  }
}
