import { RRule } from 'rrule';
import { format, startOfDay, endOfDay } from 'date-fns';

// 제외 사유 타입
type ExclusionReasonType = 'skipped' | 'postponed' | 'not_needed' | 'missed';

interface RecurringTodoOptions {
  originalTodo: any; // 원본 할일 데이터
  rangeStart: Date;  // 검색 시작 범위
  rangeEnd: Date;    // 검색 종료 범위
  excludedDates?: string[]; // 제외할 날짜 목록 (YYYY-MM-DD 형식) - deleted 사유만
  skippedDatesMap?: { [date: string]: ExclusionReasonType }; // 건너뛴 날짜 맵 (날짜 → 사유)
  timeOverrides?: { [date: string]: { start_time?: string; end_time?: string; title?: string } }; // 시간/제목 override 목록
}

interface GeneratedRecurrenceItem {
  id: string;
  originalId: string;
  occurrenceDate: Date;
  data: any;
  isSkipped?: boolean; // 건너뛴 인스턴스 여부
  exclusionReason?: ExclusionReasonType; // 제외 사유
}

/**
 * 반복 할일의 특정 날짜 범위에서 가상 인스턴스들을 생성
 */
export function generateRecurrenceInstances({
  originalTodo,
  rangeStart,
  rangeEnd,
  excludedDates = [],
  skippedDatesMap = {},
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

    // 🔧 크로스데이 할일의 경우 마지막 날 다음날까지 범위 확장
    if (recurrence_end_date) {
      const lastDay = new Date(recurrence_end_date);

      // 크로스데이 여부 확인 (원본 할일의 시작/종료 시간 비교)
      const originalStart = new Date(start_time);
      const endTimeValue = originalTodo.end_time || originalTodo.endTime;
      if (endTimeValue) {
        const originalEnd = new Date(endTimeValue);
        const startTimeOfDay = originalStart.getHours() * 60 + originalStart.getMinutes();
        const endTimeOfDay = originalEnd.getHours() * 60 + originalEnd.getMinutes();
        const isCrossDay = endTimeOfDay < startTimeOfDay;

        if (isCrossDay) {
          // 마지막 발생일의 다음날 자정까지 범위 포함
          untilDate = endOfDay(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
        } else {
          untilDate = endOfDay(lastDay);
        }
      } else {
        untilDate = endOfDay(lastDay);
      }
    }

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
    const instances = occurrences.map((occurrenceDate, index) => {
      const dateString = format(occurrenceDate, 'yyyy-MM-dd');

      // 원본 할일의 시간 정보 유지
      let instanceStartTime: Date;
      let instanceEndTime: Date | null = null;

      // 🆕 시간/제목 override 확인 - 특정 날짜에 대한 변경이 있는지 체크
      const override = timeOverrides[dateString];

      // 시간 override가 있는 경우 (start_time이 있어야 시간 override)
      if (override && override.start_time) {
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

      // 🆕 제목 override 적용 - 인스턴스별 제목 변경 지원
      const instanceTitle = override?.title || originalTodo.title || originalTodo.content;

      // 🆕 건너뛴 날짜인지 확인 + 제외 사유
      const exclusionReason = skippedDatesMap[dateString];
      const isSkipped = !!exclusionReason;

      const instanceData = {
        ...originalTodo,
        id: `${originalTodo.id}-recurrence-${format(occurrenceDate, 'yyyy-MM-dd')}-${index}`,
        title: instanceTitle, // 🆕 제목 override 적용
        content: instanceTitle, // 🆕 content도 동기화 (UI에서 content 사용 시)
        start_time: instanceStartTime.toISOString(),
        end_time: instanceEndTime?.toISOString() || null,
        schedule_type: schedule_type, // 명시적으로 schedule_type 포함
        is_recurrence_instance: true,
        recurrence_source_id: originalTodo.id,
        recurrence_occurrence_date: format(occurrenceDate, 'yyyy-MM-dd'),
        time_override: override || undefined, // 🔧 override 정보 추가 (시간/제목 모두 포함)
        is_skipped: isSkipped, // 🆕 건너뛴 인스턴스 플래그
        exclusion_reason: exclusionReason || null // 🆕 제외 사유
      };

      return {
        id: `${originalTodo.id}-recurrence-${format(occurrenceDate, 'yyyy-MM-dd')}-${index}`,
        originalId: originalTodo.id,
        occurrenceDate: instanceStartTime,
        data: instanceData,
        isSkipped, // 🆕 건너뛴 인스턴스 여부
        exclusionReason // 🆕 제외 사유
      };
    });

    return instances;

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

  // 🚫 userId가 제공된 경우, 모든 할일의 제외 날짜를 미리 조회 (deleted vs 그 외 사유 구분)
  const allExclusions: { [todoId: string]: string[] } = {}; // deleted 사유만
  const allSkippedMaps: { [todoId: string]: { [date: string]: ExclusionReasonType } } = {}; // 그 외 사유 (날짜→사유 맵)
  
  // 🆕 userId가 제공된 경우, 모든 할일의 시간 override를 미리 조회
  const allTimeOverrides: { [todoId: string]: { [date: string]: { start_time: string; end_time?: string } } } = {};
  
  if (userId && recurringTodos.length > 0) {
    try {
      // 동적 import로 순환 참조 방지
      const { queryTodoExclusionsDetailWithJWT, queryTimeOverridesWithJWT } = await import('@/lib/supabaseWebViewHelper');

      // 모든 반복 할일에 대한 제외 날짜를 병렬로 조회 (deleted vs 그 외 사유 구분)
      const exclusionPromises = recurringTodos.map(async (todo) => {
        const todoId = todo.id;

        // 임시 ID (temp-숫자) 형식은 건너뛰기
        if (typeof todoId === 'string' && todoId.startsWith('temp-')) {
          console.log(`⚠️ 임시 ID ${todoId} 건너뛰기 - 아직 DB에 저장되지 않음`);
          return { todoId, deletedDates: [], skippedDatesMap: {} as { [date: string]: ExclusionReasonType } };
        }

        try {
          const exclusionDetails = await queryTodoExclusionsDetailWithJWT(todoId, userId);
          // deleted는 날짜 배열로, 나머지는 날짜→사유 맵으로
          const deletedDates = exclusionDetails
            .filter(e => e.exclusion_reason === 'deleted')
            .map(e => e.excluded_date);
          const skippedDatesMap: { [date: string]: ExclusionReasonType } = {};
          exclusionDetails
            .filter(e => e.exclusion_reason !== 'deleted')
            .forEach(e => {
              skippedDatesMap[e.excluded_date] = e.exclusion_reason as ExclusionReasonType;
            });
          return { todoId, deletedDates, skippedDatesMap };
        } catch (error) {
          console.warn(`⚠️ 할일 ${todoId}의 제외 날짜 조회 실패:`, error);
          return { todoId, deletedDates: [], skippedDatesMap: {} as { [date: string]: ExclusionReasonType } };
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

      // 결과를 객체로 변환 (deleted vs 그 외 사유 분리)
      exclusionResults.forEach(({ todoId, deletedDates, skippedDatesMap }) => {
        allExclusions[todoId] = deletedDates;
        allSkippedMaps[todoId] = skippedDatesMap;
      });

      overrideResults.forEach(({ todoId, overrides }) => {
        allTimeOverrides[todoId] = overrides;
      });

    } catch (error) {
      console.warn('⚠️ 제외 날짜 및 시간 override 조회 중 오류 발생:', error);
    }
  }

  recurringTodos.forEach(todo => {
    const excludedDates = allExclusions[todo.id] || []; // deleted 사유만 (인스턴스 생성 안 함)
    const skippedDatesMap = allSkippedMaps[todo.id] || {}; // 그 외 사유 (인스턴스 생성 + 플래그)
    const timeOverrides = allTimeOverrides[todo.id] || {};

    console.log(`🔄 [${todo.content?.substring(0, 20)}] 반복 할일 인스턴스 생성:`, {
      todoId: todo.id,
      pattern: todo.recurrence_pattern,
      deletedCount: excludedDates.length,
      skippedCount: Object.keys(skippedDatesMap).length,
      overrideCount: Object.keys(timeOverrides).length
    });

    const instances = generateRecurrenceInstances({
      originalTodo: todo,
      rangeStart,
      rangeEnd,
      excludedDates,
      skippedDatesMap,
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
 * 완료 기록 타입 (실제 수행 시간 포함)
 */
interface CompletionWithActualTime {
  todo_id: string;
  completion_date: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
}

/**
 * 반복 할일 인스턴스들에 완료 상태를 적용
 *
 * 2026-01-19: actual_start_time이 있는 경우 새 인스턴스 생성 로직 추가
 * - 원래 인스턴스가 "미룸" 상태면 → "미룸" 상태 유지
 * - actual_end_time 시간에 새 인스턴스 추가 → "완료" 상태
 */
export function applyCompletionStatusToInstances(
  instances: GeneratedRecurrenceItem[],
  completions: CompletionWithActualTime[]
): GeneratedRecurrenceItem[] {
  const result: GeneratedRecurrenceItem[] = [];

  instances.forEach(instance => {
    const dateString = format(instance.occurrenceDate, 'yyyy-MM-dd');

    // 해당 날짜의 완료 기록 찾기
    const completion = completions.find(c =>
      c.todo_id === instance.originalId &&
      c.completion_date === dateString
    );

    // 완료 기록이 있고, actual_start_time이 있는 경우 (미루기 후 완료)
    if (completion && completion.actual_start_time && completion.actual_end_time) {
      // 원래 인스턴스가 "미룸" 상태인 경우
      if (instance.exclusionReason === 'postponed') {
        // 1. 원래 인스턴스: "미룸" 상태 유지 (완료 아님)
        result.push({
          ...instance,
          data: {
            ...instance.data,
            completed: false,
            completion_status: 'postponed',
            postponed_to_time: completion.actual_end_time, // 미룬 목적지 종료 시간 (뱃지 표시용)
            postponed_to_start_time: completion.actual_start_time, // 미룬 목적지 시작 시간 (뱃지 표시용)
          }
        });

        // 2. 실제 수행 시간에 새 인스턴스 추가: "완료" 상태
        const actualEndTime = new Date(completion.actual_end_time);
        const actualStartTime = new Date(completion.actual_start_time);

        result.push({
          ...instance,
          id: `${instance.id}-actual-completion`,
          occurrenceDate: actualEndTime, // 종료 시간 기준으로 표시
          data: {
            ...instance.data,
            id: `${instance.data.id}-actual-completion`,
            start_time: actualStartTime.toISOString(),
            end_time: actualEndTime.toISOString(),
            completed: true,
            completion_status: 'completed',
            is_actual_execution: true, // 실제 수행 인스턴스 표시
            original_occurrence_date: dateString, // 원래 날짜 기록
            original_start_time: instance.data.start_time, // 원래 시작 시간 (뱃지 표시용)
            is_skipped: false, // 명시적 초기화 (원래 인스턴스 값 덮어쓰기)
            exclusion_reason: undefined, // 명시적 초기화 (원래 인스턴스 값 덮어쓰기)
          },
          isSkipped: false,
          exclusionReason: undefined
        });
      } else {
        // 원래 인스턴스가 "미룸" 상태가 아닌 경우 (일반 완료)
        // 실제 시간으로 업데이트하고 완료 처리
        const actualEndTime = new Date(completion.actual_end_time);
        const actualStartTime = new Date(completion.actual_start_time);

        result.push({
          ...instance,
          occurrenceDate: actualEndTime,
          data: {
            ...instance.data,
            start_time: actualStartTime.toISOString(),
            end_time: actualEndTime.toISOString(),
            completed: true,
            completion_status: 'completed'
          }
        });
      }
    } else {
      // 완료 기록이 없거나, actual_start_time이 없는 경우 (기존 로직)
      const isCompleted = !!completion;

      result.push({
        ...instance,
        data: {
          ...instance.data,
          completed: isCompleted,
          completion_status: isCompleted ? 'completed' : (instance.exclusionReason || 'pending')
        }
      });
    }
  });

  return result;
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

/**
 * 두 날짜 사이의 반복 인스턴스 수 계산
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @param pattern 반복 패턴 (daily, weekly, monthly)
 * @param interval 반복 간격 (기본값: 1)
 * @param daysOfWeek 주간 반복 시 요일 배열 (0=일, 1=월, ...)
 * @returns 총 인스턴스 수
 */
export function calculateInstancesBetweenDates(
  startDate: Date,
  endDate: Date,
  pattern: string,
  interval: number = 1,
  daysOfWeek?: number[]
): number {
  if (startDate > endDate) return 0;

  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  switch (pattern) {
    case 'daily':
      // 매일 반복: (종료일 - 시작일) / 간격 + 1
      return Math.floor(diffDays / interval) + 1;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // 특정 요일만 반복: 해당 요일 수 계산
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
          if (daysOfWeek.includes(current.getDay())) {
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        // 간격 적용 (매주 = interval 1, 2주마다 = interval 2)
        if (interval > 1) {
          return Math.ceil(count / interval);
        }
        return count;
      } else {
        // 주간 반복 (간격 적용)
        const diffWeeks = Math.floor(diffDays / 7);
        return Math.floor(diffWeeks / interval) + 1;
      }

    case 'monthly':
      // 월간 반복: 월 차이 계산
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      const diffMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
      return Math.floor(diffMonths / interval) + 1;

    default:
      return 0;
  }
}

/**
 * 반복 할일의 남은 인스턴스 수 계산
 * @param todo 반복 할일 정보
 * @param excludedDates 제외된 날짜 목록 (YYYY-MM-DD 형식)
 * @returns 남은 인스턴스 수 (무한 반복인 경우 -1)
 */
export function calculateRemainingInstances(
  todo: {
    recurrence_pattern?: string;
    recurrencePattern?: string;
    recurrence_end_date?: Date | string | null;
    recurrenceEndDate?: Date | string | null;
    recurrence_count?: number | null;
    recurrenceCount?: number | null;
    recurrence_interval?: number;
    recurrenceInterval?: number;
    recurrence_days_of_week?: number[];
    recurrenceDaysOfWeek?: number[];
    start_time?: Date | string | null;
    startTime?: Date | string | null;
  },
  excludedDates: string[]
): number {
  // 패턴 추출 (camelCase와 snake_case 모두 지원)
  const pattern = todo.recurrence_pattern || todo.recurrencePattern;
  if (!pattern || pattern === 'none') {
    return 0;
  }

  const endDate = todo.recurrence_end_date || todo.recurrenceEndDate;
  const count = todo.recurrence_count || todo.recurrenceCount;
  const startTime = todo.start_time || todo.startTime;

  // 종료일과 횟수가 모두 없으면 무한 반복
  if (!endDate && !count) {
    return -1; // 무한 반복
  }

  let totalInstances = 0;

  if (count) {
    // 횟수 기반 종료
    totalInstances = count;
  } else if (endDate && startTime) {
    // 날짜 기반 종료
    const interval = todo.recurrence_interval || todo.recurrenceInterval || 1;
    const daysOfWeek = todo.recurrence_days_of_week || todo.recurrenceDaysOfWeek;

    totalInstances = calculateInstancesBetweenDates(
      new Date(startTime),
      new Date(endDate),
      pattern,
      interval,
      daysOfWeek
    );
  }

  // 남은 인스턴스 = 전체 - 제외된 날짜
  return Math.max(0, totalInstances - excludedDates.length);
}