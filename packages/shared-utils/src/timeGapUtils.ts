import { format } from 'date-fns';

export interface TimeGap {
  type: 'current-to-next' | 'between-items' | 'last-to-end' | 'current-to-end' | 'start-to-first' | 'last-past-to-current' | string;
  startTime: Date;
  endTime: Date;
  duration?: number;
  description?: string;
  diffMinutes?: number;
  nextTaskTitle?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  startTime?: string | Date;
  endTime?: string | Date;
  type: string;
  data?: any;
}

export interface TimeGapCalculationParams {
  timedItems: TimelineItem[];
  currentDate: Date;
  isTodayDate: boolean;
  realTimeNow: Date;
  showPastGaps: boolean;
  loggedOngoingTasksRef: { current: Set<string> };
}

/**
 * 반복 할일 인스턴스의 올바른 시간을 계산하는 헬퍼 함수
 */
function getAdjustedTimeForSort(item: TimelineItem): number {
  if (!item.startTime) return 0;
  
  // 반복 할일 인스턴스인지 확인
  if (typeof item.id === 'string' && item.id.includes('recurrence')) {
    const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const instanceDateString = match[1]; // 2025-08-21
      const originalTime = new Date(item.startTime);
      
      // 인스턴스 날짜 + 원본 시간으로 조합
      const adjustedTime = new Date(instanceDateString);
      adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
      
      return adjustedTime.getTime();
    }
  }
  
  // 일반 할일은 그대로 반환
  return new Date(item.startTime).getTime();
}

/**
 * 반복 할일 인스턴스의 올바른 시간을 계산하는 헬퍼 함수 (다음 작업용)
 */
function getAdjustedTimeForNextTask(item: TimelineItem): Date | null {
  if (!item.startTime) return null;
  
  // 반복 할일 인스턴스인지 확인
  if (typeof item.id === 'string' && item.id.includes('recurrence')) {
    const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const instanceDateString = match[1]; // 2025-08-21
      const originalTime = new Date(item.startTime);
      
      // 인스턴스 날짜 + 원본 시간으로 조합
      const adjustedTime = new Date(instanceDateString);
      adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
      
      return adjustedTime;
    }
  }
  
  // 일반 할일은 그대로 반환
  return new Date(item.startTime);
}

/**
 * 반복 할일 인스턴스의 올바른 시작 시간을 계산하는 헬퍼 함수
 */
function getAdjustedStartTime(item: TimelineItem): Date | null {
  if (!item.startTime) return null;
  
  // 반복 할일 인스턴스인지 확인
  if (typeof item.id === 'string' && item.id.includes('recurrence')) {
    const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const instanceDateString = match[1]; // 2025-08-21
      const originalTime = new Date(item.startTime);
      
      // 인스턴스 날짜 + 원본 시간으로 조합
      const adjustedTime = new Date(instanceDateString);
      adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
      
      return adjustedTime;
    }
  }
  
  // 일반 할일은 그대로 반환
  return new Date(item.startTime);
}

/**
 * 반복 할일 인스턴스의 올바른 시간을 계산하는 헬퍼 함수 (간격 분석용)
 */
function getAdjustedTimeForGap(item: TimelineItem, isEndTime: boolean = false): Date | null {
  // 반복 할일 인스턴스인지 확인
  if (typeof item.id === 'string' && item.id.includes('recurrence')) {
    const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const instanceDateString = match[1]; // 2025-08-21
      const originalTime = isEndTime 
        ? (item.endTime ? new Date(item.endTime) : new Date(new Date(item.startTime!).getTime() + 30 * 60 * 1000))
        : new Date(item.startTime!);
      
      // 인스턴스 날짜 + 원본 시간으로 조합
      const adjustedTime = new Date(instanceDateString);
      adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
      
      return adjustedTime;
    }
  }
  
  // 일반 할일은 그대로 반환
  if (isEndTime) {
    return item.endTime 
      ? new Date(item.endTime) 
      : item.startTime 
        ? new Date(new Date(item.startTime).getTime() + 30 * 60 * 1000)
        : null;
  } else {
    return item.startTime ? new Date(item.startTime) : null;
  }
}

/**
 * 현재 날짜의 할일만 필터링하는 헬퍼 함수
 */
