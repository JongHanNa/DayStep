import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useTodoStore } from '@/state/stores/todoStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useProjectStore } from '@/state/stores/projectStore';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import { fetchNotesWithJWT } from '@/lib/supabase/notes';
import { getTodoNotes } from '@/lib/supabase/todo-notes';
import type { Note } from '@/types/domain';
import { generateAllRecurrenceInstances, applyCompletionStatusToInstances, isRecurringTodo } from '@/lib/recurrence-utils';
import { loadCompletionsForDateRange } from '@/lib/supabase/completions';
import { queryAnytimeTodosWithJWT } from '@/lib/supabase/todo-postpone';
import type { TimelineItem, ProjectMapValue, DepartmentMapValue } from '../types';

interface UseTimelineDataParams {
  userId: string;
}

export function useTimelineData({ userId }: UseTimelineDataParams) {
  const { todos, fetchAllTodos } = useTodoStore();
  const { loadPeople } = useCherishedPeopleStore();
  const { projects, fetchProjects } = useProjectStore();
  const { departments, fetchDepartments } = useDepartmentStore();

  const [isLoading, setIsLoading] = useState(true);
  const [recurrenceInstances, setRecurrenceInstances] = useState<TimelineItem[]>([]);
  const [completions, setCompletions] = useState<{ todo_id: string; completion_date: string }[]>([]);
  const [fuelNotes, setFuelNotes] = useState<Note[]>([]);
  const [todoFuelMap, setTodoFuelMap] = useState<Record<string, string[]>>({});
  const [pastMonthsLoaded, setPastMonthsLoaded] = useState(1);
  const [futureMonthsLoaded, setFutureMonthsLoaded] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [anytimeCount, setAnytimeCount] = useState(0);

  // 목표 기능은 추후 구현 예정 - 빈 배열로 대체
  const goals: { id: string; title: string }[] = [];

  // 날짜 범위 계산
  const dateRange = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const rangeStart = subMonths(currentMonthStart, pastMonthsLoaded);
    const rangeEnd = endOfMonth(addMonths(currentMonthStart, futureMonthsLoaded - 1));
    return { rangeStart, rangeEnd };
  }, [pastMonthsLoaded, futureMonthsLoaded]);

  // 현재 시간 실시간 동기화 (1분마다 갱신)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllTodos(),
        loadPeople(userId),
        fetchProjects(userId),
        fetchDepartments(userId)
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos, loadPeople, fetchProjects, fetchDepartments]);

  // 반복 인스턴스 생성 및 완료 상태 로드
  useEffect(() => {
    const loadRecurrenceData = async () => {
      if (!userId || todos.length === 0) {
        setRecurrenceInstances([]);
        setCompletions([]);
        return;
      }

      try {
        const recurringTodos = todos.filter(todo => isRecurringTodo(todo));

        if (recurringTodos.length === 0) {
          setRecurrenceInstances([]);
          const loadedCompletions = await loadCompletionsForDateRange(
            dateRange.rangeStart,
            dateRange.rangeEnd,
            userId
          );
          setCompletions(loadedCompletions);
          return;
        }

        const [instances, loadedCompletions] = await Promise.all([
          generateAllRecurrenceInstances(
            recurringTodos,
            dateRange.rangeStart,
            dateRange.rangeEnd,
            userId
          ),
          loadCompletionsForDateRange(
            dateRange.rangeStart,
            dateRange.rangeEnd,
            userId
          )
        ]);

        const instancesWithCompletion = applyCompletionStatusToInstances(instances, loadedCompletions);

        const timelineInstances: TimelineItem[] = instancesWithCompletion.map(instance => {
          const data = instance.data;
          const originalTodo = recurringTodos.find(t => t.id === instance.originalId);

          return {
            id: instance.id,
            title: data.title || data.content,
            completed: data.completed || false,
            startTime: data.start_time ? new Date(data.start_time) : null,
            endTime: data.end_time ? new Date(data.end_time) : null,
            scheduleType: data.schedule_type || 'timed',
            createdAt: data.created_at ? new Date(data.created_at) : new Date(),
            projectId: data.project_id,
            goalId: data.goal_id,
            departmentId: data.department_id,
            icon: data.icon,
            color: data.color,
            orderIndex: data.order_index || 0,
            recurrencePattern: data.recurrence_pattern,
            recurrenceInterval: data.recurrence_interval,
            recurrenceEndDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : undefined,
            recurrenceCount: data.recurrence_count,
            recurrenceDaysOfWeek: data.recurrence_days_of_week,
            isRecurrenceInstance: true,
            recurrenceSourceId: instance.originalId,
            recurrenceOccurrenceDate: data.recurrence_occurrence_date,
            isSkipped: instance.isSkipped || data.is_skipped || false,
            exclusionReason: instance.exclusionReason || data.exclusion_reason,
            isActualExecution: data.is_actual_execution || false,
            originalStartTime: data.original_start_time || undefined,
            originalEndTime: data.original_end_time || undefined,
            postponedToTime: data.postponed_to_end_time || undefined,
            postponedToStartTime: data.postponed_to_start_time || undefined,
            originalTodo: originalTodo
          };
        });

        setRecurrenceInstances(timelineInstances);
        setCompletions(loadedCompletions);
      } catch (error) {
        console.error('반복 인스턴스 로드 실패:', error);
        setRecurrenceInstances([]);
      }
    };

    loadRecurrenceData();
  }, [userId, todos, dateRange.rangeStart, dateRange.rangeEnd]);

  // fuel 노트 로드
  useEffect(() => {
    const loadFuelNotes = async () => {
      if (!userId) return;
      try {
        const allNotes = await fetchNotesWithJWT(userId);
        const fuel = allNotes.filter(n => n.note_category === 'fuel');
        setFuelNotes(fuel);
      } catch (error) {
        console.error('fuel 노트 로드 실패:', error);
      }
    };
    loadFuelNotes();
  }, [userId]);

  // Todo별 연결된 fuel 정보 로드
  useEffect(() => {
    const loadTodoFuelLinks = async () => {
      if (!userId || todos.length === 0) return;

      try {
        const isValidUUID = (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        };

        const allTodoIds = todos
          .map(todo => todo.id)
          .filter(id => isValidUUID(id));

        const map: Record<string, string[]> = {};
        await Promise.all(
          allTodoIds.map(async (todoId) => {
            const noteIds = await getTodoNotes(todoId);
            if (noteIds.length > 0) {
              map[todoId] = noteIds;
            }
          })
        );

        setTodoFuelMap(map);
      } catch (error) {
        console.error('Todo-Fuel 연결 정보 로드 실패:', error);
      }
    };

    loadTodoFuelLinks();
  }, [userId, todos]);

  // 프로젝트/목표/부서 매핑
  const projectMap = useMemo<Map<string, ProjectMapValue>>(() => {
    return new Map(projects.map(p => [p.id, { title: p.title, color: p.color, icon: p.icon }]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(g => [g.id, g.title]));
  }, [goals]);

  const departmentMap = useMemo<Map<string, DepartmentMapValue>>(() => {
    return new Map(departments.map(d => [d.id, { name: d.name, color: d.color, icon: d.icon }]));
  }, [departments]);

  // 연결된 fuel 노트 가져오기
  const getLinkedFuels = useCallback((item: TimelineItem): Note[] => {
    const todoId = item.isRecurrenceInstance ? item.recurrenceSourceId : item.id;
    if (!todoId) return [];
    const noteIds = todoFuelMap[todoId] || [];
    return fuelNotes.filter(note => noteIds.includes(note.id));
  }, [todoFuelMap, fuelNotes]);

  // 시간 미정 할일 개수 로드
  const loadAnytimeCount = useCallback(async (navigatedMonth: Date) => {
    try {
      const selectedDateString = format(navigatedMonth, 'yyyy-MM-dd');
      const items = await queryAnytimeTodosWithJWT(userId, selectedDateString);
      setAnytimeCount(items.length);
    } catch (error) {
      console.error('시간 미정 할일 개수 조회 실패:', error);
    }
  }, [userId]);

  return {
    // State
    isLoading,
    recurrenceInstances,
    completions,
    fuelNotes,
    currentTime,
    anytimeCount,
    pastMonthsLoaded,
    futureMonthsLoaded,
    isLoadingMore,
    // Memos
    dateRange,
    projectMap,
    goalMap,
    departmentMap,
    // Callbacks
    getLinkedFuels,
    loadAnytimeCount,
    // Setters (다른 훅에서 수정 필요)
    setRecurrenceInstances,
    setCompletions,
    setPastMonthsLoaded,
    setFutureMonthsLoaded,
    setIsLoadingMore,
  };
}
