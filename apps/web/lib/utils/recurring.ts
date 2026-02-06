import { RecurrencePattern } from '@/types';

export interface RecurrenceData {
  recurrence_pattern?: RecurrencePattern;
  recurrence_days_of_week?: number[] | null;
  recurrence_day_of_month?: number | null;
  recurrence_interval?: number | null;
}

/**
 * 반복 패턴을 사용자 친화적인 텍스트로 변환
 */
export function getRecurrenceText(data?: RecurrenceData): string {
  if (!data?.recurrence_pattern || data.recurrence_pattern === 'none') {
    return '반복 없음';
  }
  
  const { recurrence_pattern, recurrence_days_of_week, recurrence_day_of_month, recurrence_interval } = data;
  
  switch (recurrence_pattern) {
    case 'daily':
      if (recurrence_interval && recurrence_interval > 1) {
        return `${recurrence_interval}일마다`;
      }
      return '매일';
      
    case 'weekly':
      if (recurrence_days_of_week && recurrence_days_of_week.length > 0) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const days = recurrence_days_of_week
          .map(day => dayNames[day])
          .join(', ');
        
        if (recurrence_interval && recurrence_interval > 1) {
          return `${recurrence_interval}주마다 ${days}`;
        }
        return `매주 ${days}`;
      }
      return '매주';
      
    case 'monthly':
      if (recurrence_day_of_month) {
        if (recurrence_interval && recurrence_interval > 1) {
          return `${recurrence_interval}개월마다 ${recurrence_day_of_month}일`;
        }
        return `매월 ${recurrence_day_of_month}일`;
      }
      return '매월';
      
    case 'custom':
      return '사용자 정의';
      
    default:
      return '반복 설정';
  }
}

/**
 * 반복 할일인지 확인
 */
export function isRecurringTodo(item: any): boolean {
  // 반복 인스턴스인지 확인 (ID에 -recurrence- 포함)
  if (item.id && item.id.includes('-recurrence-')) return true;
  
  // 데이터에서 반복 패턴 확인
  if (item.data?.recurrence_pattern && item.data.recurrence_pattern !== 'none') return true;
  
  // 직접 반복 패턴이 있는지 확인
  if (item.recurrence_pattern && item.recurrence_pattern !== 'none') return true;
  
  return false;
}