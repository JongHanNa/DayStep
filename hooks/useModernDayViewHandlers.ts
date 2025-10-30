import { useCallback } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo as DbTodo } from '@/types';
import { isRecurringTodo } from '@/lib/utils/recurring';

export interface TimelineItem {
  id: string;
  type: string;
  data?: any;
  title?: string;
  startTime?: string | Date;
  endTime?: string | Date;
}

export interface UseModernDayViewHandlersParams {
  allDayItems: TimelineItem[];
  timedItems: TimelineItem[];
  completedItems: TimelineItem[];
  anytimeItems: TimelineItem[];
  todos: any[];
  currentDate: Date;
  setSelectedTodo: (todo: DbTodo | null) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setAddModalStartTime: (time: Date) => void;
  setAddModalEndTime: (time: Date) => void;
  setIsAddModalOpen: (open: boolean) => void;
}

export function useModernDayViewHandlers({
  allDayItems,
  timedItems,
  completedItems,
  anytimeItems,
  todos,
  currentDate,
  setSelectedTodo,
  setIsEditModalOpen,
  setAddModalStartTime,
  setAddModalEndTime,
  setIsAddModalOpen,
}: UseModernDayViewHandlersParams) {
  const { toggleTodo, toggleRecurrenceCompletion } = useTodoStore();

  // 아이템 완료 토글 핸들러
  const handleToggleComplete = useCallback(async (itemId: string) => {
    // 아이템 타입에 따라 적절한 액션 실행
    const allItems = [...allDayItems, ...timedItems, ...completedItems, ...anytimeItems];
    const item = allItems.find(i => i.id === itemId);
    
    if (item && item.type === 'todo') {
      const todoData = item.data;
      const isRecurring = todoData?.is_recurrence_instance || 
                        (todoData?.recurrence_pattern && todoData.recurrence_pattern !== 'none');
      
      if (isRecurring) {
        // 반복 할일: 날짜별 완료 토글
        const originalId = todoData.recurrence_source_id || todoData.id;
        await toggleRecurrenceCompletion(originalId, currentDate);
      } else {
        // 일반 할일: 기존 완료 토글 (todo- 프리픽스 제거)
        const todoId = itemId.startsWith('todo-') ? itemId.replace('todo-', '') : itemId;
        
        const result = await toggleTodo(todoId);
      }
    }
    // 다른 타입의 아이템들도 나중에 추가할 수 있음
  }, [allDayItems, timedItems, completedItems, anytimeItems, toggleRecurrenceCompletion, currentDate, toggleTodo]);

  // 할일 카드 클릭 핸들러 (수정 모달 열기)
  const handleTodoClick = useCallback((itemId: string) => {
    // 먼저 모든 타임라인 아이템에서 클릭된 아이템 찾기
    const allItems = [...allDayItems, ...timedItems, ...completedItems, ...anytimeItems];
    const timelineItem = allItems.find(item => item.id === itemId);
    
    if (timelineItem && timelineItem.type === 'todo') {
      // 반복 할일인지 확인 (아이콘 표시와 동일한 로직 사용)
      const isRecurring = isRecurringTodo(timelineItem);
      
      if (isRecurring || itemId.includes('-recurrence-')) {
        // 반복 할일: 원본 할일 데이터 + 인스턴스 시간 조합
        console.log('반복 할일 클릭:', timelineItem);
        
        if (itemId.includes('-recurrence-')) {
          // 반복 인스턴스: 원본 할일 ID로 원본 데이터 찾기
          const originalId = timelineItem.data?.recurrence_source_id || timelineItem.data?.id;
          const originalTodo = todos.find(t => t.id === originalId);
          
          if (originalTodo && timelineItem.data) {
            // 원본 할일의 반복 설정 + 인스턴스의 조정된 시간 조합
            
            
            const combinedData: DbTodo & { _instanceInfo?: any } = {
              id: originalTodo.id,
              user_id: originalTodo.userId || originalTodo.user_id,
              title: originalTodo.title,
              completed: timelineItem.data.completed || originalTodo.completed,
              order_index: originalTodo.orderIndex || originalTodo.order_index || 0,
              created_at: (() => {
                const date = originalTodo.createdAt || originalTodo.created_at;
                if (date && typeof date === 'string') { return date; }
                if (date instanceof Date) { return date.toISOString(); }
                return new Date().toISOString();
              })(),
              updated_at: (() => {
                const date = originalTodo.updatedAt || originalTodo.updated_at;
                if (date && typeof date === 'string') { return date; }
                if (date instanceof Date) { return date.toISOString(); }
                return new Date().toISOString();
              })(),
              priority: originalTodo.priority,
              icon: originalTodo.icon,
              color: originalTodo.color,
              schedule_type: originalTodo.schedule_type || originalTodo.scheduleType || 
                            (originalTodo.start_time || originalTodo.startTime ? 'timed' : 'anytime'),
              // 반복 할일 수정 시에는 원본 할일의 시간을 우선적으로 사용 (원본 시간 → data 시간 → 타임라인 시간)
              start_time: (() => {
                // 1. 원본 할일의 시간 우선 (반복 할일의 실제 설정된 시간)
                const originalTime = originalTodo.start_time || originalTodo.startTime;
                if (originalTime) {
                  if (typeof originalTime === 'string') { return originalTime; }
                  if (originalTime instanceof Date) { return originalTime.toISOString(); }
                  try { return new Date(originalTime).toISOString(); } catch { /* fallback */ }
                }
                // 2. timelineItem.data의 start_time
                if (timelineItem.data.start_time) { return timelineItem.data.start_time; }
                // 3. 타임라인 아이템의 startTime (최후 fallback)
                if (timelineItem.startTime) {
                  if (typeof timelineItem.startTime === 'string') { return timelineItem.startTime; }
                  if (timelineItem.startTime instanceof Date) { return timelineItem.startTime.toISOString(); }
                }
                return null;
              })(),
              end_time: (() => {
                // 반복 할일의 경우 원본의 duration을 계산해서 당일 종료시간을 생성
                const originalStartTime = originalTodo.start_time || originalTodo.startTime;
                const originalEndTime = originalTodo.end_time || originalTodo.endTime;
                
                if (originalStartTime && originalEndTime) {
                  try {
                    const startDate = new Date(originalStartTime);
                    const endDate = new Date(originalEndTime);
                    
                    
                    // 원본 할일의 duration 계산 (같은 날이어야 함)
                    const isSameDay = startDate.toDateString() === endDate.toDateString();
                    
                    if (isSameDay) {
                      // 당일 duration을 사용해서 현재 인스턴스의 종료시간 계산
                      const durationMs = endDate.getTime() - startDate.getTime();
                      const instanceStartTime = new Date(originalStartTime);
                      const instanceEndTime = new Date(instanceStartTime.getTime() + durationMs);
                      return instanceEndTime.toISOString();
                    } else {
                      // 다른 날짜면 원본 할일의 시간 부분만 사용해서 duration 계산
                      const startHour = startDate.getHours();
                      const startMinute = startDate.getMinutes();
                      const endHour = endDate.getHours();
                      const endMinute = endDate.getMinutes();
                      
                      // 원본 할일의 시간 부분 duration 계산 (분 단위)
                      const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                      
                      const instanceStartTime = new Date(originalStartTime);
                      const instanceEndTime = new Date(instanceStartTime.getTime() + (durationMinutes * 60 * 1000));
                      return instanceEndTime.toISOString();
                    }
                  } catch (e) {
                    console.warn('반복 할일 종료시간 계산 실패:', e);
                  }
                }
                
                // Fallback: timelineItem의 시간들 사용
                if (timelineItem.data.end_time) { return timelineItem.data.end_time; }
                if (timelineItem.endTime) {
                  if (typeof timelineItem.endTime === 'string') { return timelineItem.endTime; }
                  if (timelineItem.endTime instanceof Date) { return timelineItem.endTime.toISOString(); }
                }
                return null;
              })(),
              // 원본 할일의 반복 설정 보존
              recurrence_pattern: originalTodo.recurrence_pattern || originalTodo.recurrencePattern || 'none',
              recurrence_end_date: (() => {
                const date = originalTodo.recurrence_end_date || originalTodo.recurrenceEndDate;
                if (!date) { return null; }
                if (typeof date === 'string') { 
                  return date.includes('T') ? date.split('T')[0] : date; 
                }
                if (date instanceof Date) { return date.toISOString().split('T')[0]; }
                try { return new Date(date).toISOString().split('T')[0]; } catch { return null; }
              })(),
              recurrence_count: originalTodo.recurrence_count || originalTodo.recurrenceCount || null,
              recurrence_interval: originalTodo.recurrence_interval || originalTodo.recurrenceInterval || 1,
              recurrence_days_of_week: originalTodo.recurrence_days_of_week || originalTodo.recurrenceDaysOfWeek || null,
              recurrence_day_of_month: originalTodo.recurrence_day_of_month || originalTodo.recurrenceDayOfMonth || null,
              departure_location: originalTodo.departure_location || originalTodo.departureLocation || null,
              departure_time: (() => {
                const time = originalTodo.departure_time || originalTodo.departureTime;
                if (!time) return null;
                if (typeof time === 'string') return time;
                if (time instanceof Date) return time.toISOString();
                try { return new Date(time).toISOString(); } catch { return null; }
              })(),
              parent_todo_id: originalTodo.parent_todo_id || originalTodo.parentTodoId || null,
              // Second Brain 필드들 추가
              project_id: originalTodo.project_id || null,
              clarification: originalTodo.clarification || 'none',
              next_action_contexts: originalTodo.next_action_contexts || null,
              is_today_highlight: originalTodo.is_today_highlight || false,
              assigned_to: originalTodo.assigned_to || null,
              assigned_date: (() => {
                const date = originalTodo.assigned_date;
                if (!date) { return null; }
                if (typeof date === 'string') { return date; }
                if (date instanceof Date) { return date.toISOString(); }
                try { return new Date(date).toISOString(); } catch { return null; }
              })(),
              // 반복 인스턴스 정보 추가
              _instanceInfo: {
                instanceId: timelineItem.id,
                instanceDate: timelineItem.data.recurrence_occurrence_date,
                startTime: timelineItem.startTime,
                endTime: timelineItem.endTime
              }
            };
            
            setSelectedTodo(combinedData);
          } else {
            // 원본 할일을 찾을 수 없으면 기존 데이터 사용
            setSelectedTodo(timelineItem.data);
          }
        } else {
          // 일반 반복 할일: 기존 데이터 사용
          setSelectedTodo(timelineItem.data);
        }
        setIsEditModalOpen(true);
      } else {
        // 일반 할일: 타임라인에 실제 표시된 시간으로 업데이트
        if (timelineItem.data) {
          // 타임라인 아이템 데이터를 기본으로 하되, 실제 표시 시간으로 덮어쓰기
          const updatedTodoData = {
            ...timelineItem.data,
            // 누락된 필드들 기본값 설정
            schedule_type: timelineItem.data?.schedule_type || 
                          timelineItem.data?.scheduleType || 
                          (timelineItem.startTime ? 'timed' : 'anytime'),
            // 타임라인에 실제 표시된 시간으로 업데이트
            start_time: (() => {
              // 1. 타임라인 아이템의 startTime 우선 (실제 화면에 보이는 시간)
              if (timelineItem.startTime) {
                if (typeof timelineItem.startTime === 'string') { return timelineItem.startTime; }
                if (timelineItem.startTime instanceof Date) { return timelineItem.startTime.toISOString(); }
              }
              // 2. 기존 데이터의 start_time
              return timelineItem.data?.start_time || null;
            })(),
            end_time: (() => {
              // 1. 타임라인 아이템의 endTime 우선 (실제 화면에 보이는 시간)
              if (timelineItem.endTime) {
                if (typeof timelineItem.endTime === 'string') { return timelineItem.endTime; }
                if (timelineItem.endTime instanceof Date) { return timelineItem.endTime.toISOString(); }
              }
              // 2. 기존 데이터의 end_time
              return timelineItem.data?.end_time || null;
            })()
          };
          
          console.log('🔍 일반 할일 schedule_type 디버깅 (시간 업데이트):', {
            original_start_time: timelineItem.data.start_time,
            timeline_startTime: timelineItem.startTime,
            updated_start_time: updatedTodoData.start_time,
            schedule_type: updatedTodoData.schedule_type,
            timelineItem_data_keys: Object.keys(timelineItem.data || {}),
            has_schedule_type: 'schedule_type' in (timelineItem.data || {}),
            has_scheduleType: 'scheduleType' in (timelineItem.data || {})
          });
          
          setSelectedTodo(updatedTodoData);
          setIsEditModalOpen(true);
        } else {
          // 기존 todos 배열에서 찾기
          const todoId = itemId.replace('todo-', '');
          const todo = todos.find(t => t.id === todoId);
          
          if (todo) {
            // Todo 엔티티를 데이터베이스 형식으로 변환
            const dbTodo: DbTodo = {
              id: todo.id,
              user_id: todo.userId,
              title: todo.title,
              completed: todo.completed,
              order_index: todo.orderIndex,
              created_at: todo.createdAt.toISOString(),
              updated_at: todo.updatedAt.toISOString(),
              priority: todo.priority,
              icon: todo.icon,
              color: todo.color,
              schedule_type: todo.scheduleType,
              start_time: todo.startTime?.toISOString() || null,
              end_time: todo.endTime?.toISOString() || null,
              recurrence_pattern: todo.recurrencePattern,
              recurrence_end_date: todo.recurrenceEndDate?.toISOString() || null,
              recurrence_count: todo.recurrenceCount,
              recurrence_interval: todo.recurrenceInterval,
              recurrence_days_of_week: todo.recurrenceDaysOfWeek,
              recurrence_day_of_month: todo.recurrenceDayOfMonth,
              departure_location: todo.departureLocation,
              departure_time: todo.departureTime?.toISOString() || null,
              parent_todo_id: todo.parentTodoId,
              // Second Brain 필드들 추가
              project_id: todo.projectId || null,
              clarification: todo.clarification || 'none',
              next_action_contexts: todo.nextActionContexts || null,
              is_today_highlight: todo.isTodayHighlight || false,
              assigned_to: todo.assignedTo || null,
              assigned_date: todo.assignedDate?.toISOString() || null,
            };
            
            setSelectedTodo(dbTodo);
            setIsEditModalOpen(true);
          }
        }
      }
    }
  }, [allDayItems, timedItems, completedItems, anytimeItems, todos, setSelectedTodo, setIsEditModalOpen]);

  // 할일 추가 핸들러
  const handleAddTask = useCallback((startTime: Date, endTime: Date) => {
    setAddModalStartTime(startTime);
    setAddModalEndTime(endTime);
    setIsAddModalOpen(true);
  }, [setAddModalStartTime, setAddModalEndTime, setIsAddModalOpen]);

  return {
    handleToggleComplete,
    handleTodoClick,
    handleAddTask,
  };
}