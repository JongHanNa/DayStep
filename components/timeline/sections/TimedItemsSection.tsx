import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TimelineItem } from '@/types/timeline-view';
import { TimeGap } from '@/lib/timeGapUtils';
import { CurrentTimeMarker, TimeIndicator, NextTaskTimeIndicator, TimeGapIndicator } from '../indicators';
import { TimelineItemCard } from '../items';

interface TimedItemsSectionProps {
  currentDate: Date;
  timedItems: TimelineItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDragging: boolean;
  previewTime: string | null;
  currentDragY: number;
  showDayStartGap: boolean;
  isTodayDate: boolean;
  realTimeNow: Date;
  currentTimeMarkerPosition: {
    timeInMinutes: number;
    hour: number;
    minute: number;
  } | null;
  showPastGaps: boolean;
  timeGaps: TimeGap[];
  draggedItemId: string | null;
  cardOffsetY?: number; // 카드 위치 보정값
  onTodoClick: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onAddTask: (startTime: Date, endTime: Date) => void;
  onDragHandlers: {
    onTouchStart: (e: React.TouchEvent | React.MouseEvent, itemId: string) => void;
    onTouchMove: (e: React.TouchEvent | React.MouseEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * 시간 지정 할일들의 타임라인 렌더링을 담당하는 컴포넌트
 * 
 * 주요 기능:
 * - 시간 지정 할일들을 시간순으로 표시
 * - 드래그 앤 드롭으로 시간 변경 (5분 단위 스냅)
 * - 현재 시간 마커 표시
 * - 시간 간격 표시 및 할일 추가 버튼
 * - 반복 할일 인스턴스 시간 계산 및 표시
 */
export const TimedItemsSection: React.FC<TimedItemsSectionProps> = ({
  currentDate,
  timedItems,
  isCollapsed,
  onToggleCollapse,
  isDragging,
  previewTime,
  currentDragY,
  showDayStartGap,
  isTodayDate,
  realTimeNow,
  currentTimeMarkerPosition,
  showPastGaps,
  timeGaps,
  draggedItemId,
  cardOffsetY = 0,
  onTodoClick,
  onToggleComplete,
  onAddTask,
  onDragHandlers
}) => {
  if (timedItems.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-1 pb-4">
      {/* 시간 지정 일정 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4 px-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-full transition-colors bg-section-header hover:bg-section-header-hover"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gray-700 dark:text-gray-300">시간 지정</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ({timedItems.length})
            </span>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* 접혀있으면 내용 숨김 */}
      {!isCollapsed && (
        <div 
          id="timed-items-section" 
          className="timed-items-section relative px-2"
          style={{
            overscrollBehavior: 'contain', // 이중스크롤 방지
          }}
        >
      {/* 드래그 중 시간 마커 제거 - DragPortal에서 통합 처리 */}
      
      {/* 🕐 하루 시작 시간 표시 (오전 00:00) - 오늘 날짜는 설정에 따라, 다른 날짜는 항상 표시 */}
      {(!isTodayDate || showDayStartGap) && (
        <TimeIndicator
          time={new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0)}
          showIfNotConsecutive={true}
        />
      )}
      
      {/* 🔧 오늘 날짜에서 start-to-first 간격 표시 (타임라인 맨 처음) */}
      {isTodayDate && (() => {
        const currentToNextGap = timeGaps.find(gap => gap.type === 'current-to-next');
        const startToFirstGap = timeGaps.find(gap => gap.type === 'start-to-first');

        if (startToFirstGap) {
          // current-to-next가 있는지 확인
          if (currentToNextGap) {
            const currentToNextStart = currentToNextGap.startTime.getTime();
            const startToFirstStart = startToFirstGap.startTime.getTime();
            const startToFirstEnd = startToFirstGap.endTime.getTime();

            // current-to-next가 start-to-first 중간에 있으면 분할
            if (currentToNextStart > startToFirstStart && currentToNextStart < startToFirstEnd) {
              const splitGap = {
                startTime: startToFirstGap.startTime,
                endTime: currentToNextGap.startTime, // 현재시간까지만
              };

              // 분할된 간격이 20분 이상일 때만 표시
              const splitDurationMinutes = (splitGap.endTime.getTime() - splitGap.startTime.getTime()) / (1000 * 60);

              if (splitDurationMinutes >= 20) {
                return (
                  <TimeGapIndicator
                    startTime={splitGap.startTime}
                    endTime={splitGap.endTime}
                    onAddTask={() => onAddTask(splitGap.startTime, splitGap.endTime)}
                  />
                );
              }
            } else {
              // 겹치지 않으면 전체 start-to-first 간격 표시
              return (
                <TimeGapIndicator
                  startTime={startToFirstGap.startTime}
                  endTime={startToFirstGap.endTime}
                  onAddTask={() => onAddTask(startToFirstGap.startTime, startToFirstGap.endTime)}
                />
              );
            }
          } else {
            // current-to-next가 없으면 start-to-first 간격 표시
            return (
              <TimeGapIndicator
                startTime={startToFirstGap.startTime}
                endTime={startToFirstGap.endTime}
                onAddTask={() => onAddTask(startToFirstGap.startTime, startToFirstGap.endTime)}
              />
            );
          }
        }
        return null;
      })()}
      
      {(() => {
        // 현재 시간 마커를 삽입할 위치 찾기
        let currentTimeMarkerInserted = false;
        
        return timedItems.map((item, index) => {
          const itemStartTime = item.startTime ? new Date(item.startTime) : null;
          const itemTimeInMinutes = itemStartTime 
            ? itemStartTime.getHours() * 60 + itemStartTime.getMinutes()
            : null;
          
          // 이전 아이템의 종료시간과 현재 아이템의 시작시간이 같은지 확인
          const prevItem = index > 0 ? timedItems[index - 1] : null;
          const prevEndTime = prevItem?.endTime ? new Date(prevItem.endTime) : null;
          const currentStartTime = item.startTime ? new Date(item.startTime) : null;
          
          // 시간이 연속되는지 확인 (분 단위까지 같은지)
          const isTimeConsecutive = prevEndTime && currentStartTime && 
            prevEndTime.getHours() === currentStartTime.getHours() &&
            prevEndTime.getMinutes() === currentStartTime.getMinutes();
          
          // 다음 아이템과의 시간 연속성 확인 (종료시간 표시 여부 결정용)
          const nextItem = index < timedItems.length - 1 ? timedItems[index + 1] : null;
          const nextStartTime = nextItem?.startTime ? new Date(nextItem.startTime) : null;
          const currentEndTime = item.endTime ? new Date(item.endTime) : null;
          
          const isNextTimeConsecutive = currentEndTime && nextStartTime &&
            currentEndTime.getHours() === nextStartTime.getHours() &&
            currentEndTime.getMinutes() === nextStartTime.getMinutes();
          
          // 현재 시간이 이 아이템 진행 중인지 확인
          const itemEndTime = item.endTime ? new Date(item.endTime) : 
            (item.startTime ? new Date(new Date(item.startTime).getTime() + 30 * 60 * 1000) : null);
          const itemEndTimeInMinutes = itemEndTime ? 
            itemEndTime.getHours() * 60 + itemEndTime.getMinutes() : null;
          
          const isCurrentTimeInItem = currentTimeMarkerPosition && 
            itemTimeInMinutes && itemEndTimeInMinutes &&
            currentTimeMarkerPosition.timeInMinutes >= itemTimeInMinutes &&
            currentTimeMarkerPosition.timeInMinutes <= itemEndTimeInMinutes;
          
          // 현재 시간이 이 아이템보다 이른 시간이고 아직 마커를 삽입하지 않았다면
          const shouldInsertMarkerBefore = currentTimeMarkerPosition && 
            !currentTimeMarkerInserted && 
            itemTimeInMinutes && 
            currentTimeMarkerPosition.timeInMinutes < itemTimeInMinutes;
          
          if (shouldInsertMarkerBefore || isCurrentTimeInItem) {
            currentTimeMarkerInserted = true;
          }
          
          return (
            <React.Fragment key={item.id}>
              {/* 현재 시간 마커 삽입 */}
              {shouldInsertMarkerBefore && (
                <React.Fragment>
                  {/* 🔧 현재 시간 마커 직전에 과거→현재 간격 표시 (할일 사이에 있을 때) */}
                  {isTodayDate && (() => {
                    // 이전 할일의 종료 시간 (반복 할일 인스턴스 고려)
                    const prevItem = index > 0 ? timedItems[index - 1] : null;
                    
                    // 반복 할일 인스턴스의 올바른 시간 계산
                    const getAdjustedTimeForRender = (itemForTime: any, isEndTime: boolean = false) => {
                      if (typeof itemForTime.id === 'string' && itemForTime.id.includes('recurrence')) {
                        const match = itemForTime.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
                        if (match) {
                          const instanceDateString = match[1];
                          const originalTime = isEndTime 
                            ? (itemForTime.endTime ? new Date(itemForTime.endTime) : new Date(new Date(itemForTime.startTime).getTime() + 30 * 60 * 1000))
                            : new Date(itemForTime.startTime);
                          
                          const adjustedTime = new Date(instanceDateString);
                          adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
                          
                          return adjustedTime;
                        }
                      }
                      
                      if (isEndTime) {
                        return itemForTime.endTime 
                          ? new Date(itemForTime.endTime) 
                          : itemForTime.startTime 
                            ? new Date(new Date(itemForTime.startTime).getTime() + 30 * 60 * 1000)
                            : null;
                      } else {
                        return itemForTime.startTime ? new Date(itemForTime.startTime) : null;
                      }
                    };
                    
                    const prevEndTime = prevItem ? getAdjustedTimeForRender(prevItem, true) : null;
                    
                    // 현재 시간이 이전 할일 종료 후부터 다음 할일 시작 전 사이에 있는 경우
                    if (prevEndTime && currentTimeMarkerPosition) {
                      const currentTime = realTimeNow;
                      const nextStartTime = getAdjustedTimeForRender(item, false);
                      
                      if (nextStartTime && 
                          currentTime.getTime() > prevEndTime.getTime() && 
                          currentTime.getTime() < nextStartTime.getTime()) {
                        
                        // 간격이 20분 이상인 경우에만 과거→현재 간격 표시
                        const pastToCurrentMinutes = (currentTime.getTime() - prevEndTime.getTime()) / (1000 * 60);
                        if (pastToCurrentMinutes >= 20) {
                          return (
                            <TimeGapIndicator
                              startTime={prevEndTime}
                              endTime={currentTime}
                              onAddTask={() => onAddTask(prevEndTime, currentTime)}
                            />
                          );
                        }
                      }
                    }
                    return null;
                  })()}
                  
                  <CurrentTimeMarker />
                </React.Fragment>
              )}
              
              {/* 현재 시간 마커 이후에 다음 작업까지 남은 시간 표시 */}
              {shouldInsertMarkerBefore && isTodayDate && (() => {
                const currentToNextGap = timeGaps.find(gap => gap.type === 'current-to-next');
                if (currentToNextGap) {
                  return (
                    <NextTaskTimeIndicator 
                      nextTaskTime={currentToNextGap.endTime}
                      nextTaskTitle={currentToNextGap.nextTaskTitle}
                      onAddTask={() => onAddTask(currentToNextGap.startTime, currentToNextGap.endTime)}
                    />
                  );
                }
                return null;
              })()}
              
              {/* 하루 시작부터 첫 번째 할일까지 간격 표시 (오늘이 아닌 날짜만) */}
              {!isTodayDate && index === 0 && (() => {
                const startToFirstGap = timeGaps.find(gap => gap.type === 'start-to-first');

                // 오늘이 아닌 날짜에서 start-to-first 간격이 있으면 표시
                if (startToFirstGap) {
                  return (
                    <TimeGapIndicator
                      startTime={startToFirstGap.startTime}
                      endTime={startToFirstGap.endTime}
                      onAddTask={() => onAddTask(startToFirstGap.startTime, startToFirstGap.endTime)}
                    />
                  );
                }
                return null;
              })()}
              
              <div>
                {/* 시작 시간 (카드 위) - 이전 아이템과 시간이 연속되지 않을 때만 표시 */}
                {item.startTime && (
                  <TimeIndicator
                    time={item.startTime}
                    showIfNotConsecutive={!isTimeConsecutive}
                  />
                )}
                
                {/* 할일 카드 */}
                <TimelineItemCard
                  item={item}
                  isDraggable={true}
                  isDragging={isDragging}
                  draggedItemId={draggedItemId}
                  cardOffsetY={cardOffsetY} // 카드 위치 보정값
                  realTimeNow={realTimeNow}
                  currentTimeMarkerPosition={currentTimeMarkerPosition}
                  onTodoClick={onTodoClick}
                  onToggleComplete={onToggleComplete}
                  onDragHandlers={onDragHandlers}
                />
                
                {/* 종료 시간 (카드 아래) - 다음 아이템과 시간이 연속되지 않을 때만 표시 */}
                {item.endTime && (
                  <TimeIndicator
                    time={item.endTime}
                    showIfNotConsecutive={!isNextTimeConsecutive}
                  />
                )}
                
                {/* 다음 할일과의 간격 표시 - 20분 이상 간격일 때 */}
                {index < timedItems.length - 1 && !isNextTimeConsecutive && (() => {
                  const nextItem = timedItems[index + 1];
                  
                  // 🔧 반복 할일 인스턴스의 올바른 시간 계산 (개별 렌더링용)
                  const getAdjustedTimeForRender = (itemForTime: any, isEndTime: boolean = false) => {
                    // 반복 할일 인스턴스인지 확인
                    if (typeof itemForTime.id === 'string' && itemForTime.id.includes('recurrence')) {
                      const match = itemForTime.id.match(/recurrence-(\d{4}-\d{2}-\d{2})/);
                      if (match) {
                        const instanceDateString = match[1]; // 2025-08-21
                        const originalTime = isEndTime 
                          ? (itemForTime.endTime ? new Date(itemForTime.endTime) : new Date(new Date(itemForTime.startTime).getTime() + 30 * 60 * 1000))
                          : new Date(itemForTime.startTime);
                        
                        // 인스턴스 날짜 + 원본 시간으로 조합
                        const adjustedTime = new Date(instanceDateString);
                        adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
                        
                        return adjustedTime;
                      }
                    }
                    
                    // 일반 할일은 그대로 반환
                    if (isEndTime) {
                      return itemForTime.endTime 
                        ? new Date(itemForTime.endTime) 
                        : itemForTime.startTime 
                          ? new Date(new Date(itemForTime.startTime).getTime() + 30 * 60 * 1000)
                          : null;
                    } else {
                      return itemForTime.startTime ? new Date(itemForTime.startTime) : null;
                    }
                  };
                  
                  const currentEndTime = getAdjustedTimeForRender(item, true);
                  const nextStartTime = getAdjustedTimeForRender(nextItem, false);
                  
                  if (currentEndTime && nextStartTime) {
                    const diffMinutes = (nextStartTime.getTime() - currentEndTime.getTime()) / (1000 * 60);
                    
                    // 20분 이상 간격이면 표시
                    // between-items 간격은 계획 파악에 중요하므로 showPastGaps 설정과 무관하게 항상 표시
                    const shouldShowGap = diffMinutes >= 20;
                    
                    if (shouldShowGap) {
                      // 🔧 현재 시간이 이 간격 안에 있는지 확인
                      const currentTime = isTodayDate && currentTimeMarkerPosition ? realTimeNow : null;
                      const isCurrentTimeInGap = currentTime && 
                        currentTime.getTime() > currentEndTime.getTime() && 
                        currentTime.getTime() < nextStartTime.getTime();
                      
                      // 현재 시간이 간격 안에 있으면 일반 간격 표시를 하지 않음 (분할된 간격들이 따로 표시됨)
                      if (isCurrentTimeInGap) {
                        return null;
                      }
                      
                      // current-to-next 간격이 표시되고 있는지 확인
                      const currentToNextGap = timeGaps.find(gap => gap.type === 'current-to-next');
                      
                      if (currentToNextGap) {
                        // 🔧 완전히 동일한 간격인 경우에만 숨김 (부분 겹침은 허용)
                        const isExactSame = 
                          currentEndTime.getTime() === currentToNextGap.startTime.getTime() && 
                          nextStartTime.getTime() === currentToNextGap.endTime.getTime();
                          
                        if (isExactSame) {
                          // 완전히 동일한 간격이면 중복이므로 숨김
                          return null;
                        }
                        
                        // 🔧 부분 겹침이 있어도 각각의 고유한 구간이므로 표시함
                        // 예: last-past-to-current(10:10→10:56) + current-to-next(10:56→11:43)
                      }
                      
                      return (
                        <TimeGapIndicator
                          startTime={currentEndTime}
                          endTime={nextStartTime}
                          onAddTask={() => onAddTask(currentEndTime, nextStartTime)}
                        />
                      );
                    }
                  }
                  
                  return null;
                })()}
                
                {/* 연속된 시간 중간 표시 - 다음 아이템과 시간이 연속될 때 */}
                {isNextTimeConsecutive && item.endTime && (
                  <TimeIndicator
                    time={item.endTime}
                    showIfNotConsecutive={true}
                  />
                )}
              </div>
              
              {/* 🔧 과거→현재 간격은 마지막 아이템 이후에서만 렌더링 (중복 방지) */}
              
              {/* 🔧 마지막 아이템 이후 last-to-end 간격은 현재 시간 마커 이후에만 렌더링하도록 제거 */}
              
              {/* 마지막 아이템 이후에도 현재 시간이 남아있다면 삽입 */}
              {index === timedItems.length - 1 && currentTimeMarkerPosition && !currentTimeMarkerInserted && (
                <React.Fragment>
                  {/* 🔧 과거 할일 종료 후 현재까지의 간격 표시 (통합된 위치) */}
                  {isTodayDate && (() => {
                    const lastPastToCurrentGap = timeGaps.find(gap => gap.type === 'last-past-to-current');
                    if (lastPastToCurrentGap) {
                      //console.log('✅ 과거→현재 간격 렌더링 시작! (마지막 아이템 이후 통합 위치)');
                      return (
                        <TimeGapIndicator
                          startTime={lastPastToCurrentGap.startTime}
                          endTime={lastPastToCurrentGap.endTime}
                          onAddTask={() => onAddTask(lastPastToCurrentGap.startTime, lastPastToCurrentGap.endTime)}
                        />
                      );
                    }
                    return null;
                  })()}
                  
                  <CurrentTimeMarker />
                  
                  {/* 🔧 현재 시간 이후에 current-to-next 간격 표시 */}
                  {isTodayDate && (() => {
                    const currentToNextGap = timeGaps.find(gap => gap.type === 'current-to-next');
                    if (currentToNextGap) {
                      return (
                        <NextTaskTimeIndicator 
                          nextTaskTime={currentToNextGap.endTime}
                          nextTaskTitle={currentToNextGap.nextTaskTitle}
                          onAddTask={() => onAddTask(currentToNextGap.startTime, currentToNextGap.endTime)}
                        />
                      );
                    }
                    return null;
                  })()}
                  
                  {/* 🔧 현재 시간 마커 위치에서는 last-to-end 간격 렌더링 안함 (하단 독립 블록에서 처리) */}
                </React.Fragment>
              )}
            </React.Fragment>
          );
        });
      })()}
      
      {/* 현재 시간부터 하루 끝까지의 간격 표시 (할일이 없을 때) */}
      {(() => {
        const currentToNextGap = timeGaps.find(gap => gap.type === 'current-to-next');
        const currentToEndGap = timeGaps.find(gap => gap.type === 'current-to-end');
        
        // current-to-next가 표시되고 있으면 current-to-end는 표시하지 않음
        if (currentToEndGap && !currentToNextGap) {
          return (
            <TimeGapIndicator
              startTime={currentToEndGap.startTime}
              endTime={currentToEndGap.endTime}
              onAddTask={() => onAddTask(currentToEndGap.startTime, currentToEndGap.endTime)}
            />
          );
        }
        return null;
      })()}
      
      {/* 🔧 last-to-end 간격 표시 (날짜 구분 없이 항상 표시) */}
      {(() => {
        const lastToEndGap = timeGaps.find(gap => gap.type === 'last-to-end');
        
        if (lastToEndGap) {
          // last-to-end 간격이 있으면 표시 (날짜와 관계없이)
          // 🔧 last-to-end 간격 표시 (로그 제거)
          
          return (
            <TimeGapIndicator
              startTime={lastToEndGap.startTime}
              endTime={lastToEndGap.endTime}
              onAddTask={() => onAddTask(lastToEndGap.startTime, lastToEndGap.endTime)}
            />
          );
        }
        return null;
      })()}
      
      {/* 하루 끝 시간 표시 */}
      <TimeIndicator
        time={new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59)}
        showIfNotConsecutive={true}
      />
        </div>
      )}
    </div>
  );
};