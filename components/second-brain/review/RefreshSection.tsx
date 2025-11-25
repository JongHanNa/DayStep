'use client';

import { useState } from 'react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useAuth } from '@/app/context/AuthContext';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import WeeklyCalendar from '@/components/shared/WeeklyCalendar';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { InboxItem } from '@/types/second-brain';
import { updateInboxTodo } from '@/lib/supabase/inbox';
import { updateTodoProjects } from '@/lib/supabase/todo-projects';
import { updateTodoNotes } from '@/lib/supabase/todo-notes';
import { linkProjectNote } from '@/lib/supabase/project-notes';
import { Calendar, CheckSquare, Clock, Folder, Pause, Target, RotateCcw } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface RefreshSectionProps {
  isExpanded: boolean;
}

const REFRESH_TABS = [
  { id: 'next_actions', label: '다음 행동', icon: CheckSquare },
  { id: 'weekly_calendar', label: '주간 달력', icon: Calendar },
  { id: 'schedules', label: '일정 및 다시 알림', icon: Clock },
  { id: 'projects', label: '프로젝트', icon: Folder },
  { id: 'waiting', label: '대기 중', icon: Pause },
  { id: 'goals', label: '목표', icon: Target },
] as const;

// D-day 계산 함수 (Project용 - end_date 사용)
const getProjectDday = (project: { end_date?: string | null }): string => {
  if (!project.end_date) return '-';
  const today = new Date();
  const targetDate = new Date(project.end_date);
  const diffDays = differenceInDays(targetDate, today);

  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return 'D-Day';
  return `D+${Math.abs(diffDays)}`;
};

// D-day 계산 함수 (Goal용 - end_date 사용)
const getGoalDday = (goal: { end_date?: string | null }): string => {
  if (!goal.end_date) return '-';
  const today = new Date();
  const targetDate = new Date(goal.end_date);
  const diffDays = differenceInDays(targetDate, today);

  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return 'D-Day';
  return `D+${Math.abs(diffDays)}`;
};