function filterCurrentDateItems(sortedItems: TimelineItem[], currentDate: Date): TimelineItem[] {
  
  const filtered = sortedItems.filter(item => {
    if (!item.startTime) return false;
    
    // 반복 할일 인스턴스 특별 처리: ID로 날짜 추출
    if (typeof item.id === 'string' && item.id.includes('recurrence')) {
      // ID 형식: todo-원본ID-recurrence-2025-08-21-0
      const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const instanceDateString = match[1]; // 2025-08-21
        const currentDateString = format(currentDate, 'yyyy-MM-dd');
        const isMatch = instanceDateString === currentDateString;
        
        
        return isMatch;
      }
    }
    
    // 일반 할일: startTime으로 판단
    const itemDate = new Date(item.startTime);
    const itemDateString = format(itemDate, 'yyyy-MM-dd');
    const currentDateString = format(currentDate, 'yyyy-MM-dd');
    const isMatch = itemDateString === currentDateString;
    
    
    return isMatch;
  });
  
  
  return filtered;
}

/**
 * 시간 간격을 계산하는 메인 함수
 */
export function calculateTimeGaps({
  timedItems,
  currentDate,
  isTodayDate,
  realTimeNow,
  showPastGaps,
  loggedOngoingTasksRef
}: TimeGapCalculationParams): TimeGap[] {
  if (timedItems.length === 0) {
    // 🚫 timedItems가 0개라서 간격 계산 중단
    return [];
  }
  
  const gaps: TimeGap[] = [];
  
  // 시간 순으로 정렬
  const sortedItems = [...timedItems].sort((a, b) => {
    const aTime = getAdjustedTimeForSort(a);
    const bTime = getAdjustedTimeForSort(b);
    return aTime - bTime;
  });
  
  // 날짜별 간격 분석 분기
  if (isTodayDate && sortedItems.length > 0) {
    // 오늘 날짜: 현재 시간 이후의 첫 번째 할일 찾기
    const now = realTimeNow;
    
    // 현재 진행 중인 할일이 있는지 확인
    const currentOngoingItem = sortedItems.find(item => {
      // 🔧 반복 할일 인스턴스의 올바른 시간 계산
      let itemStart: Date | null = null;
      let itemEnd: Date | null = null;
      
      if (typeof item.id === 'string' && item.id.includes('recurrence')) {
        // 반복 할일 인스턴스: 인스턴스 날짜 + 원본 시간 조합
        const match = item.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
        if (match && item.startTime) {
          const instanceDateString = match[1]; // 2025-08-21
          const originalStartTime = new Date(item.startTime);
          
          // 인스턴스 날짜 + 원본 시간으로 조합
          itemStart = new Date(instanceDateString);
          itemStart.setHours(originalStartTime.getHours(), originalStartTime.getMinutes(), originalStartTime.getSeconds(), originalStartTime.getMilliseconds());
          
          if (item.endTime) {
            const originalEndTime = new Date(item.endTime);
            itemEnd = new Date(instanceDateString);
            itemEnd.setHours(originalEndTime.getHours(), originalEndTime.getMinutes(), originalEndTime.getSeconds(), originalEndTime.getMilliseconds());
          } else {
            itemEnd = new Date(itemStart.getTime() + 30 * 60 * 1000); // 기본 30분
          }
        }
      } else {
        // 일반 할일: 그대로 사용
        itemStart = item.startTime ? new Date(item.startTime) : null;
        itemEnd = item.endTime 
          ? new Date(item.endTime) 
          : itemStart 
            ? new Date(itemStart.getTime() + 30 * 60 * 1000) // 기본 30분
            : null;
      }
      
      const isOngoing = itemStart && itemEnd && 
             now.getTime() >= itemStart.getTime() && 
             now.getTime() <= itemEnd.getTime();
             
      if (isOngoing) {
        // 로그 중복 방지: 이미 로그가 출력된 할일은 다시 출력하지 않음
        const taskKey = `${item.id}-${format(itemStart!, 'HH:mm')}`;
        if (!loggedOngoingTasksRef.current.has(taskKey)) {
          loggedOngoingTasksRef.current.add(taskKey);
          // 🎯 현재 진행 중인 할일 발견
        }
      }
      
      return isOngoing;
    });
    
    // current-to-next 간격 생성 (현재 진행 중인 할일 여부와 관계없이)
    // 현재 시간 이후에 있는 첫 번째 할일 찾기 (반복 할일 인스턴스 시간 고려)
    const nextItem = sortedItems.find(item => {
      const itemStart = getAdjustedTimeForNextTask(item);
      const result = itemStart && itemStart.getTime() > now.getTime();
      
      
      return result;
    });
    
    if (nextItem) {
      // 다음 할일이 있으면 current-to-next 간격 표시 (진행 중인 할일 여부와 무관)
      const nextItemStart = getAdjustedTimeForNextTask(nextItem)!;
      const diffMinutes = (nextItemStart.getTime() - now.getTime()) / (1000 * 60);
      
      
      // 20분 이상 차이날 때만 표시
      if (diffMinutes >= 20) {
        gaps.push({
          type: 'current-to-next',
          startTime: now,
          endTime: nextItemStart,
          diffMinutes: Math.floor(diffMinutes),
          nextTaskTitle: nextItem.title
        });
      }
    }
    
    // 🔧 마지막 과거 할일 종료시간부터 현재시간까지의 간격 생성
    const pastItems = sortedItems.filter(item => {
      // ✅ 반복 할일 인스턴스의 올바른 종료시간 계산 사용
      const itemEnd = getAdjustedTimeForGap(item, true);
      
      if (!itemEnd) return false;
      
      // 종료시간이 현재시간보다 이전인 할일들
      return itemEnd.getTime() < now.getTime();
    });
    
    if (pastItems.length > 0) {
      // 가장 마지막 과거 할일 찾기
      const lastPastItem = pastItems[pastItems.length - 1];
      
      // ✅ 반복 할일 인스턴스의 올바른 종료시간 계산 사용
      const lastPastEnd = getAdjustedTimeForGap(lastPastItem, true);
      
      if (lastPastEnd && lastPastEnd.getTime() < now.getTime()) {
        const diffMinutes = (now.getTime() - lastPastEnd.getTime()) / (1000 * 60);
        
        
        // 20분 이상이고 24시간(1440분) 미만일 때만 표시 (비정상적인 긴 간격 방지)
        if (diffMinutes >= 20 && diffMinutes < 1440) {
          
          gaps.push({
            type: 'last-past-to-current',
            startTime: lastPastEnd,
            endTime: now,
            diffMinutes: Math.floor(diffMinutes),
            description: `${lastPastItem.title} 이후 계획없음`
          });
        } else {
          // console.log('❌ last-past-to-current 간격 생성 실패:', {
          //   조건: '20분 이상 차이',
          //   실제간격분: Math.floor(diffMinutes),
          //   조건충족: diffMinutes >= 20
          // });
        }
      }
    }
    
    // 오늘 날짜에서도 start-to-first 간격 생성 (오전 12:00 ~ 첫 할일)
    if (sortedItems.length > 0) {
      // 현재 화면 날짜의 할일만 찾기 (반복 할일 인스턴스 고려)
      const currentDateItems = filterCurrentDateItems(sortedItems, currentDate);
      
      if (currentDateItems.length > 0) {
        const firstItem = currentDateItems[0]; // 현재 날짜의 가장 이른 할일
        const firstItemStart = getAdjustedStartTime(firstItem);
        
        if (firstItemStart) {
          // 해당 날짜의 오전 12:00
          const startOfDay = new Date(currentDate);
          startOfDay.setHours(0, 0, 0, 0);
          
          const diffMinutes = (firstItemStart.getTime() - startOfDay.getTime()) / (1000 * 60);
          
          // 20분 이상 차이날 때만 표시
          // start-to-first 간격은 하루 전체 계획 파악에 중요하므로 showPastGaps 설정과 무관하게 항상 표시
          let shouldShowStartGap = diffMinutes >= 20;
          
          if (shouldShowStartGap) {
            const gap = {
              type: 'start-to-first',
              startTime: startOfDay,
              endTime: firstItemStart,
              diffMinutes: Math.floor(diffMinutes),
              nextTaskTitle: firstItem.title
            };
            gaps.push(gap);
          }
        }
      }
    }
  } else {
    // 오늘이 아닌 날짜: 하루 시작(오전 12:00)부터 첫 번째 할일까지의 간격 분석
    if (sortedItems.length > 0) {
      const currentDateItems = filterCurrentDateItems(sortedItems, currentDate);
      
      
      if (currentDateItems.length === 0) {
        // 🚫 현재 날짜에 할일이 없어서 start-to-first 간격 생성 중단
        return gaps;
      }
      
      const firstItem = currentDateItems[0]; // 현재 날짜의 가장 이른 할일
      const firstItemStart = getAdjustedStartTime(firstItem);
      
      if (firstItemStart) {
        // 해당 날짜의 오전 12:00
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const diffMinutes = (firstItemStart.getTime() - startOfDay.getTime()) / (1000 * 60);
        
        // 20분 이상 차이날 때만 표시
        // start-to-first 간격은 하루 전체 계획 파악에 중요하므로 showPastGaps 설정과 무관하게 항상 표시
        let shouldShowStartGap = diffMinutes >= 20;
        
        if (shouldShowStartGap) {
          const gap = {
            type: 'start-to-first',
            startTime: startOfDay,
            endTime: firstItemStart,
            diffMinutes: Math.floor(diffMinutes),
            nextTaskTitle: firstItem.title
          };
          gaps.push(gap);
        }
      }
    }
  }
  
  // 할일 간 간격 분석 (시간 순서 기준)
  for (let i = 0; i < sortedItems.length - 1; i++) {
    const currentItem = sortedItems[i];
    const nextItem = sortedItems[i + 1];
    
    const currentEndTime = getAdjustedTimeForGap(currentItem, true);
    const nextStartTime = getAdjustedTimeForGap(nextItem, false);
    
    if (currentEndTime && nextStartTime) {
      const diffMinutes = (nextStartTime.getTime() - currentEndTime.getTime()) / (1000 * 60);
      
      // 20분 이상 간격이면 표시
      // between-items 간격은 계획 파악에 중요하므로 showPastGaps 설정과 무관하게 항상 표시
      let shouldShowGap = diffMinutes >= 20;
      
      // console.log(`🔍 between-items 간격 검사 (${i} → ${i+1}):`, {
      //   시작시간: currentEndTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      //   종료시간: nextStartTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      //   분량: Math.floor(diffMinutes) + '분',
      //   '20분이상': shouldShowGap,
      //   표시여부: shouldShowGap
      // });
      
      if (shouldShowGap) {
        const gap = {
          type: 'between-items',
          startTime: currentEndTime,
          endTime: nextStartTime,
          diffMinutes: Math.floor(diffMinutes)
        };
        gaps.push(gap);
      }
    }
  }
  
  // 마지막 할일과 하루 끝 사이의 간격
  if (sortedItems.length > 0) {
    const lastItem = sortedItems[sortedItems.length - 1];
    const lastEndTime = lastItem.endTime 
      ? new Date(lastItem.endTime)
      : lastItem.startTime 
        ? new Date(new Date(lastItem.startTime).getTime() + 30 * 60 * 1000)
        : null;
    
    if (lastEndTime) {
      // last-to-end 간격은 항상 하루 끝까지 (23:59)
      // 🔧 버그 수정: lastEndTime과 같은 날짜 기준으로 endOfDay 계산
      const endOfDay = new Date(lastEndTime);
      endOfDay.setHours(23, 59, 59, 999);
      
      const diffMinutes = (endOfDay.getTime() - lastEndTime.getTime()) / (1000 * 60);
      
      // 간격이 충분히 큰지 확인 (20분 이상)
      let shouldShowGap = diffMinutes >= 20;
      
      if (isTodayDate) {
        const now = realTimeNow;

        // 🔧 개선된 중복 방지 로직: 실제로 겹치는 경우에만 중복 방지
        const lastPastToCurrentGap = gaps.find(gap => gap.type === 'last-past-to-current');

        if (lastPastToCurrentGap) {
          // last-past-to-current 간격이 있는 경우, 실제로 겹치는지 확인
          const isActuallyOverlapping =
            lastPastToCurrentGap.endTime.getTime() >= lastEndTime.getTime();

          if (isActuallyOverlapping) {
            // 실제로 겹치는 경우에만 중복 방지
            shouldShowGap = false;
          } else {
            // 겹치지 않으면 표시 (마지막 할일이 현재 시간보다 미래에 있을 때)
            const isLastItemInFuture = lastEndTime.getTime() > now.getTime();
            shouldShowGap = shouldShowGap && isLastItemInFuture;
          }
        } else {
          // last-past-to-current 간격이 없으면 마지막 할일이 현재 시간보다 미래에 있을 때 표시
          const isLastItemInFuture = lastEndTime.getTime() > now.getTime();
          shouldShowGap = shouldShowGap && isLastItemInFuture;
        }
        
      } else {
        // 다른 날짜에서는 24시간 미만(1440분)의 간격만 표시
        // 24시간 이상의 긴 간격은 의미가 없으므로 표시하지 않음
      }
      
      // 🔧 두 번째 조건 - 마지막할일부터 하루끝까지 간격 (로그 제거)
      
      if (shouldShowGap) {
        const gap = {
          type: 'last-to-end',
          startTime: lastEndTime,
          endTime: endOfDay,
          diffMinutes: Math.floor(diffMinutes)
        };
        gaps.push(gap);
        // 🔧 기본 last-to-end 간격 생성됨 (로그 제거)
      }
    }
    
    
    const now = realTimeNow;
    
    // 🔧 오늘 날짜인 경우에만 current-to-end 간격 생성 로직 실행
    if (isTodayDate) {
      // 🔧 중복 방지: 현재 시간과 관련된 간격이 이미 생성되었는지 확인 (current-to-end만 중복 방지)
      const hasCurrentTimeRelatedGap = gaps.some(gap => {
      // 1. current-to-end 간격이 이미 존재하는 경우 (중복 방지 핵심)
      const isCurrentToEndExists = gap.type === 'current-to-end';
      
      // 2. last-to-end 간격이 현재 시간부터 조정되어 생성된 경우
      const isAdjustedLastToEnd = gap.type === 'last-to-end' && 
        Math.abs(gap.startTime.getTime() - now.getTime()) < 60000; // 1분 이내면 현재 시간으로 조정된 것
      
      return isCurrentToEndExists || isAdjustedLastToEnd;
    });
    
    // current-to-end 간격은 현재 시간과 관련된 다른 간격이 없는 경우에만 생성
    if (!hasCurrentTimeRelatedGap) {
      
      // 현재 진행 중인 할일이 있는지 확인 (반복 할일 인스턴스 시간 고려)
      const hasCurrentOngoingItem = sortedItems.some(item => {
        const itemStart = getAdjustedTimeForGap(item, false);
        const itemEnd = getAdjustedTimeForGap(item, true);
        
        const isOngoing = itemStart && itemEnd && 
               now.getTime() >= itemStart.getTime() && 
               now.getTime() <= itemEnd.getTime();
        
        
        return isOngoing;
      });
      
      // 현재 시간 이후에 할일이 있는지 확인 (반복 할일 인스턴스 시간 고려)
      const hasFutureItems = sortedItems.some(item => {
        const itemStart = getAdjustedTimeForNextTask(item);
        const isFuture = itemStart && itemStart.getTime() > now.getTime();
        
        
        return isFuture;
      });
      
      
      // 현재 진행 중인 할일도 없고 현재 시간 이후에 할일도 없으면 간격 표시
      if (!hasCurrentOngoingItem && !hasFutureItems) {
        // current-to-end 간격은 현재 날짜의 하루 끝까지 계산
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const diffMinutes = (endOfDay.getTime() - now.getTime()) / (1000 * 60);
        
        // console.log('🔍 current-to-end 간격 검사:', {
        //   현재시간: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        //   하루끝: endOfDay.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        //   분량: Math.floor(diffMinutes) + '분',
        //   '20분이상': diffMinutes >= 20
        // });
        
        if (diffMinutes >= 20) {
          const newGap = {
            type: 'current-to-end',
            startTime: now,
            endTime: endOfDay,
            diffMinutes: Math.floor(diffMinutes)
          };
          gaps.push(newGap);
        }
      }
    } else {
    }
    } // isTodayDate 조건 블록 종료
  
  } else if (isTodayDate && sortedItems.length === 0) {
    // 할일이 아예 없는 경우
    const now = realTimeNow;
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const diffMinutes = (endOfDay.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes >= 20) {
      gaps.push({
        type: 'current-to-end',
        startTime: now,
        endTime: endOfDay,
        diffMinutes: Math.floor(diffMinutes)
      });
    }
  }
  
  
  // console.log('🔍 최종 생성된 간격들:', {
  //   총간격수: gaps.length,
  //   간격들: gaps.map(gap => ({
  //     type: gap.type,
  //     시작: gap.startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  //     종료: gap.endTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  //     분량: gap.diffMinutes + '분'
  //   }))
  // });
  
  return gaps;
}