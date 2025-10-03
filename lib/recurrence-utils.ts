import { RRule } from 'rrule';
import { format, startOfDay, endOfDay } from 'date-fns';

interface RecurringTodoOptions {
  originalTodo: any; // 원본 할일 데이터
  rangeStart: Date;  // 검색 시작 범위
  rangeEnd: Date;    // 검색 종료 범위
  excludedDates?: string[]; // 제외할 날짜 목록 (YYYY-MM-DD 형식)
  timeOverrides?: { [date: string]: { start_time: string; end_time?: string } }; // 시간 override 목록
}

interface GeneratedRecurrenceItem {
  id: string;
  originalId: string;
  occurrenceDate: Date;
  data: any;
}

/**
 * 반복 할일의 특정 날짜 범위에서 가상 인스턴스들을 생성
 */
export function generateRecurrenceInstances({
  originalTodo,
  rangeStart,
  rangeEnd,
  excludedDates = [],
  timeOverrides = {}
}: RecurringTodoOptions): GeneratedRecurrenceItem[] {
  // 🔧 Todo 클래스 인스턴스와 DB 원본 데이터 모두 지원
  const recurrence_pattern = originalTodo.recurrencePattern || originalTodo.recurrence_pattern;
  const recurrence_interval = originalTodo.recurrenceInterval || originalTodo.recurrence_interval || 1;
  const recurrence_days_of_week = originalTodo.recurrenceDaysOfWeek || originalTodo.recurrence_days_of_week;
  const recurrence_end_date = originalTodo.recurrenceEndDate || originalTodo.recurrence_end_date;
  const start_time = originalTodo.startTime || originalTodo.start_time;
  const created_at = originalTodo.createdAt || originalTodo.created_at;
  const schedule_type = originalTodo.scheduleType || originalTodo.schedule_type;

  // 반복 패턴이 없거나 'none'이면 빈 배열 반환
  if (!recurrence_pattern || recurrence_pattern === 'none') {
    return [];
  }

  try {
    // 반복 시작일 결정 (start_time 또는 created_at 사용)
    const startDate = start_time ? new Date(start_time) : new Date(created_at);
    if (!startDate || isNaN(startDate.getTime())) {
      console.warn(`⚠️ [반복 할일 ${originalTodo.id}] 시작일 파싱 실패`);
      return [];
    }

    // ✅ 서버에서 이미 종료일 필터링 완료 - until 설정 불필요
    let untilDate: Date | undefined = undefined;

    // RRule 옵션 설정
    const ruleOptions: any = {
      dtstart: startDate, // 🔧 원본 시작 시간 사용 (startOfDay 제거)
      until: untilDate
    };

    switch (recurrence_pattern) {
      case 'daily':
        ruleOptions.freq = RRule.DAILY;
        ruleOptions.interval = recurrence_interval;
        break;

      case 'weekly':
        ruleOptions.freq = RRule.WEEKLY;
        ruleOptions.interval = recurrence_interval;
        
        // 요일 설정 (RRule이 올바른 날짜를 생성하기 위해 필요)
        if (recurrence_days_of_week && Array.isArray(recurrence_days_of_week)) {
          const weekdayMap = [
            RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA
          ];
          ruleOptions.byweekday = recurrence_days_of_week.map(day => weekdayMap[day]);
        }
        break;

      case 'monthly':
        ruleOptions.freq = RRule.MONTHLY;
        ruleOptions.interval = recurrence_interval;
        break;

      default:
        console.warn(`⚠️ [반복 할일 ${originalTodo.id}] 지원하지 않는 반복 패턴: ${recurrence_pattern}`);
        return [];
    }

    // RRule 생성
    const rule = new RRule(ruleOptions);

    // 지정된 범위에서 반복 날짜들 생성
    // 🚨 중요: 반복 시작일 이전의 날짜는 제외해야 함
    const effectiveRangeStart = new Date(Math.max(
      startOfDay(rangeStart).getTime(),
      startOfDay(startDate).getTime()
    ));
    
    
    let occurrences = rule.between(
      effectiveRangeStart,
      endOfDay(rangeEnd),
      true // 범위 경계 포함
    );

    // ✅ 서버에서 이미 요일 필터링 완료 - 클라이언트 추가 필터링 불필요

    // 🚫 제외된 날짜 필터링
    if (excludedDates.length > 0) {
      const originalLength = occurrences.length;
      occurrences = occurrences.filter(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        return !excludedDates.includes(dateString);
      });
      
    }

    // 가상 할일 인스턴스들 생성
    return occurrences.map((occurrenceDate, index) => {
      const dateString = format(occurrenceDate, 'yyyy-MM-dd');
      
      // 원본 할일의 시간 정보 유지
      let instanceStartTime: Date;
      let instanceEndTime: Date | null = null;

      // 🆕 시간 override 확인 - 특정 날짜에 대한 시간 변경이 있는지 체크
      const override = timeOverrides[dateString];
      
      if (override) {
        // 🎯 시간 override가 있는 경우: override 시간 사용
        console.log(`⏰ 시간 override 적용: ${dateString}`, override);
        instanceStartTime = new Date(override.start_time);
        instanceEndTime = override.end_time ? new Date(override.end_time) : null;
      } else if (start_time) {
        // 🔧 한국 시간대를 고려한 정확한 시간 처리 (기존 로직)
        const originalStart = new Date(start_time);
        
        // 🔧 완전히 새로운 접근법: "의도한 로컬 시간" 직접 추출
        // 브라우저 환경에서 Date 객체의 getHours()는 로컬 시간을 반환
        // 이는 우리가 원하는 "의도한 로컬 시간"과 일치함
        const intentedLocalTime = {
          hours: originalStart.getHours(),    // 브라우저 로컬 시간 = 의도한 시간
          minutes: originalStart.getMinutes(),
          seconds: originalStart.getSeconds()
        };

        // 반복 인스턴스도 동일한 "의도한 로컬 시간"으로 생성
        const year = occurrenceDate.getFullYear();
        const month = occurrenceDate.getMonth();
        const day = occurrenceDate.getDate();
        
        // 새로운 날짜에 의도한 로컬 시간을 적용
        instanceStartTime = new Date(year, month, day, intentedLocalTime.hours, intentedLocalTime.minutes, intentedLocalTime.seconds);
        
        // 종료 시간도 설정 - 원시 데이터와 엔티티 모두 지원
        const endTimeValue = originalTodo.end_time || originalTodo.endTime;
        if (endTimeValue) {
          const originalEnd = new Date(endTimeValue);
          const duration = originalEnd.getTime() - originalStart.getTime();
          instanceEndTime = new Date(instanceStartTime.getTime() + duration);
          
          // 종료 시간 계산 완료
        } else {
          // 원본 할일에 종료 시간이 없는 경우 (종일 일정 등)
        }
      } else {
        instanceStartTime = startOfDay(occurrenceDate);
      }

      return {
        id: `${originalTodo.id}-recurrence-${format(occurrenceDate, 'yyyy-MM-dd')}-${index}`,
        originalId: originalTodo.id,
        occurrenceDate: instanceStartTime,
        data: {
          ...originalTodo,
          id: `${originalTodo.id}-recurrence-${format(occurrenceDate, 'yyyy-MM-dd')}-${index}`,
          start_time: instanceStartTime.toISOString(),
          end_time: instanceEndTime?.toISOString() || null,
          schedule_type: schedule_type, // 명시적으로 schedule_type 포함
          is_recurrence_instance: true,
          recurrence_source_id: originalTodo.id,
          recurrence_occurrence_date: format(occurrenceDate, 'yyyy-MM-dd')
        }
      };
    });

  } catch (error) {
    console.error(`❌ [반복 할일 ${originalTodo.id}] 인스턴스 생성 중 오류:`, error);
    return [];
  }
}

