'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { format, isToday, startOfMonth, endOfMonth, subMonths, addMonths, getDate, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle2, Clock, Trash2, Circle, Heart, AlertCircle, ChevronUp, ChevronDown, Repeat, Zap, AlertTriangle, XCircle, SkipForward, Pause, MinusCircle, Cloud } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { Todo } from '@/entities/todo/Todo';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { fetchNotesWithJWT } from '@/lib/supabase/notes';
import { getTodoNotes } from '@/lib/supabase/todo-notes';
import type { Note } from '@/types/second-brain';
import { generateAllRecurrenceInstances, applyCompletionStatusToInstances, isRecurringTodo } from '@/lib/recurrence-utils';
import { loadCompletionsForDateRange } from '@/lib/supabase/completions';
import { TodoCompletionsService } from '@/services/todo-completions.service';
import { createTodoExclusionWithJWT, deleteTodoExclusionWithJWT } from '@/lib/supabase/todo-exclusions';
import { MonthNavigator } from './MonthNavigator';
import { getTimeStatus, getTimeStatusText, type TimeStatusResult } from '@/lib/utils/timeStatus';
import { TimeProgressBar } from '@/components/shared/TimeProgressBar';
import { calculateTimeGaps, type TimeGap } from '@/lib/timeGapUtils';
import QuickLogModal from '@/components/adhd/QuickLogModal';
import { Plus } from 'lucide-react';
import PostponeOptionsSheet from '@/components/todos/PostponeOptionsSheet';
import AnytimeInboxSheet from '@/components/todos/AnytimeInboxSheet';
import { postponeTodoInstance, queryAnytimeTodosWithJWT } from '@/lib/supabase/todo-postpone';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useRouter } from 'next/navigation';
import type { PostponeOptions } from '@/types';

interface TodoTimelineViewProps {
  userId: string;
}

// 타임라인 아이템 타입 (일반 할일 + 반복 인스턴스 통합)
interface TimelineItem {
  id: string;
  title: string;
  completed: boolean;
  startTime: Date | null;
  endTime: Date | null;
  scheduleType: string;
  createdAt: Date;
  projectId?: string | null;
  goalId?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex: number;
  recurrencePattern?: string | null;
  recurrenceInterval?: number | null;
  recurrenceEndDate?: Date | null;
  recurrenceCount?: number | null;
  recurrenceDaysOfWeek?: number[] | null;
  joyfulPeopleIds: string[];
  shamefulPeopleIds: string[];
  // 반복 인스턴스 전용 필드
  isRecurrenceInstance?: boolean;
  recurrenceSourceId?: string;
  recurrenceOccurrenceDate?: string;
  isSkipped?: boolean; // 건너뛴 인스턴스 여부
  exclusionReason?: 'deleted' | 'skipped' | 'postponed' | 'not_needed' | 'missed'; // 제외 사유
  // 실제 수행 인스턴스 (미루기 후 완료) - 2026-01-19 추가
  isActualExecution?: boolean;
  originalStartTime?: string; // 미룸 완료 시 원래 시작 시간 (뱃지 표시용)
  originalEndTime?: string; // 미룸 완료 시 원래 종료 시간 (뱃지 표시용)
  postponedToTime?: string; // 미룸 목적지 종료 시간 (뱃지 표시용)
  postponedToStartTime?: string; // 미룸 목적지 시작 시간 (뱃지 표시용)
  // 원본 Todo 참조 (편집 모달용)
  originalTodo?: Todo;
}

// 요일 약자
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 타임라인 탭 - 할일 생성 기록 시간순
 *
 * ADHD 관점:
 * - 성취감: 완료한 일들을 시각적으로 확인
 * - 맥락: 프로젝트/목표 배지로 어떤 목표를 위한 건지 표시
 */