export default function RefreshSection({ isExpanded }: RefreshSectionProps) {
  const { user } = useAuth();
  const {
    refreshChecklists,
    checklistStates,
    toggleChecklistItem,
    resetSectionChecklists,
    refreshTab,
    setRefreshTab,
  } = useReviewStore();
  const { inboxItems, fetchInboxItems } = useInboxStore();
  const { projects, createProject, updateProject: updateProjectStore, deleteProject } = useProjectStore();
  const { goals } = useGoalStore();
  const { notes, createNote, updateNote, deleteNote } = useNoteStore();

  // TodoEditModal 상태
  const [editingTodo, setEditingTodo] = useState<InboxItem | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

  // 체크 상태 확인
  const isChecked = (itemId: string) => {
    return checklistStates.get(itemId)?.is_checked || false;
  };

  // 갱신하기 섹션 리셋
  const handleResetRefresh = async () => {
    if (!user) return;
    if (!confirm('갱신하기 체크리스트를 초기화하시겠습니까?')) return;

    try {
      await resetSectionChecklists(user.id, 'refresh');
    } catch (error) {
      console.error('Failed to reset refresh checklists:', error);
    }
  };

  // 할일 클릭 핸들러 (주간 달력에서 사용)
  const handleTodoClick = (todo: InboxItem) => {
    const latestTodo = inboxItems.find((item) => item.id === todo.id);
    const todoToEdit = latestTodo || todo;

    setEditingTodo(todoToEdit);
    setTodoForm({
      title: todoToEdit.content,
      clarification: todoToEdit.clarification,
      nextActionStatuses: todoToEdit.next_action_status ? [todoToEdit.next_action_status] : [],
      scheduledDate: todoToEdit.scheduled_date ? new Date(todoToEdit.scheduled_date) : undefined,
      isHighlight: todoToEdit.is_highlight || false,
      completed: todoToEdit.is_completed || false,
      projectIds: todoToEdit.project_id ? [todoToEdit.project_id] : [],
      noteIds: [],
      icon: todoToEdit.icon,
      color: todoToEdit.color || '#DBAC6C',
    });
  };

  // 할일 저장 핸들러
  const handleSave = async (updatedTodo: TodoFormData) => {
    if (!editingTodo || !user) return;

    try {
      await updateInboxTodo(user.id, editingTodo.id, {
        title: updatedTodo.title,
        clarification: updatedTodo.clarification,
        next_action_context_ids: updatedTodo.nextActionContextIds || undefined,
        scheduled_date: updatedTodo.scheduledDate
          ? (() => {
              const dateStr = updatedTodo.scheduledDate.toISOString().split('T')[0];
              if (updatedTodo.scheduleType === 'timed' && updatedTodo.startTime) {
                return new Date(`${dateStr}T${updatedTodo.startTime}:00+09:00`).toISOString();
              }
              return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
            })()
          : undefined,
        is_today_highlight: updatedTodo.isHighlight,
        completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0],
        schedule_type: updatedTodo.scheduleType,
      });

      await fetchInboxItems(user.id);
      setEditingTodo(null);
      setTodoForm(null);
    } catch (error) {
      console.error('할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 프로젝트 관련 핸들러
  const handleCreateProject = async (title: string) => {
    if (!user) throw new Error('User not authenticated');
    return await createProject(user.id, {
      title,
      description: '',
      status: 'not_started',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    if (!user) throw new Error('User not authenticated');
    await updateProjectStore(user.id, id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    await deleteProject(user.id, id);
  };

  // 노트 관련 핸들러
  const handleCreateNote = async (title: string) => {
    if (!user) throw new Error('User not found');

    const newNote = await createNote(user.id, {
      title,
      content: '',
      note_category: 'work_in_progress',
      is_pinned: false,
    });

    if (editingTodo?.project_id && newNote.id) {
      try {
        await linkProjectNote(editingTodo.project_id, newNote.id);
      } catch (error) {
        console.error('노트-프로젝트 연결 실패:', error);
      }
    }

    return newNote;
  };

  const handleUpdateNote = async (id: string) => {
    // Note 업데이트는 NoteEdit 모달에서 처리
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) throw new Error('User not found');
    await deleteNote(id, user.id);
  };

  // 프로젝트 즉시 저장 핸들러
  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!editingTodo?.id || !user) return;
    try {
      await updateTodoProjects(editingTodo.id, projectIds, user.id);
      await fetchInboxItems(user.id);
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트 즉시 저장 핸들러
  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingTodo?.id || !user) return;
    try {
      await updateTodoNotes(editingTodo.id, noteIds, user.id);
      await fetchInboxItems(user.id);
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 명료화 속성별 필터링
  const nextActionTodos = inboxItems.filter(
    (item) => item.item_type === 'todo' && item.clarification === 'next_action'
  );
  const scheduleTodos = inboxItems.filter(
    (item) =>
      item.item_type === 'todo' &&
      (item.clarification === 'next_action' || item.clarification === 'schedule_clear') &&
      !item.is_completed
  );
  const waitingTodos = inboxItems.filter(
    (item) => item.item_type === 'todo' && item.clarification === 'waiting'
  );

  // 활성 프로젝트 필터링 (완료되지 않은 프로젝트)
  const activeProjects = projects.filter((project) => project.status !== 'completed');

  // 활성 목표 필터링 (완료되지 않은 목표)
  const activeGoals = goals.filter((goal) => goal.status !== 'completed' && goal.status !== 'paused');

  // 프로젝트 통계 계산 (연결된 할일 기반)
  const getProjectStats = (projectId: string) => {
    const projectTodos = inboxItems.filter(
      (item) => item.item_type === 'todo' && item.project_id === projectId
    );
    const completed = projectTodos.filter((todo) => todo.is_completed).length;
    const total = projectTodos.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, completionRate };
  };

  // 목표 통계 계산 (연결된 프로젝트 기반)
  const getGoalStats = (goalId: string) => {
    const goalProjects = projects.filter((project) => project.goal_id === goalId);
    const completed = goalProjects.filter((project) => project.status === 'completed').length;
    const total = goalProjects.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, completionRate };
  };

  if (!isExpanded) return null;

  return (
    <div className="space-y-4">
      {/* 갱신하기 체크리스트 */}
      <div className="p-4 bg-base-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">아래 사항을 확인해 주세요.</h4>
          <button
            onClick={handleResetRefresh}
            className="btn btn-ghost btn-xs rounded-full"
            title="체크리스트 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            리셋
          </button>
        </div>

        {/* 2컬럼 체크박스 */}
        <div className="grid grid-cols-2 gap-3">
          {refreshChecklists.map((item) => (
            <label key={item.id} className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={isChecked(item.id)}
                onChange={() => user && toggleChecklistItem(user.id, item.id)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 탭 영역 */}
      <div>
        <div className="tabs tabs-boxed overflow-x-auto">
          {REFRESH_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setRefreshTab(tab.id as typeof refreshTab)}
                className={`tab ${refreshTab === tab.id ? 'tab-active' : ''}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 탭별 내용 */}
        <div className="mt-4">
          {refreshTab === 'next_actions' && (
            <div className="space-y-2">
              {nextActionTodos.map((todo) => (
                <div key={todo.id} className="p-3 bg-base-100 rounded-lg">
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    다음행동 상황 | 프로젝트: {todo.project_id || '없음'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {refreshTab === 'weekly_calendar' && (
            <WeeklyCalendar
              todos={scheduleTodos}
              showClarification={true}
              enableSpanning={false}
              compact={true}
              onTodoClick={handleTodoClick}
            />
          )}

          {refreshTab === 'schedules' && (
            <div className="space-y-2">
              {scheduleTodos.map((todo) => (
                <div key={todo.id} className="p-3 bg-base-100 rounded-lg">
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    명료화: {todo.clarification} | 날짜: {todo.scheduled_date || '없음'} | 프로젝트: {todo.project_id || '없음'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {refreshTab === 'projects' && (
            <div className="space-y-2">
              {activeProjects.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  활성 프로젝트가 없습니다
                </div>
              ) : (
                activeProjects.map((project) => {
                  const stats = getProjectStats(project.id);
                  return (
                    <div key={project.id} className="p-3 bg-base-100 rounded-lg">
                      <div className="font-medium">{project.title}</div>
                      <div className="text-xs text-base-content/60 mt-1">
                        상태: {project.status || '미지정'} | D-day: {getProjectDday(project)} |
                        할일: {stats.completed}/{stats.total} |
                        완료율: {stats.completionRate}%
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {refreshTab === 'waiting' && (
            <div className="space-y-2">
              {waitingTodos.map((todo) => (
                <div key={todo.id} className="p-3 bg-base-100 rounded-lg">
                  <div className="font-medium">{todo.content}</div>
                  <div className="text-xs text-base-content/60 mt-1">
                    날짜: {todo.scheduled_date || '없음'} | 프로젝트: {todo.project_id || '없음'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {refreshTab === 'goals' && (
            <div className="space-y-2">
              {activeGoals.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  활성 목표가 없습니다
                </div>
              ) : (
                activeGoals.map((goal) => {
                  const stats = getGoalStats(goal.id);
                  return (
                    <div key={goal.id} className="p-3 bg-base-100 rounded-lg">
                      <div className="font-medium">{goal.title}</div>
                      <div className="text-xs text-base-content/60 mt-1">
                        {goal.year_goal ? '연간' : goal.quarter_goal ? '분기' : '기간'} |
                        D-day: {getGoalDday(goal)} |
                        프로젝트: {stats.total} (완료: {stats.completed}) |
                        완료율: {stats.completionRate}%
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && todoForm !== null}
        todo={todoForm}
        onClose={() => {
          setEditingTodo(null);
          setTodoForm(null);
        }}
        onSave={handleSave}
        onChange={(updated) => setTodoForm(todoForm ? { ...todoForm, ...updated } : null)}
        projects={projects}
        notes={notes}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        todoId={editingTodo?.id}
        userId={user?.id}
        onProjectImmediateSave={handleProjectImmediateSave}
        onNoteImmediateSave={handleNoteImmediateSave}
      />
    </div>
  );
}