/**
 * 여러 반복 할일들에 대해 특정 범위의 인스턴스들을 일괄 생성 (제외 날짜 고려)
 */
export async function generateAllRecurrenceInstances(
  recurringTodos: any[],
  rangeStart: Date,
  rangeEnd: Date,
  userId?: string
): Promise<GeneratedRecurrenceItem[]> {
  const allInstances: GeneratedRecurrenceItem[] = [];

  // 🚫 userId가 제공된 경우, 모든 할일의 제외 날짜를 미리 조회
  const allExclusions: { [todoId: string]: string[] } = {};
  
  // 🆕 userId가 제공된 경우, 모든 할일의 시간 override를 미리 조회
  const allTimeOverrides: { [todoId: string]: { [date: string]: { start_time: string; end_time?: string } } } = {};
  
  if (userId && recurringTodos.length > 0) {
    try {
      // 동적 import로 순환 참조 방지
      const { queryTodoExclusionsWithJWT, queryTimeOverridesWithJWT } = await import('@/lib/supabaseWebViewHelper');
      
      // 모든 반복 할일에 대한 제외 날짜를 병렬로 조회
      const exclusionPromises = recurringTodos.map(async (todo) => {
        const todoId = todo.id;
        
        // 임시 ID (temp-숫자) 형식은 건너뛰기
        if (typeof todoId === 'string' && todoId.startsWith('temp-')) {
          console.log(`⚠️ 임시 ID ${todoId} 건너뛰기 - 아직 DB에 저장되지 않음`);
          return { todoId, excludedDates: [] };
        }
        
        try {
          const excludedDates = await queryTodoExclusionsWithJWT(todoId, userId);
          return { todoId, excludedDates };
        } catch (error) {
          console.warn(`⚠️ 할일 ${todoId}의 제외 날짜 조회 실패:`, error);
          return { todoId, excludedDates: [] };
        }
      });
      
      // 🆕 모든 반복 할일에 대한 시간 override를 병렬로 조회
      const overridePromises = recurringTodos.map(async (todo) => {
        const todoId = todo.id;
        
        // 임시 ID (temp-숫자) 형식은 건너뛰기
        if (typeof todoId === 'string' && todoId.startsWith('temp-')) {
          console.log(`⚠️ 임시 ID ${todoId} 시간 override 건너뛰기 - 아직 DB에 저장되지 않음`);
          return { todoId, overrides: {} };
        }
        
        try {
          const dateRange = {
            start: format(rangeStart, 'yyyy-MM-dd'),
            end: format(rangeEnd, 'yyyy-MM-dd')
          };
          const overrides = await queryTimeOverridesWithJWT(todoId, userId, dateRange);
          
          // 날짜별로 override 데이터를 맵으로 변환
          const overrideMap: { [date: string]: { start_time: string; end_time?: string } } = {};
          overrides.forEach((override: any) => {
            overrideMap[override.override_date] = {
              start_time: override.start_time,
              end_time: override.end_time
            };
          });
          
          return { todoId, overrides: overrideMap };
        } catch (error) {
          console.warn(`⚠️ 할일 ${todoId}의 시간 override 조회 실패:`, error);
          return { todoId, overrides: {} };
        }
      });

      const [exclusionResults, overrideResults] = await Promise.all([
        Promise.all(exclusionPromises),
        Promise.all(overridePromises)
      ]);
      
      // 결과를 객체로 변환
      exclusionResults.forEach(({ todoId, excludedDates }) => {
        allExclusions[todoId] = excludedDates;
      });
      
      overrideResults.forEach(({ todoId, overrides }) => {
        allTimeOverrides[todoId] = overrides;
      });
      
    } catch (error) {
      console.warn('⚠️ 제외 날짜 및 시간 override 조회 중 오류 발생:', error);
    }
  }

  recurringTodos.forEach(todo => {
    const excludedDates = allExclusions[todo.id] || [];
    const timeOverrides = allTimeOverrides[todo.id] || {};
    
    console.log(`🔄 [${todo.content?.substring(0, 20)}] 반복 할일 인스턴스 생성:`, {
      todoId: todo.id,
      pattern: todo.recurrence_pattern,
      excludedCount: excludedDates.length,
      overrideCount: Object.keys(timeOverrides).length
    });
    
    const instances = generateRecurrenceInstances({
      originalTodo: todo,
      rangeStart,
      rangeEnd,
      excludedDates,
      timeOverrides
    });
    
    allInstances.push(...instances);
  });


  return allInstances;
}

