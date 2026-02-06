/**
 * 시간 관련 유틸리티 함수들
 * Intl.DateTimeFormat을 사용한 로케일 대응 및 시간 계산 함수들
 */

/**
 * 날짜를 한국 로케일에 맞게 포맷팅
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * 시간을 한국 로케일에 맞게 포맷팅
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * 날짜와 시간을 함께 포맷팅
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * 상대적 시간 표시 (예: "2시간 전", "방금 전")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return formatDate(date);
  }
}

/**
 * 할일의 진행률 계산 (시작일과 마감일 기준)
 * @param startDate 시작일
 * @param endDate 마감일
 * @param currentDate 현재 날짜 (기본값: 현재 시간)
 * @returns 0-100 사이의 진행률
 */
export function calculateProgress(
  startDate: Date, 
  endDate: Date, 
  currentDate: Date = new Date()
): number {
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = currentDate.getTime() - startDate.getTime();
  
  if (totalMs <= 0) return 100; // 시작일과 마감일이 같으면 100%
  if (elapsedMs <= 0) return 0;  // 아직 시작 전이면 0%
  if (elapsedMs >= totalMs) return 100; // 마감일 지나면 100%
  
  return Math.round((elapsedMs / totalMs) * 100);
}

/**
 * 남은 시간 계산
 * @param endDate 마감일
 * @param currentDate 현재 날짜 (기본값: 현재 시간)
 * @returns 남은 시간 문자열
 */
export function getTimeRemaining(endDate: Date, currentDate: Date = new Date()): string {
  const diffMs = endDate.getTime() - currentDate.getTime();
  
  if (diffMs <= 0) {
    return '마감됨';
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}일 남음`;
  } else if (diffHours > 0) {
    return `${diffHours}시간 남음`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}분 남음`;
  } else {
    return '곧 마감';
  }
}

/**
 * 마감일 임박 여부 확인
 * @param endDate 마감일
 * @param thresholdHours 임박 기준 시간 (기본값: 24시간)
 * @param currentDate 현재 날짜 (기본값: 현재 시간)
 * @returns 임박 여부
 */
export function isDeadlineApproaching(
  endDate: Date, 
  thresholdHours: number = 24,
  currentDate: Date = new Date()
): boolean {
  const diffMs = endDate.getTime() - currentDate.getTime();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  
  return diffMs > 0 && diffMs <= thresholdMs;
}

/**
 * 마감일 지남 여부 확인
 */
export function isOverdue(endDate: Date, currentDate: Date = new Date()): boolean {
  return endDate.getTime() < currentDate.getTime();
}

/**
 * 진행률에 따른 색상 클래스 반환
 */
export function getProgressColorClass(progress: number): string {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 60) return 'bg-blue-500';
  if (progress >= 40) return 'bg-yellow-500';
  if (progress >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}