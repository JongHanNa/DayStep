'use client';

import { useState } from 'react';
import { Calendar, Star, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InboxItem, Project, Note } from '@/types/second-brain';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { updateInboxTodo } from '@/lib/supabase/inbox';
import { getInboxRemovalMessage } from '@/lib/utils/inboxMessages';
import { updateTodoProjects } from '@/lib/supabase/todo-projects';
import { updateTodoNotes } from '@/lib/supabase/todo-notes';
import { linkProjectNote } from '@/lib/supabase/project-notes';
import { nextActionToEnglish } from '@/lib/utils/nextActionMapping';

interface TodoInboxListProps {
  todos: InboxItem[];
  projects?: Project[];
  notes?: Note[];
  onRefresh: () => void;
  userId: string;
  isEditMode: boolean;
  selectedIds: Set<string>;
  swipedItemId: string | null;
  onSelectionChange: (id: string, isChecked: boolean, shiftKey: boolean, index: number) => void;
  onSwipe: (itemId: string | null) => void;
  onDeleteClick: (e: React.MouseEvent, itemId: string) => void;
  dragStartX: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
}

// 명료화 enum 값을 한글로 변환
const getClarificationLabel = (clarification?: string): string => {
  if (!clarification || clarification === 'none') return '';

  const labelMap: Record<string, string> = {
    'reminder': '다시알림',
    'someday': '언젠가',
    'waiting': '대기중',
    'next_action': '다음행동',
    'schedule_clear': '일정',
  };

  return labelMap[clarification] || clarification;
};

