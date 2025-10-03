import { TimelineItem } from '@/types/timeline-view';
import { parseISO, isSameDay, isAfter, isBefore, addMinutes, format } from 'date-fns';
import { convertKstDateToUtcRange } from '@/lib/date-utils';

export interface TimelineGap {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  type: 'gap';
}

export interface EnhancedTimelineItem {
  id: string;
  type: 'todo' | 'repository' | 'timeline-task' | 'gap' | 'current-time' | 'remaining-time';
  title: string;
  description?: string;
  scheduledTime?: string;
  priority: 'high' | 'medium' | 'low';
  isAllDay: boolean;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
}

/**
 * 타임라인 아이템들 사이의 빈 시간을 계산하여 gap 아이템을 생성합니다.
 */
export function calculateTimelineGaps(
  items: TimelineItem[], 
  currentDate: Date
): EnhancedTimelineItem[] {
  console.log('🔍 calculateTimelineGaps 디버깅:', {
    totalItems: items.length,
    itemIds: items.map(item => item.id.substring(0, 8)),
    sampleItemFields: items[0] ? Object.keys(items[0]) : []
  });
  
  // 현재 날짜의 시간 기반 아이템만 필터링
  const timedItems = items
    .filter(item => {
      const hasScheduledTime = !!(item as any).scheduledTime;
      const hasStartTime = !!(item as any).startTime || !!(item as any).start_time;
      const isNotAllDay = !item.isAllDay;
      
      console.log(`🔍 아이템 필터링: ${item.title.substring(0, 20)}`, {
        isAllDay: item.isAllDay,
        isNotAllDay,
        hasScheduledTime,
        hasStartTime,
        scheduledTimeValue: (item as any).scheduledTime,
        startTimeValue: (item as any).startTime || (item as any).start_time,
        passesFilter: isNotAllDay && (hasScheduledTime || hasStartTime)
      });
      
      return isNotAllDay && (hasScheduledTime || hasStartTime);
    })
    .filter(item => {
      const timeValue = (item as any).scheduledTime || (item as any).startTime || (item as any).start_time;
      if (!timeValue) return false;
      
      // timeValue가 이미 Date 객체인지 문자열인지 확인
      const itemDate = timeValue instanceof Date ? timeValue : parseISO(timeValue);
      
      // 🔧 getFilteredAndSortedItems와 동일한 UTC 시간 기반 날짜 비교 적용
      const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
      const { utcStart, utcEnd } = convertKstDateToUtcRange(current);
      
      const itemTime = itemDate.getTime();
      const startTime = utcStart.getTime();
      const endTime = utcEnd.getTime();
      
      const isInRange = itemTime >= startTime && itemTime <= endTime;
      
      console.log(`🔧 KST→UTC 범위 비교 (${item.title.substring(0, 20)}):`, {
        itemDate_UTC: itemDate.toISOString(),
        currentDate_KST: current.toISOString(),
        utcStart: utcStart.toISOString(),
        utcEnd: utcEnd.toISOString(),
        itemTime,
        startTime,
        endTime,
        isInRange,
        result: isInRange ? "✅ 통과" : "❌ 필터링됨"
      });
      
      return isInRange;
    })
    .map(item => {
      const timeValue = (item as any).scheduledTime || (item as any).startTime || (item as any).start_time;
      const startTime = timeValue instanceof Date ? timeValue : parseISO(timeValue);
      const endTimeValue = (item as any).endTime || (item as any).end_time;
      const endTime = endTimeValue 
        ? (endTimeValue instanceof Date ? endTimeValue : parseISO(endTimeValue))
        : addMinutes(startTime, (item as any).estimatedDuration || 30);
      
      const result = {
        ...item,
        startTime,
        endTime
      };
      
      console.log('🔍 calculateTimelineGaps 반환 아이템:', {
        id: item.id.substring(0, 8),
        title: item.title.substring(0, 20),
        type: item.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isAllDay: item.isAllDay,
        keys: Object.keys(result)
      });
      
      return result;
    })
    .sort((a, b) => {
      const timeA = a.startTime instanceof Date ? a.startTime : new Date(a.startTime || new Date());
      const timeB = b.startTime instanceof Date ? b.startTime : new Date(b.startTime || new Date());
      return timeA.getTime() - timeB.getTime();
    });

  const enhancedItems: EnhancedTimelineItem[] = [];
  const now = typeof window !== 'undefined' ? new Date() : currentDate;
  const isToday = typeof window !== 'undefined' ? isSameDay(currentDate, now) : false;

  // 오늘인 경우 모든 아이템을 포함하되, 현재 시간을 기준으로 적절히 처리
  const relevantItems = timedItems;

  // 일반 아이템들을 먼저 추가

  // 아이템들과 그 사이의 gap들 추가
  for (let i = 0; i < relevantItems.length; i++) {
    const currentItem = relevantItems[i];
    enhancedItems.push(currentItem as EnhancedTimelineItem);

    // 다음 아이템과의 gap 계산
    if (i < relevantItems.length - 1) {
      const nextItem = relevantItems[i + 1];
      const currentEndTime = currentItem.endTime instanceof Date ? currentItem.endTime : new Date(currentItem.endTime || new Date());
      const nextStartTime = nextItem.startTime instanceof Date ? nextItem.startTime : new Date(nextItem.startTime || new Date());

      if (isBefore(currentEndTime, nextStartTime)) {
        const gapDurationMs = nextStartTime.getTime() - currentEndTime.getTime();
        const gapDurationMinutes = Math.floor(gapDurationMs / (1000 * 60));

        if (gapDurationMinutes >= 30) {
          enhancedItems.push({
            id: `gap-${i}`,
            type: 'gap',
            title: '',
            description: '',
            startTime: currentEndTime,
            endTime: nextStartTime,
            durationMinutes: gapDurationMinutes,
            scheduledTime: currentEndTime.toISOString(),
            priority: 'low',
            isAllDay: false
          });
        }
      }
    }
  }

  // 특별한 마커들을 마지막에 추가 (오늘인 경우)
  if (isToday) {
    // 현재 시간을 오늘 날짜와 맞춰서 생성
    const currentTimeToday = new Date(currentDate);
    currentTimeToday.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    
    // 현재 시간 마커 추가
    enhancedItems.push({
      id: 'current-time-marker',
      type: 'current-time',
      title: '현재 시간',
      description: '',
      scheduledTime: currentTimeToday.toISOString(),
      priority: 'high',
      isAllDay: false,
      startTime: currentTimeToday
    });

    // 남은 시간 표시 아이템 추가 (하루 끝에)
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    enhancedItems.push({
      id: 'remaining-time-indicator',
      type: 'remaining-time',
      title: '하루 중 남은 시간',
      description: '',
      scheduledTime: endOfDay.toISOString(),
      priority: 'low',
      isAllDay: false,
      startTime: endOfDay
    });
  }

  return enhancedItems.sort((a, b) => {
    const timeA = a.startTime instanceof Date ? a.startTime : (a.scheduledTime ? parseISO(a.scheduledTime) : new Date());
    const timeB = b.startTime instanceof Date ? b.startTime : (b.scheduledTime ? parseISO(b.scheduledTime) : new Date());
    return timeA.getTime() - timeB.getTime();
  });
}

/**
 * 시간 차이를 사용자 친화적인 형태로 포맷팅합니다.
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}시간 ${remainingMinutes}분`;
  } else if (hours > 0) {
    return `${hours}시간`;
  } else {
    return `${remainingMinutes}분`;
  }
}

/**
 * 현재 시간 기준으로 타임라인에서의 위치를 계산합니다.
 */
export function calculateCurrentTimePosition(
  items: EnhancedTimelineItem[],
  currentTime: Date
): number {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemTime = item.startTime || parseISO(item.scheduledTime || '');
    
    if (isAfter(itemTime, currentTime)) {
      return i;
    }
  }
  
  return items.length;
}