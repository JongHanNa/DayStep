'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, Star } from 'lucide-react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import WeeklyCalendar from '@/components/shared/WeeklyCalendar';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuth } from '@/app/context/AuthContext';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import TodoDragPreview from '@/components/shared/TodoDragPreview';
import { updateInboxTodo } from '@/lib/supabase/inbox';
import { fetchScheduledTodos } from '@/lib/supabase/calendar';
import type { InboxItem, GTDStatus } from '@/types/second-brain';
import type { TodoWithRecurrenceInstance } from '@/types';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useDndKit } from '@/hooks/useDndKit';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  generateAllRecurrenceInstances,
  isRecurringTodo,
  applyCompletionStatusToInstances
} from '@/lib/recurrence-utils';
import { loadCompletionsForDateRange } from '@/lib/supabase/completions';

type CalendarTab = 'week-schedule' | 'week-plan' | 'week-routine' | 'month-schedule' | 'month-plan' | 'month-routine';

// todos 테이블 데이터를 InboxItem으로 변환
function todoToInboxItem(todo: TodoWithRecurrenceInstance): InboxItem {
  return {
    id: todo.id,
    user_id: todo.user_id,
    content: todo.title,
    item_type: 'todo',
    status: (todo.clarification || 'inbox') as GTDStatus, // clarification을 GTDStatus로 매핑
    created_at: todo.created_at,
    updated_at: todo.updated_at,
    scheduled_date: todo.start_time ?? undefined,
    schedule_type: todo.schedule_type || 'none',
    clarification: todo.clarification || 'none',
    is_completed: todo.completed || false,
    is_highlight: todo.is_today_highlight || false,
    next_action_status: '', // 레거시 필드, next_action_context_ids 사용
    next_action_context_ids: todo.next_action_context_ids || [],
    project_id: todo.project_id,
    icon: todo.icon ?? undefined,
    color: todo.color ?? '',
    // 반복 인스턴스 관련 필드
    is_recurrence_instance: todo.is_recurrence_instance || false,
    recurrence_source_id: todo.recurrence_source_id,
    recurrence_occurrence_date: todo.recurrence_occurrence_date,
    // spanning card 지원을 위한 end_date 필드
    end_date: todo.end_time || null,
  };
}

// 날짜 범위 계산 헬퍼 함수
function getDateRangeForTab(tab: CalendarTab, selectedDate: Date): { start: Date; end: Date } {
  const isWeekly = tab.startsWith('week-');

  if (isWeekly) {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 일요일 시작
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return { start, end };
  } else {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return { start, end };
  }
}