/**
 * 반복 할일인지 확인
 */
export function isRecurringTodo(todo: any): boolean {
  // 🔧 Todo 클래스 인스턴스와 DB 원본 데이터 모두 지원
  const recurrencePattern = todo.recurrencePattern || todo.recurrence_pattern;
  const result = !!(
    recurrencePattern &&
    recurrencePattern !== 'none'
  );
  
  
  return result;
}

/**
 * 반복 할일의 다음 발생 날짜 계산
 */
export function getNextOccurrence(todo: any, fromDate: Date = new Date()): Date | null {
  if (!isRecurringTodo(todo)) {
    return null;
  }

  try {
    const instances = generateRecurrenceInstances({
      originalTodo: todo,
      rangeStart: fromDate,
      rangeEnd: new Date(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000) // 1년 후까지
    });

    return instances.length > 0 ? instances[0].occurrenceDate : null;
  } catch (error) {
    console.error(`❌ 다음 발생 날짜 계산 실패:`, error);
    return null;
  }
}

/**
 * 반복 할일의 특정 날짜 완료 상태 확인
 */
export function isRecurrenceInstanceCompleted(
  todoId: string, 
  targetDate: Date, 
  completions: { todo_id: string; completion_date: string }[]
): boolean {
  const targetDateString = format(targetDate, 'yyyy-MM-dd');
  
  return completions.some(completion => 
    completion.todo_id === todoId && 
    completion.completion_date === targetDateString
  );
}

/**
 * 반복 할일 인스턴스들에 완료 상태를 적용
 */
export function applyCompletionStatusToInstances(
  instances: GeneratedRecurrenceItem[],
  completions: { todo_id: string; completion_date: string }[]
): GeneratedRecurrenceItem[] {
  return instances.map(instance => {
    const isCompleted = isRecurrenceInstanceCompleted(
      instance.originalId,
      instance.occurrenceDate,
      completions
    );

    return {
      ...instance,
      data: {
        ...instance.data,
        completed: isCompleted,
        completion_status: isCompleted ? 'completed' : 'pending'
      }
    };
  });
}

/**
 * 특정 날짜의 완료 기록 생성을 위한 데이터 준비
 */
export function prepareCompletionData(
  todoId: string,
  userId: string,
  targetDate: Date
) {
  return {
    todo_id: todoId,
    user_id: userId,
    completion_date: format(targetDate, 'yyyy-MM-dd')
  };
}

/**
 * 날짜 문자열을 Date 객체로 변환 (시간대 고려)
 */
export function parseCompletionDate(dateString: string): Date {
  const date = new Date(dateString + 'T00:00:00');
  return startOfDay(date);
}