export default function TodoInboxList({
  todos,
  projects = [],
  notes = [],
  onRefresh,
  userId,
  isEditMode,
  selectedIds,
  swipedItemId,
  onSelectionChange,
  onSwipe,
  onDeleteClick,
  dragStartX,
  isDragging
}: TodoInboxListProps) {
  const { inboxItems, fetchInboxItems } = useInboxStore();
  const { createProject, updateProject, deleteProject } = useProjectStore();
  const { createNote, updateNote, deleteNote } = useNoteStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();
  const [editingTodo, setEditingTodo] = useState<InboxItem | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

  const handleTodoClick = (todo: InboxItem) => {
    // ✅ InboxStore에서 최신 데이터 찾기
    const latestTodo = inboxItems.find((item) => item.id === todo.id);
    const todoToEdit = latestTodo || todo; // fallback to clicked todo

    setEditingTodo(todoToEdit);
    setTodoForm({
      title: todoToEdit.content,
      clarification: todoToEdit.clarification,
      nextActionStatuses: todoToEdit.next_action_status ? [todoToEdit.next_action_status] : [],
      scheduledDate: todoToEdit.scheduled_date ? new Date(todoToEdit.scheduled_date) : undefined,
      isHighlight: todoToEdit.is_highlight || false,
      completed: todoToEdit.is_completed || false,
      projectIds: todoToEdit.project_id ? [todoToEdit.project_id] : [], // 기존 단일 선택 호환
      noteIds: [], // 새 필드
      icon: todoToEdit.icon, // 아이콘 전달
      color: todoToEdit.color || '#DBAC6C', // 색상 전달 (기본값: 골든)
    });
  };

  const handleSave = async (updatedTodo: TodoFormData) => {
    if (!editingTodo) return;

    try {
      // ✅ DB 직접 업데이트 (로컬 상태 건드리지 않음)
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');

      await updateInboxTodo(userId, editingTodo.id, {
        title: updatedTodo.title,
        clarification: updatedTodo.clarification,
        next_action_contexts: updatedTodo.nextActionStatuses ? nextActionToEnglish(updatedTodo.nextActionStatuses) : undefined,
        scheduled_date: updatedTodo.scheduledDate
          ? (() => {
              // Date 객체를 YYYY-MM-DD 문자열로 변환
              const dateStr = updatedTodo.scheduledDate.toISOString().split('T')[0];

              // 시간지정(timed)일 때: 날짜 + 시간 결합
              if (updatedTodo.scheduleType === 'timed' && updatedTodo.startTime) {
                return new Date(`${dateStr}T${updatedTodo.startTime}:00+09:00`).toISOString();
              }

              // 언제든지/종일: 한국시간 자정(00:00:00+09:00)으로 설정 후 ISO 변환
              return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
            })()
          : undefined,
        is_today_highlight: updatedTodo.isHighlight,
        completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0], // 첫 번째 프로젝트만 저장 (기존 호환)
        schedule_type: updatedTodo.scheduleType, // ✅ 일정 유형 저장
      });

      // ✅ DB에서 최신 데이터 가져오기 (UI 동기화)
      await fetchInboxItems(userId);

      // 💡 참고: TodoStore 동기화는 백엔드 연동 시 구현 예정

      // 모달 닫기
      setEditingTodo(null);
      setTodoForm(null);
    } catch (error) {
      console.error('❌ [TodoInboxList] 할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 프로젝트 관련 핸들러
  const handleCreateProject = async (title: string) => {
    if (!userId) throw new Error('User not authenticated');
    return await createProject(userId, {
      title,
      description: '',
      status: 'not_started',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    if (!userId) throw new Error('User not authenticated');
    await updateProject(userId, id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    await deleteProject(userId, id);
  };

  // 노트 관련 핸들러
  const handleCreateNote = async (title: string) => {
    if (!userId) throw new Error('User not found');

    // 1. 노트 생성
    const newNote = await createNote(userId, {
      title,
      content: '',
      note_category: 'work_in_progress', // 기본값
      is_pinned: false,
    });

    // 2. InboxItem에 project_id가 있으면 junction table로 연결
    if (editingTodo?.project_id && newNote.id) {
      try {
        await linkProjectNote(editingTodo.project_id, newNote.id);
        console.log('✅ 노트-프로젝트 연결 성공:', {
          projectId: editingTodo.project_id,
          noteId: newNote.id
        });
      } catch (error) {
        console.error('❌ 노트-프로젝트 연결 실패:', error);
        // 노트는 생성되었으므로 에러를 던지지 않고 경고만 표시
        console.warn('노트가 생성되었으나 프로젝트 연결에 실패했습니다.');
      }
    }

    return newNote;
  };

  const handleUpdateNote = async (id: string) => {
    // Note 업데이트는 NoteEdit 모달에서 처리
  };

  const handleDeleteNote = async (id: string) => {
    if (!userId) throw new Error('User not found');
    await deleteNote(id, userId);
  };

  // 프로젝트 즉시 저장 핸들러
  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!editingTodo?.id || !userId) return;

    try {
      await updateTodoProjects(editingTodo.id, projectIds, userId);
      await fetchInboxItems(userId);
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트 즉시 저장 핸들러
  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingTodo?.id || !userId) return;

    try {
      await updateTodoNotes(editingTodo.id, noteIds, userId);
      await fetchInboxItems(userId);
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error;
    }
  };

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📥</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          할일 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          수집 페이지에서 새로운 할일을 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {todos.map((todo, index) => (
          <div key={todo.id} className="relative overflow-hidden rounded-lg">
            {/* 배경 레이어: 삭제 버튼 */}
            {!isEditMode && (
              <div
                className="absolute inset-y-0 right-0 flex items-center justify-end bg-error"
                style={{ width: '85px' }}
              >
                <button
                  onClick={(e) => onDeleteClick(e, todo.id)}
                  className="btn btn-circle btn-ghost mr-2"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            )}

            {/* 카드 레이어 (framer-motion) */}
            <motion.div
              className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full"
              drag={!isEditMode ? "x" : false}
              dragConstraints={{ left: -80, right: 0 }}
              dragElastic={0.2}
              dragMomentum={false}
              onDragStart={!isEditMode ? (() => {
                return (event: any, info: any) => {
                  dragStartX.current = info.point.x;
                  isDragging.current = true;
                };
              })() : undefined}
              onDragEnd={!isEditMode ? (() => {
                return (event: any, info: any) => {
                  const dragDistance = Math.abs(info.point.x - dragStartX.current);
                  if (dragDistance > 1) {
                    const distanceThreshold = -1; // 방향 기준: 1px만 왼쪽으로 드래그
                    const velocityThreshold = -50; // 속도 기준: 매우 낮은 속도

                    // 조금이라도 왼쪽으로 움직이면 자동으로 완전히 열림
                    const shouldOpen =
                      info.offset.x < distanceThreshold ||
                      info.velocity.x < velocityThreshold;

                    if (shouldOpen) {
                      onSwipe(todo.id);
                    } else {
                      onSwipe(null);
                    }
                  }
                };
              })() : undefined}
              animate={{
                x: swipedItemId === todo.id ? -80 : 0,
                borderTopRightRadius: swipedItemId === todo.id ? 0 : '0.5rem',
                borderBottomRightRadius: swipedItemId === todo.id ? 0 : '0.5rem',
              }}
              transition={{
                type: "spring",
                stiffness: 500, // 400 → 500 (더욱 빠른 반응)
                damping: 40, // 35 → 40 (더 안정적)
                mass: 0.6, // 0.8 → 0.6 (더 가볍게)
              }}
              onClick={() => {
                if (isDragging.current) {
                  isDragging.current = false;
                  return;
                }

                if (isEditMode) {
                  const newChecked = !selectedIds.has(todo.id);
                  onSelectionChange(todo.id, newChecked, false, index);
                } else {
                  handleTodoClick(todo);
                }
              }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* 편집 모드 체크박스 */}
                  {isEditMode && (
                    <input
                      type="checkbox"
                      className="checkbox mt-0.5"
                      checked={selectedIds.has(todo.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectionChange(
                          todo.id,
                          e.target.checked,
                          (e.nativeEvent as MouseEvent).shiftKey,
                          index
                        );
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-1">{todo.content}</p>
                        {todo.clarification && todo.clarification !== 'none' && (
                          <span key={`clarification-${todo.id}`} className="badge badge-sm badge-primary">
                            {getClarificationLabel(todo.clarification)}
                          </span>
                        )}
                        {todo.next_action_status && (
                          <span key={`next-action-${todo.id}`} className="badge badge-sm badge-secondary ml-2">
                            {todo.next_action_status}
                          </span>
                        )}
                        {/* 동적 안내 메시지 */}
                        {(() => {
                          const message = getInboxRemovalMessage(todo);
                          return message ? (
                            <p className="text-xs text-base-content/60 mt-1">
                              {message}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      {todo.is_highlight && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {todo.scheduled_date && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-base-content/60">
                        <Calendar className="w-3 h-3" />
                        {new Date(todo.scheduled_date).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* 할일 편집 모달 - TodoEditModal 컴포넌트 사용 */}
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
        areas={areas}
        resources={resources}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        todoId={editingTodo?.id}
        userId={userId}
        onProjectImmediateSave={handleProjectImmediateSave}
        onNoteImmediateSave={handleNoteImmediateSave}
      />
    </>
  );
}