export default function CalendarPage() {
  const { appUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState<CalendarTab>('week-schedule');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);
  const [scheduledTodos, setScheduledTodos] = useState<InboxItem[]>([]);

  const { updateInboxItem } = useInboxStore();
  const { projects, fetchProjects, createProject } = useProjectStore();
  const { notes, fetchNotes, createNote } = useNoteStore();
  const { openModal, closeModal } = useModalStore();

  // 할일 폼 데이터
  const [todoForm, setTodoForm] = useState<TodoFormData>({
    title: '',
    clarification: '',
    nextActionStatuses: [],
    scheduledDate: undefined,
    isHighlight: false,
    completed: false,
    projectIds: [],
    noteIds: [],
  });

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/calendar');
  }, []);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!appUser?.id) return;

      try {
        // 1. 날짜가 설정된 모든 할일 조회
        const todos = await fetchScheduledTodos(appUser.id);

        // 2. 일반 할일과 반복 할일 분리
        const regularTodos = todos.filter(t => !isRecurringTodo(t));
        const recurringTodos = todos.filter(t => isRecurringTodo(t));

        // 3. 현재 보는 달/주의 날짜 범위 계산
        const { start, end } = getDateRangeForTab(selectedTab, selectedDate);

        // 4. 반복 할일 인스턴스 생성
        const recurrenceInstances = await generateAllRecurrenceInstances(
          recurringTodos,
          start,
          end,
          appUser.id
        );

        // 5. 완료 상태 로드 (todo_completions 테이블)
        const completions = await loadCompletionsForDateRange(start, end, appUser.id);

        // 6. 인스턴스에 완료 상태 적용
        const instancesWithCompletion = applyCompletionStatusToInstances(
          recurrenceInstances,
          completions
        );

        // 7. 일반 할일 + 반복 인스턴스 합치기
        const allTodos = [
          ...regularTodos.map(todoToInboxItem),
          ...instancesWithCompletion.map(inst => todoToInboxItem(inst.data))
        ];

        setScheduledTodos(allTodos);

        // 프로젝트, 노트 정보는 기존 store 사용
        await fetchProjects(appUser.id);
        await fetchNotes(appUser.id);
      } catch (error) {
        console.error('❌ 달력 데이터 로드 실패:', error);
      }
    };

    loadData();
  }, [appUser?.id, selectedTab, selectedDate, fetchProjects, fetchNotes]);

  // 탭별 필터링된 할일 목록
  const filteredTodos = useMemo(() => {
    // scheduledTodos는 이미 날짜가 있는 할일만 포함
    const scheduledItems = scheduledTodos;

    switch (selectedTab) {
      case 'week-schedule':
        // 주간 일정: 명료화 = "일정"만 (반복 인스턴스 제외)
        return scheduledItems.filter((item: InboxItem) =>
          item.clarification === 'schedule_clear' && !item.is_recurrence_instance
        );

      case 'week-plan':
        // 주간 계획: "일정" + 기타 (언젠가만 제외, 반복 인스턴스 제외)
        return scheduledItems.filter((item: InboxItem) =>
          item.clarification !== 'someday' && !item.is_recurrence_instance
        );

      case 'week-routine':
        // 주간 루틴: 반복 할일 인스턴스만
        return scheduledItems.filter((item: InboxItem) =>
          item.is_recurrence_instance === true
        );

      case 'month-schedule':
        // 월간 일정: 명료화 = "일정"만 (반복 인스턴스 제외)
        return scheduledItems.filter((item: InboxItem) =>
          item.clarification === 'schedule_clear' && !item.is_recurrence_instance
        );

      case 'month-plan':
        // 월간 계획: "일정" + 기타 (언젠가만 제외, 반복 인스턴스 제외)
        return scheduledItems.filter((item: InboxItem) =>
          item.clarification !== 'someday' && !item.is_recurrence_instance
        );

      case 'month-routine':
        // 월간 루틴: 반복 할일 인스턴스만
        return scheduledItems.filter((item: InboxItem) =>
          item.is_recurrence_instance === true
        );

      default:
        return scheduledItems;
    }
  }, [scheduledTodos, selectedTab]);

  // 할일 클릭 핸들러
  const handleTodoClick = (item: InboxItem) => {
    setEditingItem(item);

    // next_action_status가 JSON 배열 문자열이면 파싱, 아니면 빈 배열
    let nextActionStatuses: string[] = [];
    if (item.next_action_status) {
      try {
        nextActionStatuses = JSON.parse(item.next_action_status);
      } catch {
        nextActionStatuses = [];
      }
    }

    // start_time에서 HH:mm 포맷 추출 (시간지정일 때만)
    let startTime: string | undefined;
    if (item.schedule_type === 'timed' && item.scheduled_date) {
      const date = new Date(item.scheduled_date);
      startTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    setTodoForm({
      title: item.content,
      clarification: item.clarification || '',
      nextActionStatuses,
      nextActionContextIds: item.next_action_context_ids || [],
      scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : undefined,
      scheduleType: item.schedule_type || 'none',
      startTime,
      includeTime: item.schedule_type === 'timed',
      isHighlight: item.is_highlight || false,
      completed: item.is_completed || false,
      projectIds: item.project_id ? [item.project_id] : [],
      noteIds: [],
    });

    openModal();
  };

  // 할일 완료 토글
  const handleToggleTodo = async (todoId: string) => {
    const todo = scheduledTodos.find((item: InboxItem) => item.id === todoId);
    if (!todo || !appUser?.id) return;

    try {
      // 반복 인스턴스인 경우
      if (todo.is_recurrence_instance && todo.recurrence_source_id && todo.recurrence_occurrence_date) {
        const { useTodoStore } = await import('@/state/stores/todoStore');
        const { toggleRecurrenceCompletion } = useTodoStore.getState();
        const targetDate = new Date(todo.recurrence_occurrence_date);
        await toggleRecurrenceCompletion(todo.recurrence_source_id, targetDate);
      } else {
        // 일반 할일
        await updateInboxItem(appUser.id, todoId, {
          is_completed: !todo.is_completed,
        });
      }

      // 달력 목록 새로고침
      const todos = await fetchScheduledTodos(appUser.id);
      const regularTodos = todos.filter(t => !isRecurringTodo(t));
      const recurringTodos = todos.filter(t => isRecurringTodo(t));
      const { start, end } = getDateRangeForTab(selectedTab, selectedDate);
      const recurrenceInstances = await generateAllRecurrenceInstances(
        recurringTodos,
        start,
        end,
        appUser.id
      );
      const completions = await loadCompletionsForDateRange(start, end, appUser.id);
      const instancesWithCompletion = applyCompletionStatusToInstances(
        recurrenceInstances,
        completions
      );
      const allTodos = [
        ...regularTodos.map(todoToInboxItem),
        ...instancesWithCompletion.map(inst => todoToInboxItem(inst.data))
      ];
      setScheduledTodos(allTodos);
    } catch (error) {
      console.error('할일 완료 토글 실패:', error);
    }
  };

  // 할일 저장
  const handleSaveTodo = async () => {
    if (!editingItem || !appUser?.id) return;

    try {
      // 시간지정일 때 날짜와 시간 결합
      let finalDateTime: Date | undefined = todoForm.scheduledDate;

      if (todoForm.scheduleType === 'timed' && todoForm.startTime && finalDateTime) {
        const [hours, minutes] = todoForm.startTime.split(':');
        finalDateTime = new Date(finalDateTime);
        finalDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // DB 직접 업데이트
      await updateInboxTodo(appUser.id, editingItem.id, {
        title: todoForm.title,
        clarification: todoForm.clarification,
        next_action_context_ids: todoForm.nextActionContextIds,
        scheduled_date: finalDateTime?.toISOString(),
        schedule_type: todoForm.scheduleType,
        is_today_highlight: todoForm.isHighlight,
        completed: todoForm.completed,
        project_id: todoForm.projectIds?.[0] || undefined,
      });

      // 달력 목록 새로고침
      const todos = await fetchScheduledTodos(appUser.id);
      const todoItems = todos.map(todoToInboxItem);
      setScheduledTodos(todoItems);

      // 모달 닫기
      closeModal();
      setEditingItem(null);
    } catch (error) {
      console.error('할일 저장 실패:', error);
    }
  };

  // 할일 삭제
  const handleDeleteTodo = async () => {
    if (!editingItem || !appUser?.id) return;

    try {
      const { deleteInboxItem } = useInboxStore.getState();
      await deleteInboxItem(appUser.id, editingItem.id);

      closeModal();
      setEditingItem(null);
    } catch (error) {
      console.error('할일 삭제 실패:', error);
    }
  };

  // 할일 날짜 변경 (드래그앤드롭)
  const handleTodoDateChange = async (todoId: string, newDate: Date) => {
    if (!appUser?.id) return;

    const todo = scheduledTodos.find(item => item.id === todoId);
    if (!todo) return;

    // 반복 인스턴스는 드래그앤드롭으로 날짜 변경 불가
    if (todo.is_recurrence_instance) {
      console.warn('⚠️ 반복 할일 인스턴스는 드래그앤드롭으로 날짜를 변경할 수 없습니다.');
      return;
    }

    try {
      // 한국시간 자정으로 설정
      const koreaDate = new Date(newDate);
      koreaDate.setHours(0, 0, 0, 0);

      // 1단계: 로컬 상태를 즉시 업데이트 (Optimistic Update)
      setScheduledTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.id === todoId
            ? { ...todo, scheduled_date: koreaDate.toISOString() }
            : todo
        )
      );

      // 2단계: DB 업데이트 (백그라운드)
      await updateInboxTodo(appUser.id, todoId, {
        scheduled_date: koreaDate.toISOString(),
      });

      // 3단계: DB와 동기화 (최종 상태 보장)
      const todos = await fetchScheduledTodos(appUser.id);
      const regularTodos = todos.filter(t => !isRecurringTodo(t));
      const recurringTodos = todos.filter(t => isRecurringTodo(t));
      const { start, end } = getDateRangeForTab(selectedTab, selectedDate);
      const recurrenceInstances = await generateAllRecurrenceInstances(
        recurringTodos,
        start,
        end,
        appUser.id
      );
      const completions = await loadCompletionsForDateRange(start, end, appUser.id);
      const instancesWithCompletion = applyCompletionStatusToInstances(
        recurrenceInstances,
        completions
      );
      const allTodos = [
        ...regularTodos.map(todoToInboxItem),
        ...instancesWithCompletion.map(inst => todoToInboxItem(inst.data))
      ];
      setScheduledTodos(allTodos);
    } catch (error) {
      console.error('할일 날짜 변경 실패:', error);

      // 에러 발생 시 DB에서 다시 가져와 롤백
      try {
        const todos = await fetchScheduledTodos(appUser.id);
        const regularTodos = todos.filter(t => !isRecurringTodo(t));
        const recurringTodos = todos.filter(t => isRecurringTodo(t));
        const { start, end } = getDateRangeForTab(selectedTab, selectedDate);
        const recurrenceInstances = await generateAllRecurrenceInstances(
          recurringTodos,
          start,
          end,
          appUser.id
        );
        const completions = await loadCompletionsForDateRange(start, end, appUser.id);
        const instancesWithCompletion = applyCompletionStatusToInstances(
          recurrenceInstances,
          completions
        );
        const allTodos = [
          ...regularTodos.map(todoToInboxItem),
          ...instancesWithCompletion.map(inst => todoToInboxItem(inst.data))
        ];
        setScheduledTodos(allTodos);
      } catch (rollbackError) {
        console.error('롤백 실패:', rollbackError);
      }
    }
  };

  // 즉시 할일 생성 (달력 날짜 칸에서 + 버튼 클릭)
  const handleQuickCreateTodo = async (date: Date) => {
    if (!appUser?.id) return;

    try {
      const { createInboxItem } = useInboxStore.getState();

      // 한국시간 자정으로 설정
      const koreaDate = new Date(date);
      koreaDate.setHours(0, 0, 0, 0);

      await createInboxItem(appUser.id, {
        content: '새 할일',
        clarification: 'schedule_clear',
        schedule_type: 'anytime',
        scheduled_date: koreaDate.toISOString(),
        status: 'schedule_clear',
      });

      // 달력 목록 새로고침
      const todos = await fetchScheduledTodos(appUser.id);
      const todoItems = todos.map(todoToInboxItem);
      setScheduledTodos(todoItems);
    } catch (error) {
      console.error('할일 생성 실패:', error);
    }
  };

  // DnD Kit 설정
  const {
    sensors,
    activeItem,
    handleDragStart,
    handleDragEnd,
    dndContextProps,
    dragOverlayProps
  } = useDndKit<InboxItem>({
    onDragEnd: async (active, over) => {
      if (!over || !appUser?.id) return;

      // ID에서 todo ID 추출
      const activeIdString = active.id as string;
      let todoId = activeIdString;
      if (activeIdString.startsWith('week-todo-')) {
        todoId = activeIdString.replace('week-todo-', '');
      } else if (activeIdString.startsWith('month-todo-')) {
        todoId = activeIdString.replace('month-todo-', '');
      }

      const overIdString = over.id as string;

      // 주간 달력 drop 처리: week-yyyy-MM-dd 형식
      if (overIdString.startsWith('week-')) {
        const dateString = overIdString.replace('week-', '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;
        const newDate = new Date(dateString);
        await handleTodoDateChange(todoId, newDate);
      }

      // 월간 달력 drop 처리: yyyy-MM-dd 형식
      if (/^\d{4}-\d{2}-\d{2}$/.test(overIdString)) {
        const newDate = new Date(overIdString);
        await handleTodoDateChange(todoId, newDate);
      }
    },
    getActiveItem: (id) => {
      const idString = id as string;
      let todoId = idString;
      if (idString.startsWith('week-todo-')) {
        todoId = idString.replace('week-todo-', '');
      } else if (idString.startsWith('month-todo-')) {
        todoId = idString.replace('month-todo-', '');
      }
      return scheduledTodos.find(todo => todo.id === todoId);
    },
  });

  // 모달 닫기
  const handleCloseModal = () => {
    closeModal();
    setEditingItem(null);
  };

  // 프로젝트 생성
  const handleCreateProject = async (title: string) => {
    if (!appUser?.id) throw new Error('User not found');
    return await createProject(appUser.id, {
      title,
      description: '',
      status: 'not_started' as const,
      color: '#3B82F6',
      icon: '📋',
      order_index: 0,
    });
  };

  // 노트 생성
  const handleCreateNote = async (title: string) => {
    if (!appUser?.id) throw new Error('User not found');
    return await createNote(appUser.id, {
      title,
      content: '',
      note_category: 'work_in_progress' as const,
      is_pinned: false,
    });
  };

  // 달력 컴포넌트 렌더링
  const renderCalendar = () => {
    const isWeekly = selectedTab === 'week-schedule' || selectedTab === 'week-plan' || selectedTab === 'week-routine';
    const showClarification = selectedTab === 'week-plan' || selectedTab === 'month-plan';
    const isRoutineTab = selectedTab === 'week-routine' || selectedTab === 'month-routine';

    if (isWeekly) {
      return (
        <WeeklyCalendar
          todos={filteredTodos}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onTodoClick={handleTodoClick}
          onToggleTodo={handleToggleTodo}
          onTodoDateChange={handleTodoDateChange}
          showClarification={showClarification}
          enableSpanning={!isRoutineTab}
          enableDragDrop={true}
          onCreateTodo={handleQuickCreateTodo}
        />
      );
    } else {
      return (
        <MonthlyCalendar
          todos={filteredTodos}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onTodoClick={handleTodoClick}
          onToggleTodo={handleToggleTodo}
          onTodoDateChange={handleTodoDateChange}
          showClarification={showClarification}
          enableSpanning={!isRoutineTab}
          onCreateTodo={handleQuickCreateTodo}
        />
      );
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        {...dndContextProps}
      >
        <div className="min-h-screen bg-base-100 pb-20">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
            <div className={`max-w-7xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>

              {/* 탭 네비게이션 */}
              <div className="tabs tabs-boxed bg-base-200 p-1">
                <button
                  className={`tab ${selectedTab === 'week-schedule' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('week-schedule')}
                >
                  주간 일정
                </button>
                <button
                  className={`tab ${selectedTab === 'week-plan' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('week-plan')}
                >
                  주간 계획
                </button>
                <button
                  className={`tab ${selectedTab === 'week-routine' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('week-routine')}
                >
                  주간 루틴
                </button>
                <button
                  className={`tab ${selectedTab === 'month-schedule' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('month-schedule')}
                >
                  월간 일정
                </button>
                <button
                  className={`tab ${selectedTab === 'month-plan' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('month-plan')}
                >
                  월간 계획
                </button>
                <button
                  className={`tab ${selectedTab === 'month-routine' ? 'tab-active' : ''}`}
                  onClick={() => setSelectedTab('month-routine')}
                >
                  월간 루틴
                </button>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            {renderCalendar()}
          </div>

          {/* 하단 네비게이션 */}
          <SecondBrainBottomNav />

          {/* 할일 편집 모달 */}
          <TodoEditModal
            open={editingItem !== null}
            todo={todoForm}
            onClose={handleCloseModal}
            onSave={handleSaveTodo}
            onChange={setTodoForm}
            onDelete={handleDeleteTodo}
            projects={projects}
            notes={notes}
            onCreateProject={handleCreateProject}
            onCreateNote={handleCreateNote}
            showClarification={true}
            showNextActionStatus={true}
            showScheduledDate={true}
            showHighlight={true}
            showCompleted={true}
            showProjects={true}
            todoId={editingItem?.id}
            userId={appUser?.id}
          />
        </div>

        {/* 드래그 미리보기 오버레이 */}
        {typeof window !== 'undefined' && createPortal(
          <DragOverlay {...dragOverlayProps}>
            {activeItem && (
              <TodoDragPreview
                title={activeItem.content}
                isHighlight={activeItem.is_highlight}
                scheduledDate={activeItem.scheduled_date}
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </AuthGuard>
  );
}
