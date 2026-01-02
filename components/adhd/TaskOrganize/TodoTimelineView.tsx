'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle2, Plus, Clock, Trash2, Circle, Heart, AlertCircle } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { Todo } from '@/entities/todo/Todo';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { fetchNotesWithJWT } from '@/lib/supabase/notes';
import type { Note } from '@/types/second-brain';

interface TodoTimelineViewProps {
  userId: string;
}

/**
 * 타임라인 탭 - 할일 생성 기록 시간순
 *
 * ADHD 관점:
 * - 성취감: 완료한 일들을 시각적으로 확인
 * - 맥락: 프로젝트/목표 배지로 어떤 목표를 위한 건지 표시
 */
export function TodoTimelineView({ userId }: TodoTimelineViewProps) {
  const { todos, fetchAllTodos, updateTodo, deleteTodo } = useTodoStore();
  const { people, loadPeople } = useCherishedPeopleStore();
  const [isLoading, setIsLoading] = useState(true);

  // 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editFormData, setEditFormData] = useState<TodoFormData | null>(null);

  // 삭제 확인 상태
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // 연결된 실행 연료를 위한 inbox 노트 상태
  const [inboxNotes, setInboxNotes] = useState<Note[]>([]);

  // 프로젝트/목표 관련 기능 제거됨 - 빈 배열로 대체
  const projects: { id: string; title: string }[] = [];
  const goals: { id: string; title: string }[] = [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllTodos(),
        loadPeople(userId)  // 소중한 사람 데이터도 함께 로딩
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos, loadPeople]);

  // inbox 노트 로드 (편집 모달에서 연결된 연료 표시용)
  useEffect(() => {
    const loadInboxNotes = async () => {
      if (!userId) return;

      try {
        const allNotes = await fetchNotesWithJWT(userId);
        const inbox = allNotes.filter(n => n.note_category === 'inbox');
        setInboxNotes(inbox);
      } catch (error) {
        console.error('inbox 노트 로드 실패:', error);
      }
    };
    loadInboxNotes();
  }, [userId]);

  // 프로젝트/목표 매핑 생성
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.title]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(g => [g.id, g.title]));
  }, [goals]);

  // 완료 토글
  const handleToggleComplete = useCallback(async (todo: Todo) => {
    await updateTodo(todo.id, { completed: !todo.completed });
  }, [updateTodo]);

  // 삭제 처리
  const handleDelete = useCallback(async (todoId: string) => {
    await deleteTodo(todoId);
    setDeletingTodoId(null);
  }, [deleteTodo]);

  // Todo → TodoFormData 변환
  const todoToFormData = useCallback((todo: Todo): TodoFormData => {
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
      // 소중한 사람 연결 필드
      joyfulPeopleIds: todo.joyfulPeopleIds || [],
      shamefulPeopleIds: todo.shamefulPeopleIds || [],
    };
  }, []);

  // 편집 모달 열기
  const handleEditClick = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setEditFormData(todoToFormData(todo));
  }, [todoToFormData]);

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
      // 소중한 사람 연결 필드
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

  // 할일의 표시 날짜 결정 (startTime 기준)
  const getDisplayDate = (todo: Todo): Date => {
    // 타임라인은 startTime 있는 할일만 표시하므로 항상 startTime 사용
    return todo.startTime || todo.createdAt;
  };

  // 타임라인 아이템 생성 (startTime 있는 할일만, 표시 날짜 기준 정렬)
  const timelineItems = useMemo(() => {
    return todos
      .filter(todo => todo.startTime !== null)  // startTime 있는 것만 표시
      .sort((a, b) => getDisplayDate(b).getTime() - getDisplayDate(a).getTime())
      .slice(0, 50); // 최근 50개만
  }, [todos]);

  // 날짜별 그룹핑 (timed 할일은 startTime 기준)
  const groupedByDate = useMemo(() => {
    return timelineItems.reduce((acc, item) => {
      const date = getDisplayDate(item);
      let dateKey: string;

      if (isToday(date)) {
        dateKey = '오늘';
      } else if (isYesterday(date)) {
        dateKey = '어제';
      } else {
        dateKey = format(date, 'M월 d일 (EEE)', { locale: ko });
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, Todo[]>);
  }, [timelineItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p>아직 기록이 없어요</p>
        <p className="text-sm">할일을 만들면 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, items]) => (
        <div key={dateKey}>
          {/* 날짜 헤더 */}
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">
            {dateKey}
          </h3>

          {/* 타임라인 아이템들 */}
          <div className="space-y-2">
            {items.map((todo) => {
              const projectName = todo.projectId ? projectMap.get(todo.projectId) : undefined;
              const goalName = todo.goalId ? goalMap.get(todo.goalId) : undefined;

              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  {/* 완료 토글 아이콘 */}
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    className={`btn btn-ghost btn-xs btn-circle ${
                      todo.completed ? 'text-success' : 'text-info'
                    }`}
                    title={todo.completed ? '미완료로 변경' : '완료로 변경'}
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* 내용 (클릭 시 편집) */}
                  <button
                    onClick={() => handleEditClick(todo)}
                    className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    <span className={`text-sm ${
                      todo.completed ? 'line-through text-base-content/60' : ''
                    }`}>
                      {todo.title}
                    </span>

                    {/* 맥락 배지 (있을 때만 렌더링) */}
                    {(goalName || projectName) && (
                      <div className="flex flex-wrap gap-1 mt-1">
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
                      const joyfulPeople = people.filter(p => todo.joyfulPeopleIds.includes(p.id));
                      const shamefulPeople = people.filter(p => todo.shamefulPeopleIds.includes(p.id));
                      if (joyfulPeople.length === 0 && shamefulPeople.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
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
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => setDeletingTodoId(todo.id)}
                    className="btn btn-ghost btn-xs rounded-full text-error"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* 일정 유형 배지 (anytime만 표시, timed는 시간으로 충분) */}
                  {todo.scheduleType === 'anytime' && (
                    <span className="badge badge-xs badge-ghost">언제든지</span>
                  )}

                  {/* 시간 (timed: startTime - endTime, anytime: 시간 없음) */}
                  {todo.scheduleType === 'timed' && todo.startTime ? (
                    <span className="text-xs text-base-content/40">
                      {format(todo.startTime, 'HH:mm')}
                      {todo.endTime && ` - ${format(todo.endTime, 'HH:mm')}`}
                    </span>
                  ) : todo.scheduleType !== 'anytime' ? (
                    <span className="text-xs text-base-content/40">
                      {format(todo.createdAt, 'HH:mm')}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && editFormData !== null}
        todo={editFormData}
        onClose={() => {
          setEditingTodo(null);
          setEditFormData(null);
        }}
        onSave={handleEditSave}
        onChange={setEditFormData}
        onDelete={handleEditDelete}
        headerTitle="할일 편집"
        todoId={editingTodo?.id}
        userId={userId}
        showLinkedFuels={true}
        inboxNotes={inboxNotes}
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
    </div>
  );
}