export function TodoTimelineView({ userId }: TodoTimelineViewProps) {
  const { todos, fetchAllTodos, updateTodo, deleteTodo, updateRecurringTodo } = useTodoStore();
  const { people, loadPeople } = useCherishedPeopleStore();
  const { showFuelBadges, setShowFuelBadges } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);

  // 펼친 fuel 배지 상태
  const [expandedFuelId, setExpandedFuelId] = useState<string | null>(null);

  // 날짜 범위 상태 (과거/미래 개월 수)
  const [pastMonthsLoaded, setPastMonthsLoaded] = useState(3);
  const [futureMonthsLoaded, setFutureMonthsLoaded] = useState(3);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 현재 네비게이션 월 (MonthNavigator 연동)
  const [navigatedMonth, setNavigatedMonth] = useState<Date>(new Date());

  // 반복 인스턴스 및 완료 상태
  const [recurrenceInstances, setRecurrenceInstances] = useState<TimelineItem[]>([]);
  const [completions, setCompletions] = useState<{ todo_id: string; completion_date: string }[]>([]);

  // 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null); // 반복 인스턴스 정보 포함
  const [editFormData, setEditFormData] = useState<TodoFormData | null>(null);

  // 삭제 확인 상태
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // 미루기 옵션 시트 상태
  const [postponeSheetOpen, setPostponeSheetOpen] = useState(false);
  const [postponingItem, setPostponingItem] = useState<TimelineItem | null>(null);
  const [isPostponeProcessing, setIsPostponeProcessing] = useState(false);

  // 시간 미정 인박스 상태
  const [anytimeInboxOpen, setAnytimeInboxOpen] = useState(false);
  const [anytimeCount, setAnytimeCount] = useState(0);

  // 라우터 및 포모도로 스토어
  const router = useRouter();
  const { connectRecurringTodo } = usePomodoroStore();

  // ADHD 모드 스토어 - 실행 모드 진입용 (2026-01-19 추가)
  const {
    setLinkedRecurringTodo,
    startAdhocMode,
    enterExecuteMode,
  } = useADHDModeStore();

  // 빈 시간 사후 기록 모달 상태
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);
  const [quickLogPrefillTime, setQuickLogPrefillTime] = useState<{ start: Date; end: Date } | null>(null);

  // 빈 시간 로그 중복 방지용 ref
  const loggedOngoingTasksRef = useRef<Set<string>>(new Set());

  // 연결된 실행 원동력을 위한 fuel 노트 상태
  const [fuelNotes, setFuelNotes] = useState<Note[]>([]);

  // Todo별 연결된 fuel note_ids 매핑
  const [todoFuelMap, setTodoFuelMap] = useState<Record<string, string[]>>({});

  // 현재 시간 (실시간 동기화)
  const [currentTime, setCurrentTime] = useState(new Date());

  // 월별 섹션 참조 (스크롤 이동용)
  const monthSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const todaySectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  const [isScrollReady, setIsScrollReady] = useState(false);

  // 프로그래밍적 스크롤 중인지 추적 (사용자 스크롤과 구분)
  const isScrollingProgrammatically = useRef(false);

  // 프로젝트/목표 관련 기능 제거됨 - 빈 배열로 대체
  const projects: { id: string; title: string }[] = [];
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
    }, 60000); // 1분

    return () => clearInterval(timer);
  }, []);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllTodos(),
        loadPeople(userId)
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos, loadPeople]);

  // 반복 인스턴스 생성 및 완료 상태 로드
  useEffect(() => {
    const loadRecurrenceData = async () => {
      if (!userId || todos.length === 0) {
        setRecurrenceInstances([]);
        setCompletions([]);
        return;
      }

      try {
        // 반복 할일 필터링
        const recurringTodos = todos.filter(todo => isRecurringTodo(todo));

        if (recurringTodos.length === 0) {
          setRecurrenceInstances([]);
          // 완료 상태는 여전히 로드 (비반복 할일에도 필요할 수 있음)
          const loadedCompletions = await loadCompletionsForDateRange(
            dateRange.rangeStart,
            dateRange.rangeEnd,
            userId
          );
          setCompletions(loadedCompletions);
          return;
        }

        // 병렬로 인스턴스 생성 및 완료 상태 로드
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

        // 완료 상태 적용
        const instancesWithCompletion = applyCompletionStatusToInstances(instances, loadedCompletions);

        // TimelineItem 형식으로 변환
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
            icon: data.icon,
            color: data.color,
            orderIndex: data.order_index || 0,
            recurrencePattern: data.recurrence_pattern,
            recurrenceInterval: data.recurrence_interval,
            recurrenceEndDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : undefined,
            recurrenceCount: data.recurrence_count,
            recurrenceDaysOfWeek: data.recurrence_days_of_week,
            joyfulPeopleIds: data.joyful_people_ids || [],
            shamefulPeopleIds: data.shameful_people_ids || [],
            isRecurrenceInstance: true,
            recurrenceSourceId: instance.originalId,
            recurrenceOccurrenceDate: data.recurrence_occurrence_date,
            isSkipped: instance.isSkipped || data.is_skipped || false,
            exclusionReason: instance.exclusionReason || data.exclusion_reason,
            isActualExecution: data.is_actual_execution || false, // 실제 수행 인스턴스 (미루기 후 완료)
            originalStartTime: data.original_start_time || undefined, // 미룸 완료 시 원래 시작 시간
            originalEndTime: data.original_end_time || undefined, // 미룸 완료 시 원래 종료 시간
            postponedToTime: data.postponed_to_time || undefined, // 미룸 목적지 종료 시간
            postponedToStartTime: data.postponed_to_start_time || undefined, // 미룸 목적지 시작 시간
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

  // fuel 노트 로드 (편집 모달에서 연결된 원동력 표시용)
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
        // UUID 형식 검증 함수
        const isValidUUID = (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        };

        // 모든 todo ID 수집 (반복 할일 포함, 임시 ID 제외)
        const allTodoIds = todos
          .map(todo => todo.id)
          .filter(id => isValidUUID(id)); // 유효한 UUID만 필터링

        // 각 todo의 연결된 fuel 조회
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

  // 프로젝트/목표 매핑 생성
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.title]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(g => [g.id, g.title]));
  }, [goals]);

  // 연결된 fuel 노트 가져오기
  const getLinkedFuels = useCallback((item: TimelineItem): Note[] => {
    // 반복 인스턴스는 원본 Todo의 연결 정보 사용
    const todoId = item.isRecurrenceInstance ? item.recurrenceSourceId : item.id;
    if (!todoId) return [];

    const noteIds = todoFuelMap[todoId] || [];
    return fuelNotes.filter(note => noteIds.includes(note.id));
  }, [todoFuelMap, fuelNotes]);

  // 완료 토글 (일반 할일 vs 반복 인스턴스 분기)
  const handleToggleComplete = useCallback(async (item: TimelineItem) => {
    if (item.isRecurrenceInstance && item.recurrenceSourceId && item.recurrenceOccurrenceDate) {
      // 반복 인스턴스: todo_completions 테이블 사용
      try {
        await TodoCompletionsService.toggleCompletion(
          item.recurrenceSourceId,
          userId,
          new Date(item.recurrenceOccurrenceDate),
          item.completed
        );

        // 로컬 상태 업데이트
        if (item.completed) {
          // 완료 취소 → completions에서 제거
          setCompletions(prev => prev.filter(c =>
            !(c.todo_id === item.recurrenceSourceId && c.completion_date === item.recurrenceOccurrenceDate)
          ));
        } else {
          // 완료 → completions에 추가
          setCompletions(prev => [...prev, {
            todo_id: item.recurrenceSourceId!,
            completion_date: item.recurrenceOccurrenceDate!
          }]);
        }

        // 인스턴스 상태 업데이트
        setRecurrenceInstances(prev => prev.map(inst =>
          inst.id === item.id
            ? { ...inst, completed: !inst.completed }
            : inst
        ));
      } catch (error) {
        console.error('반복 인스턴스 완료 토글 실패:', error);
      }
    } else if (item.originalTodo) {
      // 일반 할일: completed 필드 토글
      await updateTodo(item.originalTodo.id, { completed: !item.completed });
    }
  }, [userId, updateTodo]);

  // 삭제 처리
  const handleDelete = useCallback(async (todoId: string) => {
    await deleteTodo(todoId);
    setDeletingTodoId(null);
  }, [deleteTodo]);

  // Todo → TodoFormData 변환
  const todoToFormData = useCallback((todo: Todo, isInstance?: boolean): TodoFormData => {
    return {
      title: todo.title,
      icon: todo.icon || undefined,
      color: todo.color || undefined,
      scheduledDate: todo.startTime ? new Date(todo.startTime) : undefined,
      isHighlight: false,
      completed: todo.completed,
      projectIds: todo.projectId ? [todo.projectId] : [],
      noteIds: [],
      displayOrder: todo.orderIndex,
      includeTime: todo.scheduleType === 'timed',
      includeEndDate: !!todo.endTime,
      startTime: todo.startTime ? new Date(todo.startTime).toTimeString().slice(0, 5) : undefined,
      endDate: todo.endTime ? new Date(todo.endTime) : undefined,
      endTime: todo.endTime ? new Date(todo.endTime).toTimeString().slice(0, 5) : undefined,
      scheduleType: todo.scheduleType || 'none',
      anytimeDuration: undefined,
      recurrencePattern: todo.recurrencePattern,
      recurrenceInterval: todo.recurrenceInterval,
      recurrenceEndType: todo.recurrenceEndDate ? 'date' : (todo.recurrenceCount ? 'count' : 'never'),
      recurrenceEndDate: todo.recurrenceEndDate ? new Date(todo.recurrenceEndDate) : undefined,
      recurrenceCount: todo.recurrenceCount || undefined,
      selectedDaysOfWeek: todo.recurrenceDaysOfWeek || undefined,
      joyfulPeopleIds: todo.joyfulPeopleIds || [],
      shamefulPeopleIds: todo.shamefulPeopleIds || [],
      // 반복 인스턴스 정보
      isRecurrenceInstance: isInstance ?? false,
      originalStartDate: todo.startTime ? new Date(todo.startTime) : undefined,
    };
  }, []);

  // 편집 모달 열기
  const handleEditClick = useCallback((item: TimelineItem) => {
    if (item.originalTodo) {
      setEditingTodo(item.originalTodo);
      setEditingItem(item); // 반복 인스턴스 정보 저장
      setEditFormData(todoToFormData(item.originalTodo, item.isRecurrenceInstance));
    }
  }, [todoToFormData]);

  // 건너뛰기 처리 (반복 인스턴스)
  // reason: 'postponed' (미뤘음) | 'not_needed' (필요없었음) | 'missed' (놓침)
  const handleSkipInstance = useCallback(async (
    item: TimelineItem,
    reason: 'postponed' | 'not_needed' | 'missed' = 'not_needed'
  ) => {
    if (!item.isRecurrenceInstance || !item.recurrenceSourceId || !item.recurrenceOccurrenceDate) {
      console.error('건너뛰기 실패: 필수 정보 없음');
      return;
    }

    try {
      // todo_exclusions에 사유와 함께 추가
      await createTodoExclusionWithJWT({
        parent_todo_id: item.recurrenceSourceId,
        excluded_date: item.recurrenceOccurrenceDate,
        user_id: userId,
        exclusion_reason: reason
      });

      // 로컬 상태 업데이트: 해당 인스턴스를 isSkipped로 변경 + 제외 사유 설정
      setRecurrenceInstances(prev => prev.map(inst =>
        inst.id === item.id
          ? { ...inst, isSkipped: true, exclusionReason: reason }
          : inst
      ));
    } catch (error) {
      console.error('건너뛰기 실패:', error);
    }
  }, [userId]);

  // 제외 상태 취소 핸들러
  const handleCancelExclusion = useCallback(async (item: TimelineItem) => {
    if (!item.isRecurrenceInstance || !item.recurrenceSourceId || !item.recurrenceOccurrenceDate) {
      console.error('제외 취소 실패: 필수 정보 없음');
      return;
    }

    try {
      // DB에서 exclusion 삭제
      await deleteTodoExclusionWithJWT(
        item.recurrenceSourceId,
        item.recurrenceOccurrenceDate,
        userId
      );

      // 로컬 상태 업데이트: isSkipped 해제 + exclusionReason 초기화
      setRecurrenceInstances(prev => prev.map(inst =>
        inst.id === item.id
          ? { ...inst, isSkipped: false, exclusionReason: undefined }
          : inst
      ));
    } catch (error) {
      console.error('제외 취소 실패:', error);
    }
  }, [userId]);

  // 미루기 옵션 시트 열기
  const handleOpenPostponeSheet = useCallback((item: TimelineItem) => {
    setPostponingItem(item);
    setPostponeSheetOpen(true);
  }, []);

  // 미루기 처리
  const handlePostpone = useCallback(async (options: PostponeOptions) => {
    if (!postponingItem || !postponingItem.recurrenceSourceId || !postponingItem.recurrenceOccurrenceDate) {
      console.error('미루기 실패: 필수 정보 없음');
      return;
    }

    setIsPostponeProcessing(true);

    try {
      const { action, recordPostponement, newTime } = options;

      if (action === 'start_now') {
        // 지금 바로 하기: ExecutionMode로 진입 (2026-01-19 수정)
        if (recordPostponement) {
          await createTodoExclusionWithJWT({
            parent_todo_id: postponingItem.recurrenceSourceId,
            excluded_date: postponingItem.recurrenceOccurrenceDate,
            user_id: userId,
            exclusion_reason: 'postponed'
          });
        }

        // 실행 모드 먼저 진입 (executionMode 초기화 후)
        await enterExecuteMode(userId);

        // 그 다음 adhocMode에 반복 할일 정보 설정 (초기화 이후에 설정해야 유지됨)
        setLinkedRecurringTodo(
          postponingItem.recurrenceSourceId,
          postponingItem.recurrenceOccurrenceDate,
          postponingItem.title
        );

        // 즉흥 모드 활성화
        startAdhocMode();
      } else {
        // reschedule 또는 anytime: todo-postpone.ts 사용
        await postponeTodoInstance({
          parentTodoId: postponingItem.recurrenceSourceId,
          occurrenceDate: postponingItem.recurrenceOccurrenceDate,
          userId,
          action,
          recordPostponement,
          newTime,
          originalStartTime: postponingItem.startTime
            ? format(postponingItem.startTime, 'HH:mm')
            : undefined,
        });

        // anytime인 경우 카운트 업데이트
        if (action === 'anytime') {
          loadAnytimeCount();
        }

        // 로컬 상태 업데이트
        if (recordPostponement) {
          setRecurrenceInstances(prev => prev.map(inst =>
            inst.id === postponingItem.id
              ? { ...inst, isSkipped: true, exclusionReason: 'postponed' }
              : inst
          ));
        }
      }

      setPostponeSheetOpen(false);
      setPostponingItem(null);
    } catch (error) {
      console.error('미루기 처리 실패:', error);
    } finally {
      setIsPostponeProcessing(false);
    }
  }, [postponingItem, userId, connectRecurringTodo, router]);

  // 시간 미정 할일 개수 로드
  const loadAnytimeCount = useCallback(async () => {
    try {
      const selectedDateString = format(navigatedMonth, 'yyyy-MM-dd');
      const items = await queryAnytimeTodosWithJWT(userId, selectedDateString);
      setAnytimeCount(items.length);
    } catch (error) {
      console.error('시간 미정 할일 개수 조회 실패:', error);
    }
  }, [userId, navigatedMonth]);

  // 시간 미정 할일 개수 로드 (날짜 변경 시)
  useEffect(() => {
    if (userId) {
      loadAnytimeCount();
    }
  }, [loadAnytimeCount, userId]);

  // 빈 시간 클릭 핸들러
  const handleTimeGapClick = useCallback((gap: TimeGap) => {
    setQuickLogPrefillTime({
      start: gap.startTime,
      end: gap.endTime
    });
    setIsQuickLogModalOpen(true);
  }, []);

  // 편집 저장
  const handleEditSave = useCallback(async (formData: TodoFormData) => {
    if (!editingTodo) return;

    await updateTodo(editingTodo.id, {
      title: formData.title,
      icon: formData.icon,
      color: formData.color,
      start_time: formData.scheduledDate?.toISOString(),
      schedule_type: formData.scheduleType,
      completed: formData.completed,
      recurrence_pattern: formData.recurrencePattern as any,
      recurrence_interval: formData.recurrenceInterval,
      recurrence_end_date: formData.recurrenceEndDate?.toISOString().split('T')[0],
      recurrence_count: formData.recurrenceCount,
      recurrence_days_of_week: formData.selectedDaysOfWeek,
      joyful_people_ids: formData.joyfulPeopleIds,
      shameful_people_ids: formData.shamefulPeopleIds,
    });

    setEditingTodo(null);
    setEditFormData(null);
  }, [editingTodo, updateTodo]);

  // 편집 삭제
  const handleEditDelete = useCallback(async () => {
    if (!editingTodo) return;
    await deleteTodo(editingTodo.id);
    setEditingTodo(null);
    setEditFormData(null);
  }, [editingTodo, deleteTodo]);

  // 반복 할일 변경 저장
  const handleRecurringSave = useCallback(async (
    formData: TodoFormData,
    updateType: 'this' | 'future' | 'all'
  ) => {
    if (!editingTodo || !editingItem) return;

    // 반복 인스턴스인 경우 원본 ID와 발생 날짜 추출 (editingItem에서 가져옴)
    const isInstance = editingItem.isRecurrenceInstance;
    const sourceId = isInstance ? editingItem.recurrenceSourceId : editingTodo.id;
    const occurrenceDate = isInstance && editingItem.recurrenceOccurrenceDate
      ? new Date(editingItem.recurrenceOccurrenceDate)
      : formData.scheduledDate || new Date();

    if (!sourceId) {
      console.error('반복 할일 ID를 찾을 수 없습니다.');
      return;
    }

    // HH:mm 형식을 ISO timestamp로 변환
    const formatTimeToISO = (timeStr: string | undefined, baseDate: Date): string | undefined => {
      if (!timeStr) return undefined;
      if (timeStr.includes('T')) return timeStr; // 이미 ISO

      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };

    // 원본 할일의 날짜를 유지하면서 시간만 변경 (모두 변경용)
    const formatTimeToISOPreservingOriginalDate = (
      timeStr: string | undefined,
      originalStartTime: string | undefined
    ): string | undefined => {
      if (!timeStr) return undefined;
      if (timeStr.includes('T')) return timeStr; // 이미 ISO
      if (!originalStartTime) return formatTimeToISO(timeStr, new Date());

      const [hours, minutes] = timeStr.split(':').map(Number);
      const originalDate = new Date(originalStartTime);
      originalDate.setHours(hours, minutes, 0, 0);
      return originalDate.toISOString();
    };

    // "모두 변경"일 때 원본 할일의 날짜 유지
    let startTimeISO: string | undefined;
    let endTimeISO: string | undefined;

    if (updateType === 'all') {
      // todos 배열에서 원본 할일 찾기 (sourceId로)
      const originalTodo = todos.find(t => t.id === sourceId);
      const originalStartTime = originalTodo?.startTime?.toISOString();

      startTimeISO = formatTimeToISOPreservingOriginalDate(formData.startTime, originalStartTime);
      endTimeISO = formatTimeToISOPreservingOriginalDate(formData.endTime, originalStartTime);
    } else {
      // this/future: 인스턴스 날짜 기반
      startTimeISO = formatTimeToISO(formData.startTime, occurrenceDate);
      endTimeISO = formatTimeToISO(formData.endTime, occurrenceDate);
    }

    await updateRecurringTodo(
      sourceId,
      {
        title: formData.title,
        icon: formData.icon,
        color: formData.color,
        start_time: startTimeISO,
        end_time: endTimeISO,
        schedule_type: formData.scheduleType,
      },
      updateType,
      occurrenceDate
    );

    setEditingTodo(null);
    setEditingItem(null);
    setEditFormData(null);
  }, [editingTodo, editingItem, updateRecurringTodo]);

  // "더 보기" 핸들러
  const handleLoadMorePast = useCallback(async () => {
    setIsLoadingMore(true);
    setPastMonthsLoaded(prev => prev + 6);
    setIsLoadingMore(false);
  }, []);

  const handleLoadMoreFuture = useCallback(async () => {
    setIsLoadingMore(true);
    setFutureMonthsLoaded(prev => prev + 6);
    setIsLoadingMore(false);
  }, []);

  // 할일의 표시 날짜 결정 (startTime 기준)
  const getDisplayDate = useCallback((item: TimelineItem): Date => {
    return item.startTime || item.createdAt;
  }, []);

  // 타임라인 아이템 생성 (일반 할일 + 반복 인스턴스 병합)
  const timelineItems = useMemo(() => {
    // 일반 할일 (반복이 아닌 것 + 범위 내)
    const nonRecurringItems: TimelineItem[] = todos
      .filter(todo => {
        // 반복 할일 제외
        if (isRecurringTodo(todo)) return false;
        // startTime 있는 것만
        if (!todo.startTime) return false;
        // 날짜 범위 체크
        const todoDate = new Date(todo.startTime);
        return todoDate >= dateRange.rangeStart && todoDate <= dateRange.rangeEnd;
      })
      .map(todo => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        startTime: todo.startTime,
        endTime: todo.endTime,
        scheduleType: todo.scheduleType || 'timed',
        createdAt: todo.createdAt,
        projectId: todo.projectId,
        goalId: todo.goalId,
        icon: todo.icon,
        color: todo.color,
        orderIndex: todo.orderIndex,
        recurrencePattern: todo.recurrencePattern,
        recurrenceInterval: todo.recurrenceInterval,
        recurrenceEndDate: todo.recurrenceEndDate,
        recurrenceCount: todo.recurrenceCount,
        recurrenceDaysOfWeek: todo.recurrenceDaysOfWeek,
        joyfulPeopleIds: todo.joyfulPeopleIds || [],
        shamefulPeopleIds: todo.shamefulPeopleIds || [],
        isRecurrenceInstance: false,
        originalTodo: todo
      }));

    // 병합 및 정렬 (오래된 것 → 최신 순, 날짜 오름차순)
    const allItems = [...nonRecurringItems, ...recurrenceInstances];

    return allItems.sort((a, b) => getDisplayDate(a).getTime() - getDisplayDate(b).getTime());
  }, [todos, recurrenceInstances, dateRange.rangeStart, dateRange.rangeEnd, getDisplayDate]);

  // 월별 > 날짜별 그룹핑
  const groupedByMonth = useMemo(() => {
    const monthGroups: Record<string, Record<string, { date: Date; items: TimelineItem[] }>> = {};

    timelineItems.forEach(item => {
      const date = getDisplayDate(item);
      const monthKey = format(date, 'yyyy년 M월', { locale: ko });
      const dayNumber = getDate(date);
      const dayOfWeek = DAY_NAMES[getDay(date)];
      const dayKey = `${dayNumber}_${dayOfWeek}`; // "1_목", "2_금" 형태로 정렬 가능하게

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {};
      }
      if (!monthGroups[monthKey][dayKey]) {
        monthGroups[monthKey][dayKey] = { date, items: [] };
      }
      monthGroups[monthKey][dayKey].items.push(item);
    });

    return monthGroups;
  }, [timelineItems, getDisplayDate]);

  // 월별 키 목록 (정렬됨)
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedByMonth).sort((a, b) => {
      // "2026년 1월" 형태에서 날짜 추출하여 비교
      const parseMonthKey = (key: string) => {
        const match = key.match(/(\d+)년 (\d+)월/);
        if (match) {
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1);
        }
        return new Date();
      };
      return parseMonthKey(a).getTime() - parseMonthKey(b).getTime();
    });
  }, [groupedByMonth]);

  // 오늘 월에 데이터가 없을 때 가장 가까운 월 찾기
  const findClosestMonthWithData = useCallback((targetDate: Date): string | null => {
    if (sortedMonthKeys.length === 0) return null;

    const targetMonthKey = format(targetDate, 'yyyy년 M월', { locale: ko });

    // 오늘 월에 데이터가 있으면 그대로 반환
    if (sortedMonthKeys.includes(targetMonthKey)) {
      return targetMonthKey;
    }

    // 타겟 날짜를 기준으로 가장 가까운 월 찾기
    const targetTime = targetDate.getTime();
    let closestMonth: string | null = null;
    let minDiff = Infinity;

    for (const monthKey of sortedMonthKeys) {
      const match = monthKey.match(/(\d+)년 (\d+)월/);
      if (match) {
        const monthDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);
        const diff = Math.abs(monthDate.getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestMonth = monthKey;
        }
      }
    }

    return closestMonth;
  }, [sortedMonthKeys]);

  // 특정 월로 스크롤
  const scrollToMonth = useCallback((date: Date) => {
    const monthKey = format(date, 'yyyy년 M월', { locale: ko });
    let ref = monthSectionRefs.current[monthKey];

    // 해당 월에 데이터가 없으면 가장 가까운 월 찾기
    if (!ref) {
      const closestMonth = findClosestMonthWithData(date);
      if (closestMonth) {
        ref = monthSectionRefs.current[closestMonth];
      }
    }

    if (ref) {
      // 프로그래밍적 스크롤 시작 - IntersectionObserver 무시
      isScrollingProgrammatically.current = true;

      const scrollContainer = ref.closest('.overflow-y-auto') as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const sectionRect = ref.getBoundingClientRect();
        const scrollOffset = sectionRect.top - containerRect.top + scrollContainer.scrollTop;
        scrollContainer.scrollTop = scrollOffset;
      }

      // 스크롤 완료 후 다시 IntersectionObserver 활성화
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 300);
    }
    // MonthNavigator는 항상 요청된 날짜로 설정
    setNavigatedMonth(date);
  }, [findClosestMonthWithData]);

  // 오늘로 스크롤
  const handleTodayClick = useCallback(() => {
    const today = new Date();

    // 프로그래밍적 스크롤 시작
    isScrollingProgrammatically.current = true;

    scrollToMonth(today);

    // 오늘 날짜 섹션으로 스크롤
    setTimeout(() => {
      if (todaySectionRef.current) {
        const scrollContainer = todaySectionRef.current.closest('.overflow-y-auto') as HTMLElement | null;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const sectionRect = todaySectionRef.current.getBoundingClientRect();
          const scrollOffset = sectionRect.top - containerRect.top + scrollContainer.scrollTop;
          scrollContainer.scrollTop = scrollOffset;
        }
      }
      // 스크롤 완료 후 IntersectionObserver 다시 활성화
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 200);
    }, 100);
  }, [scrollToMonth]);

  // 월 변경 핸들러 (MonthNavigator에서 호출)
  const handleMonthChange = useCallback((date: Date) => {
    scrollToMonth(date);
  }, [scrollToMonth]);

  // 첫 로드 시 오늘 날짜로 스크롤
  useEffect(() => {
    if (isLoading || hasScrolledToToday || timelineItems.length === 0) {
      return;
    }

    // 타이머 200ms로 증가 (refs 설정 대기)
    const timer = setTimeout(() => {
      // 프로그래밍적 스크롤 시작 - IntersectionObserver 무시
      isScrollingProgrammatically.current = true;

      // 오늘이 포함된 월로 이동
      const today = new Date();
      const todayMonthKey = format(today, 'yyyy년 M월', { locale: ko });
      let monthRef = monthSectionRefs.current[todayMonthKey];

      // 오늘 월에 데이터가 없으면 가장 가까운 월 찾기
      if (!monthRef) {
        const closestMonth = findClosestMonthWithData(today);
        console.log('[Timeline] closestMonth:', closestMonth);
        console.log('[Timeline] sortedMonthKeys:', sortedMonthKeys);
        if (closestMonth) {
          monthRef = monthSectionRefs.current[closestMonth];
          console.log('[Timeline] monthRef found:', !!monthRef);
        }
      }

      if (monthRef) {
        const scrollContainer = monthRef.closest('.overflow-y-auto') as HTMLElement | null;
        console.log('[Timeline] scrollContainer found:', !!scrollContainer);
        if (scrollContainer) {
          // 오늘 날짜 섹션이 있으면 그곳으로, 없으면 월 섹션으로
          if (todaySectionRef.current) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const sectionRect = todaySectionRef.current.getBoundingClientRect();
            const scrollOffset = sectionRect.top - containerRect.top + scrollContainer.scrollTop;
            console.log('[Timeline] scrollOffset (today):', scrollOffset);
            scrollContainer.scrollTop = scrollOffset;
          } else {
            const containerRect = scrollContainer.getBoundingClientRect();
            const sectionRect = monthRef.getBoundingClientRect();
            const scrollOffset = sectionRect.top - containerRect.top + scrollContainer.scrollTop;
            console.log('[Timeline] scrollOffset (month):', scrollOffset);
            scrollContainer.scrollTop = scrollOffset;
          }
        }
      } else {
        console.log('[Timeline] monthRef is null, refs:', Object.keys(monthSectionRefs.current));
      }
      setNavigatedMonth(today);
      setHasScrolledToToday(true);
      setIsScrollReady(true);

      // 스크롤 완료 후 IntersectionObserver 다시 활성화
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 300);
    }, 200);

    return () => clearTimeout(timer);
  }, [isLoading, hasScrolledToToday, timelineItems.length, findClosestMonthWithData, sortedMonthKeys]);

  // IntersectionObserver로 스크롤 시 현재 보이는 월 감지
  useEffect(() => {
    if (!isScrollReady || sortedMonthKeys.length === 0) return;

    // 현재 보이는 월 섹션들을 추적
    const visibleMonths = new Map<string, number>(); // monthKey -> intersectionRatio

    const observer = new IntersectionObserver(
      (entries) => {
        // 프로그래밍적 스크롤 중이면 무시
        if (isScrollingProgrammatically.current) return;

        entries.forEach((entry) => {
          const monthKey = entry.target.getAttribute('data-month-key');
          if (!monthKey) return;

          if (entry.isIntersecting) {
            visibleMonths.set(monthKey, entry.intersectionRatio);
          } else {
            visibleMonths.delete(monthKey);
          }
        });

        // 가장 위에 보이는 월 찾기 (sortedMonthKeys 순서 기준)
        if (visibleMonths.size > 0) {
          // 현재 보이는 월 중 가장 먼저 나오는 월 선택
          for (const monthKey of sortedMonthKeys) {
            if (visibleMonths.has(monthKey)) {
              // monthKey에서 Date 추출
              const match = monthKey.match(/(\d+)년 (\d+)월/);
              if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const newDate = new Date(year, month, 1);
                setNavigatedMonth(newDate);
              }
              break;
            }
          }
        }
      },
      {
        root: null, // viewport 기준
        rootMargin: '-80px 0px -50% 0px', // 상단 80px(헤더 높이) 아래부터 화면 50%까지
        threshold: [0, 0.1, 0.5, 1] // 여러 threshold로 정밀 감지
      }
    );

    // 각 월 섹션에 observer 연결
    sortedMonthKeys.forEach((monthKey) => {
      const element = monthSectionRefs.current[monthKey];
      if (element) {
        element.setAttribute('data-month-key', monthKey);
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [isScrollReady, sortedMonthKeys]);

  // 현재 범위 정보 텍스트
  const rangeInfoText = useMemo(() => {
    const startText = format(dateRange.rangeStart, 'yyyy년 M월');
    const endText = format(dateRange.rangeEnd, 'yyyy년 M월');
    return `${startText} ~ ${endText}`;
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div>
        {/* MonthNavigator - 상단 고정 */}
        <div className="sticky top-0 z-10 bg-base-100">
          <div className="flex items-center">
            <div className="flex-1">
              <MonthNavigator
                currentDate={navigatedMonth}
                onMonthChange={handleMonthChange}
                onTodayClick={handleTodayClick}
              />
            </div>
            <button
              onClick={() => setShowFuelBadges(!showFuelBadges)}
              className={`btn btn-ghost btn-sm btn-circle ${showFuelBadges ? 'text-orange-500' : 'text-base-content/40'}`}
              title={showFuelBadges ? '원동력 숨기기' : '원동력 표시'}
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnytimeInboxOpen(true)}
              className="btn btn-ghost btn-sm btn-circle mr-2 text-purple-500 relative"
              title="시간 미정 할일"
            >
              <Cloud className="w-4 h-4" />
              {anytimeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {anytimeCount > 9 ? '9+' : anytimeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* 과거 더 보기 버튼 */}
          <button
            onClick={handleLoadMorePast}
            disabled={isLoadingMore}
            className="w-full py-3 mb-4 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronUp className="w-4 h-4" />
            과거 6개월 더 보기
          </button>

          <div className="flex flex-col items-center justify-center h-48 text-base-content/60">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p>이 기간에 할일이 없어요</p>
            <p className="text-sm text-base-content/40 mt-1">{rangeInfoText}</p>
          </div>

          {/* 미래 더 보기 버튼 */}
          <button
            onClick={handleLoadMoreFuture}
            disabled={isLoadingMore}
            className="w-full py-3 mt-4 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            미래 6개월 더 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* MonthNavigator - 상단 고정 */}
      <div className="sticky top-0 z-10 bg-base-100">
        <div className="flex items-center">
          <div className="flex-1">
            <MonthNavigator
              currentDate={navigatedMonth}
              onMonthChange={handleMonthChange}
              onTodayClick={handleTodayClick}
            />
          </div>
          <button
            onClick={() => setShowFuelBadges(!showFuelBadges)}
            className={`btn btn-ghost btn-sm btn-circle ${showFuelBadges ? 'text-orange-500' : 'text-base-content/40'}`}
            title={showFuelBadges ? '원동력 숨기기' : '원동력 표시'}
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnytimeInboxOpen(true)}
            className="btn btn-ghost btn-sm btn-circle mr-2 text-purple-500 relative"
            title="시간 미정 할일"
          >
            <Cloud className="w-4 h-4" />
            {anytimeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {anytimeCount > 9 ? '9+' : anytimeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={`p-4 space-y-8 transition-opacity duration-100 ${isScrollReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* 과거 더 보기 버튼 (상단) */}
        <button
          onClick={handleLoadMorePast}
          disabled={isLoadingMore}
          className="w-full py-3 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
        >
          {isLoadingMore ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              과거 6개월 더 보기
            </>
          )}
        </button>

        {/* 월별 섹션 */}
        {sortedMonthKeys.map(monthKey => {
          const dayGroups = groupedByMonth[monthKey];
          const sortedDayKeys = Object.keys(dayGroups).sort((a, b) => {
            // "1_목" 형태에서 숫자 추출
            const numA = parseInt(a.split('_')[0]);
            const numB = parseInt(b.split('_')[0]);
            return numA - numB;
          });

          return (
            <div
              key={monthKey}
              ref={el => { monthSectionRefs.current[monthKey] = el; }}
            >
              {/* 월 헤더 */}
              <h2 className="text-xl font-bold mb-6 text-base-content">{monthKey}</h2>

              {/* 날짜별 그룹 */}
              <div className="space-y-6">
                {sortedDayKeys.map(dayKey => {
                  const { date, items } = dayGroups[dayKey];
                  const [dayNumber, dayOfWeek] = dayKey.split('_');
                  const isTodayDate = isToday(date);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const isPastOrToday = itemDate.getTime() <= today.getTime();

                  // 빈 시간 계산 (timed 아이템만, 오늘 이전/오늘만)
                  let timeGaps: TimeGap[] = [];
                  if (isPastOrToday) {
                    const timedItems = items
                      .filter(item => item.scheduleType === 'timed' && item.startTime)
                      .map(item => ({
                        id: item.id,
                        title: item.title,
                        startTime: item.startTime?.toISOString(),
                        endTime: item.endTime?.toISOString(),
                        type: 'todo'
                      }));

                    timeGaps = calculateTimeGaps({
                      timedItems,
                      currentDate: date,
                      isTodayDate,
                      realTimeNow: new Date(),
                      showPastGaps: true,
                      loggedOngoingTasksRef
                    }).filter(gap => gap.type === 'between-items'); // 할일 사이 간격만
                  }

                  // 할일과 빈 시간을 시간순으로 병합
                  type RenderItem =
                    | { type: 'todo'; data: TimelineItem }
                    | { type: 'gap'; data: TimeGap; index: number };

                  const renderItems: RenderItem[] = [];

                  // 할일 추가
                  items.forEach(item => {
                    renderItems.push({ type: 'todo', data: item });
                  });

                  // 빈 시간 추가
                  timeGaps.forEach((gap, idx) => {
                    renderItems.push({ type: 'gap', data: gap, index: idx });
                  });

                  // 시간순 정렬 (startTime 기준)
                  renderItems.sort((a, b) => {
                    const getStartTime = (item: RenderItem): Date => {
                      if (item.type === 'todo') {
                        return item.data.startTime || item.data.createdAt;
                      } else {
                        return item.data.startTime;
                      }
                    };
                    return getStartTime(a).getTime() - getStartTime(b).getTime();
                  });

                  return (
                    <div
                      key={dayKey}
                      ref={isTodayDate ? todaySectionRef : undefined}
                      className="flex gap-4"
                    >
                      {/* 날짜 헤더 (왼쪽 고정) */}
                      <div className="w-12 flex-shrink-0 pt-1">
                        <div className={`text-2xl font-bold ${isTodayDate ? 'text-primary' : 'text-base-content'}`}>
                          {dayNumber}
                        </div>
                        <div className={`text-sm ${isTodayDate ? 'text-primary' : 'text-base-content/60'}`}>
                          {dayOfWeek}
                        </div>
                      </div>

                      {/* 할일 목록 (오른쪽) */}
                      <div className="flex-1 space-y-2">
                        {renderItems.map((renderItem) => {
                          // 빈 시간 렌더링
                          if (renderItem.type === 'gap') {
                            const gap = renderItem.data;
                            return (
                              <button
                                key={`gap-${renderItem.index}`}
                                onClick={() => handleTimeGapClick(gap)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg border-2 border-dashed border-base-300 hover:border-primary hover:bg-primary/5 transition-colors text-base-content/50 hover:text-primary"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs">
                                  {gap.startTime <= currentTime && currentTime <= gap.endTime
                                    ? (() => {
                                        const diffMs = gap.endTime.getTime() - currentTime.getTime();
                                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        const remaining = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
                                        return `${format(gap.startTime, 'HH:mm')} ~ ${format(gap.endTime, 'HH:mm')} 현재 ${format(currentTime, 'HH:mm')} 뭐하는 중이세요? (다음 일정까지 ${remaining})`;
                                      })()
                                    : (() => {
                                        const diffMs = gap.endTime.getTime() - gap.startTime.getTime();
                                        const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        const duration = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
                                        return `${format(gap.startTime, 'HH:mm')} ~ ${format(gap.endTime, 'HH:mm')} 이 시간에 뭐 했어요? (${duration})`;
                                      })()}
                                </span>
                              </button>
                            );
                          }

                          // 할일 렌더링
                          const item = renderItem.data;
                          const projectName = item.projectId ? projectMap.get(item.projectId) : undefined;
                          const goalName = item.goalId ? goalMap.get(item.goalId) : undefined;

                          // 시간 상태 계산 (timed && startTime이 있는 경우)
                          // endTime이 없어도 시작 후 10분 지나면 놓침으로 표시
                          const timeStatus: TimeStatusResult | null =
                            item.scheduleType === 'timed' && item.startTime
                              ? getTimeStatus(item.startTime, item.endTime ?? null, item.completed)
                              : null;
                          const timeStatusText = timeStatus ? getTimeStatusText(timeStatus) : null;

                          // 놓침 상태 확인 (시간 지났고 미완료 && 건너뛰지 않음)
                          const isMissedNotSkipped = timeStatus?.status === 'missed' && !item.completed && !item.isSkipped;

                          // 배경색: 시간 상태에 따라 다르게
                          const bgColor =
                            item.isSkipped
                              ? 'bg-base-200' // 제외된 아이템
                              : item.completed
                                ? 'bg-base-200' // 완료된 아이템
                                : timeStatus?.status === 'in_progress'
                                  ? 'bg-amber-50' // 진행중
                                  : 'bg-transparent'; // 일반: 투명 (배경 div로 처리)

                          // 왼쪽 보더 색상: 시간 상태에 따라 다르게
                          const borderColor =
                            item.isSkipped
                              ? item.exclusionReason === 'postponed'
                                ? 'border-l-warning' // 미뤘음: 연노랑
                                : item.exclusionReason === 'missed'
                                  ? 'border-l-error' // 놓침: 빨간색
                                  : 'border-l-base-300' // 필요없었음/건너뜀: 회색
                              : item.completed
                                ? 'border-l-success'
                                : timeStatus?.status === 'in_progress'
                                  ? 'border-l-warning'
                                  : timeStatus?.status === 'missed'
                                    ? 'border-l-error'
                                    : item.color
                                      ? `border-l-[${item.color}]`
                                      : 'border-l-primary';

                          // 펄스 애니메이션 (진행 중일 때만)
                          const pulseAnimation =
                            timeStatus?.status === 'in_progress' && !item.isSkipped ? 'animate-pulse' : '';

                          // 완료/제외 상태 및 호버 효과
                          const itemHoverEffect = (item.completed || item.isSkipped)
                            ? 'opacity-50 hover:opacity-70 hover:shadow-md hover:-translate-y-0.5'  // 완료/제외: 흐릿 + 떠오르는 느낌
                            : 'hover:shadow-md hover:-translate-y-0.5';  // 일반: 떠오르는 느낌

                          return (
                            <div
                              key={item.id}
                              className={`group relative flex items-start gap-3 p-3 rounded-lg border-l-4 ${bgColor} ${borderColor} ${pulseAnimation} ${itemHoverEffect} transition-all`}
                            >
                              {/* 일반 카드 차단 레이어 - bg-base-100 차단용 */}
                              {!item.completed && !item.isSkipped && (
                                <div className="absolute inset-0 z-0 bg-base-200 pointer-events-none rounded-r-lg" />
                              )}

                              {/* 시간/날짜 표시 */}
                              <div className="relative w-14 flex-shrink-0 text-xs text-base-content/50 pt-0.5">
                                {item.scheduleType === 'timed' && item.startTime ? (
                                  <span>{format(item.startTime, 'HH:mm')}</span>
                                ) : item.scheduleType === 'anytime' ? (
                                  <span>{format(date, 'MM-dd')}</span>
                                ) : (
                                  <span>{format(date, 'MM-dd')}</span>
                                )}
                              </div>

                              {/* 완료 토글 / 제외 취소 아이콘 */}
                              <button
                                onClick={() => item.isSkipped ? handleCancelExclusion(item) : handleToggleComplete(item)}
                                className={`relative flex-shrink-0 ${
                                  item.isSkipped
                                    ? item.exclusionReason === 'postponed'
                                      ? 'text-warning hover:text-warning/80' // 미뤘음: 연노랑
                                      : item.exclusionReason === 'missed'
                                        ? 'text-error hover:text-error/80' // 놓침: 빨간색
                                        : 'text-base-content/50 hover:text-base-content/70' // 필요없었음/건너뜀: 회색
                                    : item.completed
                                      ? 'text-success'
                                      : timeStatus?.status === 'missed'
                                        ? 'text-error'
                                        : 'text-base-content/40'
                                }`}
                                title={item.isSkipped ? '클릭하여 제외 취소' : item.completed ? '미완료로 변경' : '완료로 변경'}
                              >
                                {item.isSkipped ? (
                                  item.exclusionReason === 'postponed' ? <Pause className="w-5 h-5" /> :
                                  item.exclusionReason === 'missed' ? <XCircle className="w-5 h-5" /> :
                                  item.exclusionReason === 'not_needed' ? <MinusCircle className="w-5 h-5" /> :
                                  <SkipForward className="w-5 h-5" />
                                ) : item.completed ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : timeStatus?.status === 'missed' ? (
                                  <AlertTriangle className="w-5 h-5" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              {/* 내용 (클릭 시 편집 모달) */}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => handleEditClick(item)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleEditClick(item);
                                  }
                                }}
                                className="relative flex-1 min-w-0 text-left cursor-pointer"
                              >
                                {/* 시간 범위 표시 (시작+종료 시간 있는 경우만) */}
                                {item.scheduleType === 'timed' && item.startTime && item.endTime && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-base-content/50">
                                      {format(item.startTime, 'HH:mm')} - {format(item.endTime, 'HH:mm')}
                                    </span>
                                        {/* 상태 배지 (완료/제외) */}
                                    {(item.isSkipped || item.completed) && (
                                      <span className={`badge badge-xs ${
                                        item.completed ? 'bg-success/20 text-success' :
                                        item.exclusionReason === 'postponed' ? 'bg-warning/20 text-warning' :
                                        item.exclusionReason === 'missed' ? 'bg-error/20 text-error' :
                                        'bg-base-300 text-base-content/50'
                                      }`}>
                                        {item.completed
                                          ? (item.isActualExecution && item.originalStartTime && item.originalEndTime
                                              ? `미룸 완료 (원래 ${format(new Date(item.originalStartTime), 'HH:mm')} ~ ${format(new Date(item.originalEndTime), 'HH:mm')})`
                                              : '완료')
                                          : item.exclusionReason === 'postponed'
                                            ? (item.postponedToTime && item.postponedToStartTime
                                                ? `미룸 (→ ${format(new Date(item.postponedToStartTime), 'HH:mm')} ~ ${format(new Date(item.postponedToTime), 'HH:mm')})`
                                                : item.postponedToTime
                                                  ? `미룸 (→ ${format(new Date(item.postponedToTime), 'HH:mm')})`
                                                  : '미뤘음')
                                            : item.exclusionReason === 'missed' ? '놓침' :
                                              item.exclusionReason === 'not_needed' ? '필요없었음' :
                                              '건너뜀'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* 상태 배지 (endTime 없는 경우, 완료/제외) */}
                                {item.scheduleType === 'timed' && item.startTime && !item.endTime && (item.isSkipped || item.completed) && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`badge badge-xs ${
                                      item.completed ? 'bg-success/20 text-success' :
                                      item.exclusionReason === 'postponed' ? 'bg-warning/20 text-warning' :
                                      item.exclusionReason === 'missed' ? 'bg-error/20 text-error' :
                                      'bg-base-300 text-base-content/50'
                                    }`}>
                                      {item.completed
                                        ? (item.isActualExecution && item.originalStartTime && item.originalEndTime
                                            ? `미룸 완료 (원래 ${format(new Date(item.originalStartTime), 'HH:mm')} ~ ${format(new Date(item.originalEndTime), 'HH:mm')})`
                                            : '완료')
                                        : item.exclusionReason === 'postponed'
                                          ? (item.postponedToTime && item.postponedToStartTime
                                              ? `미룸 (→ ${format(new Date(item.postponedToStartTime), 'HH:mm')} ~ ${format(new Date(item.postponedToTime), 'HH:mm')})`
                                              : item.postponedToTime
                                                ? `미룸 (→ ${format(new Date(item.postponedToTime), 'HH:mm')})`
                                                : '미뤘음')
                                          : item.exclusionReason === 'missed' ? '놓침' :
                                            item.exclusionReason === 'not_needed' ? '필요없었음' :
                                            '건너뜀'}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                  {/* 반복 아이콘 */}
                                  {item.isRecurrenceInstance && (
                                    <Repeat className="w-3 h-3 text-base-content/40 flex-shrink-0" />
                                  )}
                                  <span className={`text-sm ${
                                    item.isSkipped
                                      ? 'line-through text-base-content/40' // 건너뛴 아이템: 취소선 + 흐림
                                      : item.completed
                                        ? 'line-through text-base-content/50'
                                        : 'text-base-content'
                                  }`}>
                                    {item.title}
                                  </span>
                                </div>

                                {/* 시간 상태 UI (진행 중/놓침) - 제외 상태도 표시 */}
                                {timeStatus && (timeStatus.status === 'in_progress' || timeStatus.status === 'missed') && (
                                  <div className="mt-2 space-y-1">
                                    {/* 진행 중: 진행률 바 + 시간 텍스트 */}
                                    {timeStatus.status === 'in_progress' && (
                                      <>
                                        <div className="flex items-center gap-2 text-xs text-warning">
                                          <Clock className="w-3 h-3" />
                                          <span>{timeStatusText?.primary}</span>
                                        </div>
                                        <TimeProgressBar
                                          percent={timeStatus.progressPercent ?? 0}
                                          variant="warning"
                                          height="sm"
                                          animated={true}
                                        />
                                        <div className="flex items-center gap-2 text-xs text-warning">
                                          <Clock className="w-3 h-3" />
                                          <span>{timeStatusText?.secondary}</span>
                                        </div>
                                      </>
                                    )}
                                    {/* 놓침: 경과 시간만 표시 (제외 상태가 아닐 때만) */}
                                    {timeStatus.status === 'missed' && !item.isSkipped && (
                                      <div className="text-xs text-error">
                                        <span>{timeStatusText?.primary}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* 맥락 배지 */}
                                {(goalName || projectName) && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {goalName && (
                                      <span className="badge badge-xs badge-ghost">
                                        {goalName}
                                      </span>
                                    )}
                                    {projectName && (
                                      <span className="badge badge-xs badge-ghost">
                                        {projectName}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* 소중한 사람 표시 */}
                                {(() => {
                                  const joyfulPeople = people.filter(p => item.joyfulPeopleIds.includes(p.id));
                                  const shamefulPeople = people.filter(p => item.shamefulPeopleIds.includes(p.id));
                                  if (joyfulPeople.length === 0 && shamefulPeople.length === 0) return null;
                                  return (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {joyfulPeople.map(p => (
                                        <span key={p.id} className="badge badge-xs bg-pink-500/20 text-pink-600 dark:text-pink-400 gap-0.5">
                                          <Heart className="w-2.5 h-2.5" />{p.name}
                                        </span>
                                      ))}
                                      {shamefulPeople.map(p => (
                                        <span key={p.id} className="badge badge-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 gap-0.5">
                                          <AlertCircle className="w-2.5 h-2.5" />{p.name}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* 연결된 실행 원동력 표시 */}
                                {showFuelBadges && (() => {
                                  const linkedFuels = getLinkedFuels(item);
                                  if (linkedFuels.length === 0) return null;

                                  return (
                                    <div className="flex flex-col gap-1 mt-1.5 overflow-hidden">
                                      {linkedFuels.map(fuel => {
                                        // 제목 + 내용 함께 표시
                                        const text = fuel.title && fuel.content
                                          ? `${fuel.title} - ${fuel.content}`
                                          : fuel.title || fuel.content;
                                        const isExpanded = expandedFuelId === fuel.id;

                                        return (
                                          <div
                                            key={fuel.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedFuelId(isExpanded ? null : fuel.id);
                                            }}
                                            className="inline-flex items-start gap-0.5 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-500/30 transition-all"
                                          >
                                            <Zap className={`w-3 h-3 flex-shrink-0 ${isExpanded ? 'mt-0.5' : ''}`} />
                                            <span className={isExpanded ? '' : 'line-clamp-1'}>{text}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* 놓친 할일 안내 + 처리 버튼 */}
                                {isMissedNotSkipped && (
                                  <div
                                    className="mt-2 p-2 bg-warning/10 rounded-lg border border-warning/20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="text-xs text-base-content/60 mb-2">
                                      어떻게 기록할까요?
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleComplete(item);
                                        }}
                                        className="btn btn-xs btn-ghost text-success gap-1"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        완료했음
                                      </button>
                                      {/* 반복 할일만 미뤘음/필요없었음/놓침 버튼 표시 */}
                                      {item.isRecurrenceInstance && (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenPostponeSheet(item);
                                            }}
                                            className="btn btn-xs btn-ghost text-warning gap-1"
                                          >
                                            <Pause className="w-3 h-3" />
                                            미뤘음
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSkipInstance(item, 'not_needed');
                                            }}
                                            className="btn btn-xs btn-ghost text-base-content/60 gap-1"
                                          >
                                            <MinusCircle className="w-3 h-3" />
                                            필요없었음
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSkipInstance(item, 'missed');
                                            }}
                                            className="btn btn-xs btn-ghost text-error gap-1"
                                          >
                                            <XCircle className="w-3 h-3" />
                                            놓침
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 삭제 버튼 (반복 인스턴스는 삭제 불가) */}
                              {!item.isRecurrenceInstance && (
                                <button
                                  onClick={() => setDeletingTodoId(item.id)}
                                  className="btn btn-ghost btn-xs rounded-full text-error opacity-0 group-hover:opacity-100"
                                  title="삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 미래 더 보기 버튼 (하단) */}
        <button
          onClick={handleLoadMoreFuture}
          disabled={isLoadingMore}
          className="w-full py-3 text-sm text-base-content/60 bg-base-200 rounded-lg hover:bg-base-300 transition-colors flex items-center justify-center gap-2"
        >
          {isLoadingMore ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              미래 6개월 더 보기
            </>
          )}
        </button>
      </div>

      {/* 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && editFormData !== null}
        todo={editFormData}
        onClose={() => {
          setEditingTodo(null);
          setEditingItem(null);
          setEditFormData(null);
        }}
        onSave={handleEditSave}
        onChange={setEditFormData}
        onDelete={handleEditDelete}
        onRecurringSave={handleRecurringSave}
        originalTitle={editingItem?.title}
        originalStartTime={editingItem?.startTime?.toISOString()}
        originalEndTime={editingItem?.endTime?.toISOString()}
        occurrenceDate={editingItem?.recurrenceOccurrenceDate}
        headerTitle="할일 편집"
        todoId={editingTodo?.id}
        userId={userId}
        showLinkedFuels={true}
        fuelNotes={fuelNotes}
      />

      {/* 삭제 확인 다이얼로그 */}
      {deletingTodoId && (
        <dialog open className="modal modal-open z-[110]">
          <div className="modal-box bg-base-100 max-w-sm">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="text-base-content/70 mb-2">정말로 이 할일을 삭제하시겠습니까?</p>
            <p className="text-sm font-medium mb-6 break-words">
              &ldquo;{todos.find(t => t.id === deletingTodoId)?.title}&rdquo;
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingTodoId(null)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deletingTodoId)}
                className="btn btn-error btn-sm rounded-full"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setDeletingTodoId(null)} />
        </dialog>
      )}

      {/* 빈 시간 사후 기록 모달 */}
      <QuickLogModal
        isOpen={isQuickLogModalOpen}
        onClose={() => {
          setIsQuickLogModalOpen(false);
          setQuickLogPrefillTime(null);
        }}
        prefillStartTime={quickLogPrefillTime?.start}
        prefillEndTime={quickLogPrefillTime?.end}
      />

      {/* 미루기 옵션 시트 */}
      {postponingItem?.originalTodo && (
        <PostponeOptionsSheet
          isOpen={postponeSheetOpen}
          onClose={() => {
            setPostponeSheetOpen(false);
            setPostponingItem(null);
          }}
          todo={postponingItem.originalTodo}
          occurrenceDate={postponingItem.recurrenceOccurrenceDate || ''}
          onPostpone={handlePostpone}
          isProcessing={isPostponeProcessing}
        />
      )}

      {/* 시간 미정 인박스 시트 */}
      <AnytimeInboxSheet
        isOpen={anytimeInboxOpen}
        onClose={() => setAnytimeInboxOpen(false)}
        selectedDate={format(navigatedMonth, 'yyyy-MM-dd')}
        onRefresh={loadAnytimeCount}
      />
    </div>
  );
}
