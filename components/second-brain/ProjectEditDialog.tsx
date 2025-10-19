'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Pin, Star, GripVertical } from 'lucide-react';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { Project, Goal, Area, Resource } from '@/types/second-brain';
import { useDndKit } from '@/hooks/useDndKit';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths } from 'date-fns';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useModalStore } from '@/state/stores/modalStore';

// 프론트엔드 전용 타입 (FormData 타입 + id 필드)
interface TodoItem extends TodoFormData {
  id: string;
}

interface NoteItem extends NoteFormData {
  id: string;
}

interface ProjectEditDialogProps {
  open: boolean;
  editingProject: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  goals: Goal[];
  areas: Area[];
  resources: Resource[];
  onSave: (projectData: Partial<Project>, area_id?: string, resource_id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (project: Project) => void;
  onProjectChange: (project: (Project & { isNew?: boolean; paraSelection?: string })) => void;
}

export default function ProjectEditDialog({
  open,
  editingProject,
  goals,
  areas,
  resources,
  onSave,
  onCancel,
  onDelete,
  onProjectChange,
}: ProjectEditDialogProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 아이콘 브라우저 모달
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 노트 상태
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [showNoteEditModal, setShowNoteEditModal] = useState(false);

  // 할일 상태
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [showTodoEditModal, setShowTodoEditModal] = useState(false);

  // 달력 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // useDndKit Hook
  const { sensors, activeItem: activeTodo, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps, dragOverlayProps } = useDndKit<TodoItem>({
    onDragEnd: (active, over) => {
      if (!over || !over.id) return;

      const todoId = active.id as string;
      const dateString = over.id as string;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;

      const scheduledDate = new Date(dateString);

      if (isNaN(scheduledDate.getTime())) return;

      setTodos(
        todos.map((todo) =>
          todo.id === todoId ? { ...todo, scheduledDate } : todo
        )
      );
    },
    getActiveItem: (id) => todos.find((t) => t.id === id),
  });

  // 아이콘 변경
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingProject) {
      onProjectChange({ ...editingProject, icon: iconKey });
    }
  };

  // 색상 변경
  const handleColorChange = (colorId: string) => {
    if (editingProject) {
      const color = getColorById(colorId).hex;
      onProjectChange({ ...editingProject, color });
    }
  };

  // 저장
  const handleSave = async () => {
    if (!editingProject || !editingProject.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    // paraSelection에서 area_id 또는 resource_id 추출
    let area_id: string | undefined;
    let resource_id: string | undefined;

    if (editingProject.paraSelection) {
      if (editingProject.paraSelection.startsWith('area-')) {
        area_id = editingProject.paraSelection.replace('area-', '');
      } else if (editingProject.paraSelection.startsWith('resource-')) {
        resource_id = editingProject.paraSelection.replace('resource-', '');
      }
    }

    await onSave(editingProject, area_id, resource_id);
  };

  // 노트 추가
  const handleAddNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '새 노트',
      content: '',
      category: '중간 작업물',
      isPinned: false,
    };

    setNotes([...notes, newNote]);
  };

  // 노트 제거
  const handleRemoveNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  // 노트 편집 열기
  const handleNoteClick = (note: NoteItem) => {
    setEditingNote({ ...note });
    setShowNoteEditModal(true);
  };

  // 노트 편집 저장
  const handleSaveNoteEdit = () => {
    if (!editingNote || !editingNote.title.trim()) {
      alert('노트 제목을 입력해주세요.');
      return;
    }

    setNotes(notes.map((note) => (note.id === editingNote.id ? editingNote : note)));
    setShowNoteEditModal(false);
    setEditingNote(null);
  };

  // 노트 편집 취소
  const handleCancelNoteEdit = () => {
    setShowNoteEditModal(false);
    setEditingNote(null);
  };

  // 할일 추가
  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '새 할일',
      completed: false,
      isHighlight: false,
    };

    setTodos([...todos, newTodo]);
  };

  // 할일 완료 토글
  const handleToggleTodo = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // 할일 제거
  const handleRemoveTodo = (todoId: string) => {
    setTodos(todos.filter((todo) => todo.id !== todoId));
  };

  // 할일 편집 열기
  const handleTodoClick = (todo: TodoItem) => {
    setEditingTodo({ ...todo });
    setShowTodoEditModal(true);
  };

  // 할일 편집 저장
  const handleSaveTodoEdit = () => {
    if (!editingTodo || !editingTodo.title.trim()) {
      alert('할일 제목을 입력해주세요.');
      return;
    }

    setTodos(todos.map((todo) => (todo.id === editingTodo.id ? editingTodo : todo)));
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 편집 취소
  const handleCancelTodoEdit = () => {
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  if (!open || !editingProject) return null;

  return (
    <>
      <dialog open className="modal modal-open">
        <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (취소-제목-삭제-저장) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
            <button onClick={onCancel} className="btn btn-primary btn-sm rounded-full">
              취소
            </button>
            <h3 className="font-bold text-lg">
              {editingProject.isNew ? '새 프로젝트 추가' : '프로젝트 편집'}
            </h3>
            <div className="flex items-center gap-2">
              {!editingProject.isNew && (
                <button
                  onClick={() => {
                    onCancel();
                    onDelete(editingProject as Project);
                  }}
                  className="btn btn-ghost btn-sm text-error rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={handleSave} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">아이콘 및 색상</span>
            </label>
            <button
              type="button"
              onClick={() => setIconBrowserOpen(true)}
              className="btn btn-outline w-full justify-start"
              style={{
                backgroundColor: editingProject.color + '20',
                borderColor: editingProject.color,
              }}
            >
              {(() => {
                const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey).component;
                return <IconComponent className="w-6 h-6 mr-2" />;
              })()}
              <span>변경하기</span>
            </button>
          </div>

          {/* 제목 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">제목</span>
            </label>
            <input
              type="text"
              value={editingProject.title}
              onChange={(e) => onProjectChange({ ...editingProject, title: e.target.value })}
              className="input input-bordered"
              placeholder="예: 웹사이트 리뉴얼"
            />
          </div>

          {/* 목표 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">목표</span>
            </label>
            <select
              value={editingProject.goal_id || ''}
              onChange={(e) => onProjectChange({ ...editingProject, goal_id: e.target.value })}
              className="select select-bordered"
            >
              <option value="">선택 안 함</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>

          {/* 진행상황 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">진행상황</span>
            </label>
            <select
              value={editingProject.status}
              onChange={(e) =>
                onProjectChange({
                  ...editingProject,
                  status: e.target.value as 'not_started' | 'active' | 'on_hold' | 'completed',
                })
              }
              className="select select-bordered"
            >
              <option value="not_started">시작 안함</option>
              <option value="active">진행중</option>
              <option value="on_hold">중단</option>
              <option value="completed">완료</option>
            </select>
          </div>

          {/* 영역/자원 */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">영역/자원 (선택)</span>
            </label>
            <select
              value={editingProject.paraSelection}
              onChange={(e) => onProjectChange({ ...editingProject, paraSelection: e.target.value })}
              className="select select-bordered"
            >
              <option value="">선택 안 함</option>
              <optgroup label="영역">
                {areas.map((area) => (
                  <option key={area.id} value={`area-${area.id}`}>
                    {area.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="자원">
                {resources.map((resource) => (
                  <option key={resource.id} value={`resource-${resource.id}`}>
                    {resource.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 시작일/종료일 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">시작일 (선택)</span>
              </label>
              <input
                type="date"
                value={editingProject.start_date || ''}
                onChange={(e) => onProjectChange({ ...editingProject, start_date: e.target.value })}
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">종료일 (선택)</span>
              </label>
              <input
                type="date"
                value={editingProject.target_end_date || ''}
                onChange={(e) => onProjectChange({ ...editingProject, target_end_date: e.target.value })}
                className="input input-bordered"
              />
            </div>
          </div>

          {/* ========== 노트 영역 ========== */}
          <div className="card bg-base-200 mb-4">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">노트</h2>
                <button onClick={handleAddNote} className="btn btn-ghost btn-sm">
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  노트가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes
                    .sort((a, b) => {
                      if (a.isPinned && !b.isPinned) return -1;
                      if (!a.isPinned && b.isPinned) return 1;
                      return 0;
                    })
                    .map((note) => {
                      let linkedName = '';
                      if (note.linkedAreaOrResource) {
                        if (note.linkedAreaOrResource.startsWith('area-')) {
                          const linkedArea = areas.find((a) => a.id === note.linkedAreaOrResource?.replace('area-', ''));
                          linkedName = linkedArea ? `영역: ${linkedArea.title}` : '';
                        } else if (note.linkedAreaOrResource.startsWith('resource-')) {
                          const linkedResource = resources.find((r) => r.id === note.linkedAreaOrResource?.replace('resource-', ''));
                          linkedName = linkedResource ? `자원: ${linkedResource.title}` : '';
                        }
                      }

                      return (
                        <div
                          key={note.id}
                          onClick={() => handleNoteClick(note)}
                          className="flex items-start gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {note.isPinned && <Pin className="w-4 h-4 text-primary" />}
                              <p className="font-medium truncate">{note.title}</p>
                              <span className="badge badge-sm">{note.category}</span>
                            </div>
                            <p className="text-sm text-base-content/60 truncate mb-1">{note.content}</p>
                            {linkedName && (
                              <p className="text-xs text-base-content/50">{linkedName}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveNote(note.id);
                            }}
                            className="btn btn-ghost btn-sm btn-circle"
                            aria-label="노트 제거"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* ========== 할일 영역 ========== */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDndEnd} {...dndContextProps}>
            <div className="card bg-base-200 mb-4">
              <div className="card-body p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">할일</h2>
                  <button onClick={handleAddTodo} className="btn btn-ghost btn-sm">
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>

                {todos.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    할일이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todos.map((todo) => (
                      <TodoDraggableItem
                        key={todo.id}
                        todo={todo}
                        onToggle={handleToggleTodo}
                        onRemove={handleRemoveTodo}
                        onEdit={handleTodoClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ========== 달력 영역 ========== */}
            <div className="card bg-base-200 mb-4">
              <div className="card-body p-3">
                <h2 className="text-lg font-semibold mb-4">할일 계획</h2>
                <div className="flex items-start gap-2 p-3 bg-base-100 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-base-200 flex-shrink-0">
                    <GripVertical className="w-4 h-4 text-base-content/40" />
                  </div>
                  <p className="text-sm text-base-content/70">
                    <strong>드래그 방법:</strong> 위 할일의 왼쪽 핸들(<GripVertical className="w-3 h-3 inline" />)을 잡고 원하는 날짜로 드래그하세요.
                  </p>
                </div>

                <CalendarDropArea
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  todos={todos}
                />
              </div>
            </div>

            {/* 드래그 프리뷰 오버레이 */}
            {typeof window !== 'undefined' && createPortal(
              <DragOverlay {...dragOverlayProps}>
                {activeTodo && (
                  <div className="bg-base-100 border-2 border-primary rounded-lg p-3 shadow-2xl max-w-xs opacity-90">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{activeTodo.title}</p>
                      {activeTodo.isHighlight && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    {activeTodo.scheduledDate && (
                      <p className="text-xs text-base-content/60 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(activeTodo.scheduledDate, 'M/d')}
                      </p>
                    )}
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onCancel} />
      </dialog>

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingProject?.icon}
        selectedColor={editingProject?.color}
        onColorSelect={handleColorChange}
      />

      {/* 노트 편집 모달 */}
      {showNoteEditModal && editingNote && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-4xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 (취소-제목-저장) */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelNoteEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">노트 편집</h3>
              <button onClick={handleSaveNoteEdit} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              <NoteFormFields
                note={editingNote}
                onChange={(updatedNote) => setEditingNote({ ...editingNote, ...updatedNote })}
                areas={areas}
                resources={resources}
              />
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelNoteEdit} />
        </dialog>
      )}

      {/* 할일 편집 모달 */}
      {showTodoEditModal && editingTodo && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-4xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 (취소-제목-저장) */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelTodoEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">할일 편집</h3>
              <button onClick={handleSaveTodoEdit} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              <TodoFormFields
                todo={editingTodo}
                onChange={(updatedTodo) => setEditingTodo({ ...editingTodo, ...updatedTodo })}
              />
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelTodoEdit} />
        </dialog>
      )}
    </>
  );
}

// ========== 할일 드래그 가능 아이템 컴포넌트 ==========
function TodoDraggableItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
}: {
  todo: TodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    data: { todoId: todo.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={() => onEdit(todo)}
      className={`flex items-start gap-2 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-6 h-6 mt-1 rounded cursor-grab active:cursor-grabbing hover:bg-base-300 transition-colors flex-shrink-0"
        aria-label="드래그하여 날짜 지정"
      >
        <GripVertical className="w-4 h-4 text-base-content/40" />
      </div>

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => {
          e.stopPropagation();
          onToggle(todo.id);
        }}
        className="checkbox checkbox-sm mt-1 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`font-medium truncate ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
            {todo.title}
          </p>
          {todo.isHighlight && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
        </div>

        {(todo.clarification || (todo.nextActionStatuses && todo.nextActionStatuses.length > 0) || todo.scheduledDate) && (
          <div className="space-y-1 text-xs text-base-content/60">
            {todo.clarification && (
              <p className="line-clamp-2">{todo.clarification}</p>
            )}
            {todo.nextActionStatuses && todo.nextActionStatuses.length > 0 && (
              <p>다음행동: {todo.nextActionStatuses.join(', ')}</p>
            )}
            {todo.scheduledDate && (
              <p>
                <Calendar className="w-3 h-3 inline mr-1" />
                {format(todo.scheduledDate, 'yyyy-MM-dd')}
              </p>
            )}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(todo.id);
        }}
        className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
        aria-label="할일 제거"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ========== 달력 드롭 영역 컴포넌트 ==========
function CalendarDropArea({
  selectedDate,
  onDateChange,
  todos,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = 'yyyy-MM-dd';
  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="w-full">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDateChange(addMonths(selectedDate, -1))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">{format(selectedDate, 'yyyy년 M월')}</h3>
        <button
          onClick={() => onDateChange(addMonths(selectedDate, 1))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName) => (
          <div key={dayName} className="text-center text-sm font-medium py-2">
            {dayName}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateString = format(day, dateFormat);
          const todosForDay = todos.filter(
            (todo) =>
              todo.scheduledDate &&
              format(todo.scheduledDate, dateFormat) === dateString
          );

          return (
            <CalendarDayCell
              key={dateString}
              date={day}
              isCurrentMonth={isSameMonth(day, selectedDate)}
              isToday={isSameDay(day, new Date())}
              todosCount={todosForDay.length}
            />
          );
        })}
      </div>
    </div>
  );
}

// ========== 달력 날짜 셀 컴포넌트 ==========
function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  todosCount,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  todosCount: number;
}) {
  const dateString = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[70px] p-2 border-2 rounded-lg transition-all duration-200
        ${isOver ? 'bg-primary/30 border-primary shadow-lg scale-105' : 'border-base-300'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isToday ? 'bg-primary/10 border-primary' : 'bg-base-100'}
        hover:border-primary/50 hover:shadow-md cursor-pointer
      `}
    >
      <div className="text-sm font-medium mb-1">{format(date, 'd')}</div>
      {todosCount > 0 && (
        <div className="text-xs bg-primary text-primary-content rounded-full w-5 h-5 flex items-center justify-center font-semibold">
          {todosCount}
        </div>
      )}
    </div>
  );
}
