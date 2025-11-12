'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { AuthGuard } from '@/components/auth/AuthGuard';
import WeeklyCalendar from '@/components/shared/WeeklyCalendar';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuth } from '@/app/context/AuthContext';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { updateInboxTodo } from '@/lib/supabase/inbox';
import { fetchScheduledTodos } from '@/lib/supabase/calendar';
import type { InboxItem } from '@/types/second-brain';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';

type CalendarTab = 'week-schedule' | 'week-plan' | 'month-schedule' | 'month-plan';

// todos 테이블 데이터를 InboxItem으로 변환
function todoToInboxItem(todo: any): InboxItem {
  return {
    id: todo.id,
    user_id: todo.user_id,
    content: todo.title,
    item_type: 'todo',
    status: todo.clarification || 'none',
    created_at: todo.created_at,
    updated_at: todo.updated_at,
    scheduled_date: todo.start_time || undefined,
    schedule_type: todo.schedule_type || 'none',
    clarification: todo.clarification || 'none',
    is_completed: todo.completed || false,
    is_highlight: todo.is_today_highlight || false,
    next_action_status: todo.next_action_contexts ? JSON.stringify(todo.next_action_contexts) : undefined,
    project_id: todo.project_id,
    icon: todo.icon,
    color: todo.color,
  };
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

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!appUser?.id) return;

      try {
        // 날짜가 설정된 모든 할일 조회
        const todos = await fetchScheduledTodos(appUser.id);
        const todoItems = todos.map(todoToInboxItem);
        setScheduledTodos(todoItems);

        // 프로젝트, 노트 정보는 기존 store 사용
        await fetchProjects(appUser.id);
        await fetchNotes(appUser.id);
      } catch (error) {
        console.error('❌ 달력 데이터 로드 실패:', error);
      }
    };

    loadData();
  }, [appUser?.id, fetchProjects, fetchNotes]);

  // 탭별 필터링된 할일 목록
  const filteredTodos = useMemo(() => {
    // scheduledTodos는 이미 날짜가 있는 할일만 포함
    const scheduledItems = scheduledTodos;

    switch (selectedTab) {
      case 'week-schedule':
        // 주간 일정: 명료화 = "일정"만
        return scheduledItems.filter((item: InboxItem) => item.clarification === 'schedule_clear');

      case 'week-plan':
        // 주간 계획: "일정" + 기타 (언젠가만 제외)
        return scheduledItems.filter((item: InboxItem) => item.clarification !== 'someday');

      case 'month-schedule':
        // 월간 일정: 명료화 = "일정"만
        return scheduledItems.filter((item: InboxItem) => item.clarification === 'schedule_clear');

      case 'month-plan':
        // 월간 계획: "일정" + 기타 (언젠가만 제외)
        return scheduledItems.filter((item: InboxItem) => item.clarification !== 'someday');

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
    if (todo && appUser?.id) {
      await updateInboxItem(appUser.id, todoId, {
        is_completed: !todo.is_completed,
      });

      // 달력 목록 새로고침
      const todos = await fetchScheduledTodos(appUser.id);
      const todoItems = todos.map(todoToInboxItem);
      setScheduledTodos(todoItems);
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
        next_action_contexts: todoForm.nextActionStatuses,
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

    try {
      // 한국시간 자정으로 설정
      const koreaDate = new Date(newDate);
      koreaDate.setHours(0, 0, 0, 0);

      await updateInboxTodo(appUser.id, todoId, {
        scheduled_date: koreaDate.toISOString(),
      });

      // 달력 목록 새로고침
      const todos = await fetchScheduledTodos(appUser.id);
      const todoItems = todos.map(todoToInboxItem);
      setScheduledTodos(todoItems);
    } catch (error) {
      console.error('할일 날짜 변경 실패:', error);
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
      memo_type: 'note' as const,
      note_category: 'work_in_progress' as const,
      tags: [],
      is_pinned: false,
    });
  };

  // 달력 컴포넌트 렌더링
  const renderCalendar = () => {
    const isWeekly = selectedTab === 'week-schedule' || selectedTab === 'week-plan';
    const showClarification = selectedTab === 'week-plan' || selectedTab === 'month-plan';

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
          enableSpanning={false}
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
          onCreateTodo={handleQuickCreateTodo}
        />
      );
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className={`max-w-7xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6" />
              <h1 className="text-2xl font-bold">달력</h1>
            </div>

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
        />
      </div>
    </AuthGuard>
  );
}
