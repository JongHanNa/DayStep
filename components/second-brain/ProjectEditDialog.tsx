'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Pin, Star, Tag, Palette, Target, Activity, Layers } from 'lucide-react';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { Project, Goal, AreaResource as Area, AreaResource as Resource } from '@/types/second-brain';
import { useDndKit } from '@/hooks/useDndKit';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useModalStore } from '@/state/stores/modalStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAuth } from '@/app/context/AuthContext';
import TodoEditModal from './TodoEditModal';
import TodoListModal from './TodoListModal';

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

  // todoStore에서 프로젝트 할일 로드 및 업데이트 함수
  const { appUser } = useAuth();
  const userId = appUser?.id;
  const fetchTodosByProjectId = useTodoStore(state => state.fetchTodosByProjectId);
  const updateTodo = useTodoStore(state => state.updateTodo);
  const createTodo = useTodoStore(state => state.createTodo);

  // 프로젝트 변경 시 해당 프로젝트의 할일 로드
  useEffect(() => {
    if (!editingProject || editingProject.isNew || !userId) {
      setTodos([]);
      return;
    }

    // fetchTodosByProjectId로 프로젝트 할일 직접 조회 (날짜 범위 제한 없음)
    fetchTodosByProjectId(editingProject.id)
      .then((projectTodos: any[]) => {
        const mappedTodos = projectTodos
          .map((todo: any) => {
            console.log('📋 매핑 중인 할일:', {
              id: todo.id,
              title: todo.title,
              hasId: !!todo.id
            });

            return {
              id: todo.id,
              title: todo.title,
              completed: todo.completed || false,
              isHighlight: todo.isHighlight || todo.isTodayHighlight || false,
              scheduledDate: todo.scheduledDate || todo.startTime
                ? new Date(todo.scheduledDate || todo.startTime)
                : undefined,
              displayOrder: todo.displayOrder || todo.orderIndex || 0,
              clarification: todo.clarification,
              nextActionStatuses: todo.nextActionStatuses,
              // ✅ Fix: DB start_time에서 includeTime 계산 (시간 정보 있으면 true)
              includeTime: todo.startTime
                ? (() => {
                    const st = new Date(todo.startTime);
                    return st.getHours() !== 0 || st.getMinutes() !== 0;
                  })()
                : false,
              // ✅ Fix: startTime을 HH:mm 문자열로 변환
              startTime: todo.startTime
                ? (() => {
                    const st = new Date(todo.startTime);
                    const hours = st.getHours().toString().padStart(2, '0');
                    const minutes = st.getMinutes().toString().padStart(2, '0');
                    return `${hours}:${minutes}`;
                  })()
                : undefined,
              // ✅ Fix: DB end_time 존재하면 includeEndDate true
              includeEndDate: !!todo.endTime,
              // ✅ Fix: endDate는 endTime에서 가져오기
              endDate: todo.endTime ? new Date(todo.endTime) : undefined,
              // ✅ Fix: endTime을 HH:mm 문자열로 변환
              endTime: todo.endTime
                ? (() => {
                    const et = new Date(todo.endTime);
                    const hours = et.getHours().toString().padStart(2, '0');
                    const minutes = et.getMinutes().toString().padStart(2, '0');
                    return `${hours}:${minutes}`;
                  })()
                : undefined,
              projectIds: todo.projectIds,
              noteIds: todo.noteIds,
            };
          })
          .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

        console.log('✅ 프로젝트 할일 매핑 완료:', {
          count: mappedTodos.length,
          sample: mappedTodos[0]
        });

        setTodos(mappedTodos);
      })
      .catch((error: any) => {
        console.error('프로젝트 할일 로드 실패:', error);
        setTodos([]);
      });
  }, [editingProject?.id, editingProject?.isNew, userId, fetchTodosByProjectId]);

  // 달력 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'month' | 'completed'>('week');

  // 할일 목록 모달 상태
  const [selectedDateTodos, setSelectedDateTodos] = useState<TodoItem[]>([]);
  const [selectedDateForList, setSelectedDateForList] = useState<Date | null>(null);
  const [showTodoListModal, setShowTodoListModal] = useState(false);

  // 할일 편집 모달 상태 (TodoListModal에서 할일 클릭 시 사용)
  const [todoFromList, setTodoFromList] = useState<TodoItem | null>(null);
  const [showTodoEditFromList, setShowTodoEditFromList] = useState(false);

  // useDndKit Hook
  const { sensors, activeItem: activeTodo, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps, dragOverlayProps } = useDndKit<TodoItem>({
    onDragEnd: async (active, over) => {
      if (!over || !over.id) return;

      // 할일 ID 추출 (week-todo-, month-todo- 또는 직접 ID)
      const activeIdString = active.id as string;
      let todoId = activeIdString;
      if (activeIdString.startsWith('week-todo-')) {
        todoId = activeIdString.replace('week-todo-', '');
      } else if (activeIdString.startsWith('month-todo-')) {
        todoId = activeIdString.replace('month-todo-', '');
      }

      // 드롭 위치 ID 추출
      const overIdString = over.id as string;

      // 주간 뷰 컬럼 드롭: week-yyyy-MM-dd 형식
      if (overIdString.startsWith('week-')) {
        const dateString = overIdString.replace('week-', '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;
        const scheduledDate = new Date(dateString);
        if (isNaN(scheduledDate.getTime())) return;

        // 드래그된 할일 찾기
        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        // 원래 시작일-종료일 간격 계산
        let daysDiff = 0;
        if (draggedTodo.includeEndDate && draggedTodo.endDate && draggedTodo.scheduledDate) {
          daysDiff = differenceInCalendarDays(draggedTodo.endDate, draggedTodo.scheduledDate);
        }

        // 새 종료일 계산 (간격 유지)
        const newEndDate = daysDiff > 0 ? addDays(scheduledDate, daysDiff) : draggedTodo.endDate;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === dateString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        // 로컬 state 업데이트
        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? { ...todo, scheduledDate, endDate: newEndDate, displayOrder: maxOrder + 1 }
              : todo
          )
        );

        // todoStore 업데이트
        if (userId) {
          await updateTodo(todoId, {
            start_time: scheduledDate.toISOString(),
            end_time: newEndDate ? newEndDate.toISOString() : null,
            order_index: maxOrder + 1,
          });
        }

        return;
      }

      // 주간 뷰 할일 위에 드롭: week-todo- 형식 (같은 날짜 내 순서 변경)
      if (overIdString.startsWith('week-todo-')) {
        const overTodoId = overIdString.replace('week-todo-', '');
        const overTodo = todos.find((t) => t.id === overTodoId);
        if (!overTodo || !overTodo.scheduledDate) return;

        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        const targetDateString = format(overTodo.scheduledDate, 'yyyy-MM-dd');
        const sameDateTodos = todos
          .filter((t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === targetDateString)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        // 같은 날짜 내에서 순서 재정렬
        const newTodos = [...todos];
        const targetIndex = sameDateTodos.findIndex((t) => t.id === overTodoId);

        newTodos.forEach((todo) => {
          if (todo.id === todoId) {
            // 드래그한 할일: 새 날짜 + 새 순서
            todo.scheduledDate = overTodo.scheduledDate;
            todo.displayOrder = targetIndex;
          } else if (todo.scheduledDate && format(todo.scheduledDate, 'yyyy-MM-dd') === targetDateString) {
            // 같은 날짜의 다른 할일들: 순서 조정
            const currentIndex = sameDateTodos.findIndex((t) => t.id === todo.id);
            if (currentIndex >= targetIndex) {
              todo.displayOrder = (todo.displayOrder || 0) + 1;
            }
          }
        });

        setTodos(newTodos);
        return;
      }

      // 월간 뷰 할일 위에 드롭: month-todo- 형식 (같은 날짜 내 순서 변경)
      if (overIdString.startsWith('month-todo-')) {
        const overTodoId = overIdString.replace('month-todo-', '');
        const overTodo = todos.find((t) => t.id === overTodoId);
        if (!overTodo || !overTodo.scheduledDate) return;

        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        const targetDateString = format(overTodo.scheduledDate, 'yyyy-MM-dd');
        const sameDateTodos = todos
          .filter((t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === targetDateString)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        // 같은 날짜 내에서 순서 재정렬
        const newTodos = [...todos];
        const targetIndex = sameDateTodos.findIndex((t) => t.id === overTodoId);

        newTodos.forEach((todo) => {
          if (todo.id === todoId) {
            // 드래그한 할일: 새 날짜 + 새 순서
            todo.scheduledDate = overTodo.scheduledDate;
            todo.displayOrder = targetIndex;
          } else if (todo.scheduledDate && format(todo.scheduledDate, 'yyyy-MM-dd') === targetDateString) {
            // 같은 날짜의 다른 할일들: 순서 조정
            const currentIndex = sameDateTodos.findIndex((t) => t.id === todo.id);
            if (currentIndex >= targetIndex) {
              todo.displayOrder = (todo.displayOrder || 0) + 1;
            }
          }
        });

        setTodos(newTodos);
        return;
      }

      // 월간 뷰 셀 드롭: yyyy-MM-dd 형식
      if (/^\d{4}-\d{2}-\d{2}$/.test(overIdString)) {
        const scheduledDate = new Date(overIdString);
        if (isNaN(scheduledDate.getTime())) return;

        // 드래그된 할일 찾기
        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        // 원래 시작일-종료일 간격 계산
        let daysDiff = 0;
        if (draggedTodo.includeEndDate && draggedTodo.endDate && draggedTodo.scheduledDate) {
          daysDiff = differenceInCalendarDays(draggedTodo.endDate, draggedTodo.scheduledDate);
        }

        // 새 종료일 계산 (간격 유지)
        const newEndDate = daysDiff > 0 ? addDays(scheduledDate, daysDiff) : draggedTodo.endDate;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === overIdString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        // 로컬 state 업데이트
        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? { ...todo, scheduledDate, endDate: newEndDate, displayOrder: maxOrder + 1 }
              : todo
          )
        );

        // todoStore 업데이트
        if (userId) {
          await updateTodo(todoId, {
            start_time: scheduledDate.toISOString(),
            end_time: newEndDate ? newEndDate.toISOString() : null,
            order_index: maxOrder + 1,
          });
        }

        return;
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
      return todos.find((t) => t.id === todoId);
    },
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

    // paraSelection → area_resource_id 변환
    let area_resource_id: string | undefined = undefined;

    if (editingProject.paraSelection && editingProject.paraSelection !== '') {
      if (editingProject.paraSelection.startsWith('area-')) {
        area_resource_id = editingProject.paraSelection.replace('area-', '');
      } else if (editingProject.paraSelection.startsWith('resource-')) {
        area_resource_id = editingProject.paraSelection.replace('resource-', '');
      }
    }

    await onSave({
      ...editingProject,
      area_resource_id
    });
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
  const handleAddTodo = async () => {
    if (!userId || !editingProject?.id) {
      console.error('❌ userId 또는 projectId 없음');
      alert('프로젝트 정보가 없습니다.');
      return;
    }

    try {
      // DB에 즉시 저장
      const newTodo = await createTodo({
        title: '새 할일',
        completed: false,
        user_id: userId,
        project_id: editingProject.id,
        schedule_type: 'anytime'
      });

      if (!newTodo) {
        throw new Error('할일 생성 응답이 없습니다.');
      }

      // DB 저장 성공 후 로컬 상태 업데이트
      const todoItem: TodoItem = {
        id: newTodo.id,
        title: newTodo.title,
        completed: newTodo.completed,
        isHighlight: false,
        scheduledDate: newTodo.startTime ? new Date(newTodo.startTime) : undefined,
        includeTime: false,
        startTime: undefined,
        includeEndDate: false,
        endDate: undefined,
        endTime: undefined,
      };

      setTodos([...todos, todoItem]);
    } catch (error) {
      console.error('❌ 할일 생성 실패:', error);
      alert('할일 생성에 실패했습니다.');
    }
  };

  // 할일 완료 토글
  const handleToggleTodo = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    const newCompleted = !todo.completed;

    // 로컬 state 업데이트
    setTodos(
      todos.map((t) =>
        t.id === todoId ? { ...t, completed: newCompleted } : t
      )
    );

    // todoStore 업데이트
    if (userId) {
      await updateTodo(todoId, {
        completed: newCompleted,
      });
    }
  };

  // 할일 제거
  const deleteTodo = useTodoStore(state => state.deleteTodo);
  const handleRemoveTodo = async (todoId: string) => {
    // 로컬 state 업데이트
    setTodos(todos.filter((todo) => todo.id !== todoId));

    // todoStore 삭제
    await deleteTodo(todoId);
  };

  // 할일 편집 열기
  const handleTodoClick = (todo: TodoItem) => {
    setEditingTodo({ ...todo });
    setShowTodoEditModal(true);
  };

  // 할일 편집 저장
  const handleSaveTodoEdit = async (updatedTodo: TodoFormData) => {
    if (!editingTodo || !updatedTodo.title.trim()) {
      alert('할일 제목을 입력해주세요.');
      return;
    }

    // 로컬 state 업데이트
    const updatedTodoData = { ...editingTodo, ...updatedTodo };
    setTodos(todos.map((todo) => (todo.id === editingTodo.id ? updatedTodoData : todo)));

    // DB 업데이트 추가
    if (userId) {
      try {
        // 🔧 Fix: TodoStore에 할일이 없을 수 있으므로, 먼저 전역 상태에 추가
        // updateTodo는 내부에서 get().todos.find()로 할일을 찾기 때문에
        // 프로젝트 편집 모달의 로컬 상태에만 있는 할일은 찾지 못함
        // 따라서 updateTodo 호출 전에 TodoStore에 할일을 임시로 추가
        useTodoStore.setState((state) => {
          const existingIndex = state.todos.findIndex((t) => t.id === editingTodo.id);
          if (existingIndex === -1) {
            // 할일이 TodoStore에 없으면 추가
            return {
              ...state,
              todos: [
                ...state.todos,
                {
                  ...editingTodo,
                  userId: userId,
                  scheduleType: editingTodo.scheduledDate ? 'timed' : 'anytime',
                  startTime: updatedTodo.scheduledDate?.toISOString(),
                  recurrencePattern: 'none',
                } as any,
              ],
            };
          }
          return state;
        });

        await updateTodo(editingTodo.id, {
          title: updatedTodo.title,
          clarification: updatedTodo.clarification,
          next_action_statuses: updatedTodo.nextActionStatuses,
          // ✅ Fix: scheduled_date 컬럼 제거 (DB에 존재하지 않음)
          // start_time을 scheduledDate + startTime 조합으로 설정
          start_time: updatedTodo.scheduledDate
            ? (updatedTodo.includeTime && updatedTodo.startTime
                ? new Date(updatedTodo.scheduledDate.toDateString() + ' ' + updatedTodo.startTime).toISOString()
                : updatedTodo.scheduledDate.toISOString())
            : undefined,
          end_time: updatedTodo.includeEndDate && updatedTodo.endDate
            ? (updatedTodo.includeTime && updatedTodo.endTime
                ? new Date(updatedTodo.endDate.toDateString() + ' ' + updatedTodo.endTime).toISOString()
                : updatedTodo.endDate.toISOString())
            : undefined,
          is_today_highlight: updatedTodo.isHighlight,
          completed: updatedTodo.completed,
          project_ids: updatedTodo.projectIds,
          note_ids: updatedTodo.noteIds,
        });
      } catch (error) {
        console.error('할일 저장 실패:', error);
        alert('할일 저장에 실패했습니다.');
      }
    }

    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 편집 취소
  const handleCancelTodoEdit = () => {
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 목록 모달 열기
  const handleOpenTodoListModal = (date: Date, todosForDate: TodoItem[]) => {
    setSelectedDateForList(date);
    setSelectedDateTodos(todosForDate);
    setShowTodoListModal(true);
  };

  // 할일 목록 모달 닫기
  const handleCloseTodoListModal = () => {
    setShowTodoListModal(false);
    setSelectedDateForList(null);
    setSelectedDateTodos([]);
  };

  // 할일 목록 모달에서 할일 클릭 시 (TodoEditModal 열기)
  const handleTodoClickFromList = (todo: TodoItem) => {
    handleCloseTodoListModal();
    setTodoFromList(todo);
    setShowTodoEditFromList(true);
  };

  // TodoEditModal 닫기
  const handleCloseTodoEditFromList = () => {
    setShowTodoEditFromList(false);
    setTodoFromList(null);
  };

  // TodoEditModal에서 저장
  const handleSaveTodoFromList = async (updatedTodo: TodoFormData) => {
    if (!todoFromList) return;

    // 로컬 state 업데이트
    const updatedTodoData = { ...todoFromList, ...updatedTodo };
    const updatedTodos = todos.map((t) =>
      t.id === todoFromList.id ? updatedTodoData : t
    );
    setTodos(updatedTodos);

    // DB 업데이트 추가
    if (userId) {
      try {
        // 🔧 Fix: TodoStore에 할일이 없을 수 있으므로, 먼저 전역 상태에 추가
        useTodoStore.setState((state) => {
          const existingIndex = state.todos.findIndex((t) => t.id === todoFromList.id);
          if (existingIndex === -1) {
            // 할일이 TodoStore에 없으면 추가
            return {
              ...state,
              todos: [
                ...state.todos,
                {
                  ...todoFromList,
                  userId: userId,
                  scheduleType: todoFromList.scheduledDate ? 'timed' : 'anytime',
                  startTime: updatedTodo.scheduledDate?.toISOString(),
                  recurrencePattern: 'none',
                } as any,
              ],
            };
          }
          return state;
        });

        await updateTodo(todoFromList.id, {
          title: updatedTodo.title,
          clarification: updatedTodo.clarification,
          next_action_statuses: updatedTodo.nextActionStatuses,
          // ✅ Fix: scheduled_date 컬럼 제거 (DB에 존재하지 않음)
          // start_time을 scheduledDate + startTime 조합으로 설정
          start_time: updatedTodo.scheduledDate
            ? (updatedTodo.includeTime && updatedTodo.startTime
                ? new Date(updatedTodo.scheduledDate.toDateString() + ' ' + updatedTodo.startTime).toISOString()
                : updatedTodo.scheduledDate.toISOString())
            : undefined,
          end_time: updatedTodo.includeEndDate && updatedTodo.endDate
            ? (updatedTodo.includeTime && updatedTodo.endTime
                ? new Date(updatedTodo.endDate.toDateString() + ' ' + updatedTodo.endTime).toISOString()
                : updatedTodo.endDate.toISOString())
            : undefined,
          is_today_highlight: updatedTodo.isHighlight,
          completed: updatedTodo.completed,
          project_ids: updatedTodo.projectIds,
          note_ids: updatedTodo.noteIds,
        });
      } catch (error) {
        console.error('할일 저장 실패:', error);
        alert('할일 저장에 실패했습니다.');
      }
    }

    handleCloseTodoEditFromList();
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
            {/* 아이콘 및 제목 - TodoMetadata 스타일 적용 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Tag className="h-5 w-5" style={{ color: editingProject.color }} />
                프로젝트 아이콘 및 제목
              </label>

              {/* 아이콘 + 제목 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <div className="flex items-center gap-3">
                  {/* 아이콘 버튼 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIconBrowserOpen(true)}
                      className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                      style={{ backgroundColor: '#f3f4f6' }}
                      title="아이콘 변경하기"
                    >
                      {(() => {
                        const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey);
                        return <IconComponent
                          className="group-hover:scale-110 transition-transform"
                          style={{ color: editingProject.color }}
                          size={24}
                        />;
                      })()}
                    </button>

                    {/* 색상 인디케이터 */}
                    <div
                      className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        backgroundColor: editingProject.color,
                        border: '2px solid white'
                      }}
                    >
                      <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* 제목 입력 */}
                  <input
                    type="text"
                    value={editingProject.title}
                    onChange={(e) => onProjectChange({ ...editingProject, title: e.target.value })}
                    placeholder="프로젝트 제목을 입력하세요"
                    className="flex-1 bg-base-100 border-0 border-b-2 rounded-none focus:outline-none transition-none"
                    style={{
                      fontSize: '20px',
                      color: '#333333',
                      borderBottomColor: '#D1D5DB',
                      outline: 'none',
                      boxShadow: 'none',
                      fontWeight: '600',
                      height: '44px',
                    }}
                    required
                  />
                </div>
              </div>
            </div>

          {/* 영역/자원 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Layers className="h-5 w-5" style={{ color: editingProject.color }} />
              영역/자원
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.paraSelection}
                onChange={(e) => onProjectChange({ ...editingProject, paraSelection: e.target.value })}
                className="select select-bordered w-full"
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
          </div>

          {/* 목표 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Target className="h-5 w-5" style={{ color: editingProject.color }} />
              목표
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.goal_id || ''}
                onChange={(e) => onProjectChange({ ...editingProject, goal_id: e.target.value })}
                className="select select-bordered w-full"
              >
                <option value="">선택 안 함</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 진행상황 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Activity className="h-5 w-5" style={{ color: editingProject.color }} />
              진행상황
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.status}
                onChange={(e) =>
                  onProjectChange({
                    ...editingProject,
                    status: e.target.value as 'not_started' | 'in_progress' | 'paused' | 'completed',
                  })
                }
                className="select select-bordered w-full"
              >
                <option value="not_started">시작 안함</option>
                <option value="in_progress">진행중</option>
                <option value="paused">중단</option>
                <option value="completed">완료</option>
              </select>
            </div>
          </div>

          {/* 시작일/종료일 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 시작일 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Calendar className="h-5 w-5" style={{ color: editingProject.color }} />
                시작일
              </label>

              {/* 날짜 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <input
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, start_date: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            {/* 종료일 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Calendar className="h-5 w-5" style={{ color: editingProject.color }} />
                종료일
              </label>

              {/* 날짜 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <input
                  type="date"
                  value={editingProject.end_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, end_date: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          {/* ========== 노트 영역 ========== */}
          <div className="card bg-base-200 mb-4">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">노트</h2>
                <button onClick={handleAddNote} className="btn btn-ghost btn-sm rounded-full">
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
                  <button onClick={handleAddTodo} className="btn btn-ghost btn-sm rounded-full">
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

                {/* 탭 바 */}
                <div className="tabs tabs-boxed mb-4">
                  <button
                    className={`tab ${calendarView === 'week' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('week')}
                  >
                    주간
                  </button>
                  <button
                    className={`tab ${calendarView === 'month' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('month')}
                  >
                    월간
                  </button>
                  <button
                    className={`tab ${calendarView === 'completed' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('completed')}
                  >
                    완료된 일
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-base-100 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-base-200 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-base-content/70">
                    <strong>드래그 방법:</strong> 할일 카드를 꾹 누른 채 원하는 날짜로 드래그하세요.
                  </p>
                </div>

                {calendarView === 'week' && (
                  <WeekView
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                    project={editingProject}
                    onOpenTodoListModal={handleOpenTodoListModal}
                  />
                )}

                {calendarView === 'month' && (
                  <CalendarDropArea
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                    project={editingProject}
                    onOpenTodoListModal={handleOpenTodoListModal}
                  />
                )}

                {calendarView === 'completed' && (
                  <CompletedView
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                  />
                )}
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
      <TodoEditModal
        open={showTodoEditModal}
        todo={editingTodo}
        onClose={handleCancelTodoEdit}
        onSave={handleSaveTodoEdit}
        onChange={(updatedTodo) => {
          if (editingTodo) {
            setEditingTodo({ ...editingTodo, ...updatedTodo });
          }
        }}
      />

      {/* 할일 목록 모달 */}
      <TodoListModal
        open={showTodoListModal}
        date={selectedDateForList}
        todos={selectedDateTodos}
        project={editingProject}
        onClose={handleCloseTodoListModal}
        onTodoClick={handleTodoClickFromList}
        onToggleComplete={handleToggleTodo}
      />

      {/* TodoListModal에서 클릭한 할일 편집 모달 */}
      <TodoEditModal
        open={showTodoEditFromList}
        todo={todoFromList}
        onClose={handleCloseTodoEditFromList}
        onSave={handleSaveTodoFromList}
        onChange={(updated) => setTodoFromList(todoFromList ? { ...todoFromList, ...updated } : null)}
      />
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
      {...listeners}
      onClick={() => onEdit(todo)}
      className={`flex items-start gap-2 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer ${
        isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer'
      }`}
    >
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
                {todo.includeTime && todo.startTime && ` ${todo.startTime}`}
                {todo.includeEndDate && todo.endDate && (
                  <> ~ {format(todo.endDate, 'yyyy-MM-dd')}
                  {todo.endTime && ` ${todo.endTime}`}</>
                )}
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
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
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

  // 스패닝 카드 시작 위치를 기록 (index → TodoItem + 세그먼트 정보)
  const spanningStarts = new Map<
    number,
    {
      todo: TodoItem;
      spanDays: number;
      segmentPosition: 'single' | 'first' | 'middle' | 'last';
    }
  >();

  // 단일 날짜 카드 (index → TodoItem[])
  const singleDayCards = new Map<number, TodoItem[]>();

  // 0-41 초기화 (6주 * 7일)
  for (let i = 0; i < 42; i++) {
    singleDayCards.set(i, []);
  }

  todos.forEach((todo) => {
    if (!todo.scheduledDate) return;

    if (todo.includeEndDate && todo.endDate) {
      const start = todo.scheduledDate;
      const end = todo.endDate;

      // 현재 달력 범위와 교집합 확인
      if (start <= endDate && end >= startDate) {
        // 날짜 정규화
        const clippedStart = startOfDay(start < startDate ? startDate : start);
        const clippedEnd = startOfDay(end > endDate ? endDate : end);

        // 그리드 위치 계산 (0-41)
        const startCol = differenceInCalendarDays(clippedStart, startDate);
        const endCol = differenceInCalendarDays(clippedEnd, startDate);
        const spanDays = endCol - startCol + 1;

        if (spanDays > 1) {
          // 여러 주에 걸친 스패닝 카드를 주 단위로 분할
          let currentCol = startCol;
          const segments: number[] = []; // 모든 세그먼트 시작 위치 기록

          while (currentCol <= endCol) {
            const colInWeek = currentCol % 7; // 현재 요일 위치
            const daysLeftInWeek = 7 - colInWeek; // 이번 주에 남은 일수
            const daysLeftInSpan = endCol - currentCol + 1; // 전체에서 남은 일수
            const segmentSpan = Math.min(daysLeftInWeek, daysLeftInSpan); // 이번 세그먼트 길이

            segments.push(currentCol);

            // 다음 주 일요일로 이동
            currentCol += segmentSpan;
          }

          // 각 세그먼트에 위치 정보와 함께 등록
          segments.forEach((segmentStart, index) => {
            const colInWeek = segmentStart % 7;
            const daysLeftInWeek = 7 - colInWeek;
            const daysLeftInSpan = endCol - segmentStart + 1;
            const segmentSpan = Math.min(daysLeftInWeek, daysLeftInSpan);

            let segmentPosition: 'single' | 'first' | 'middle' | 'last';
            if (segments.length === 1) {
              segmentPosition = 'single';
            } else if (index === 0) {
              segmentPosition = 'first';
            } else if (index === segments.length - 1) {
              segmentPosition = 'last';
            } else {
              segmentPosition = 'middle';
            }

            spanningStarts.set(segmentStart, {
              todo,
              spanDays: segmentSpan,
              segmentPosition,
            });
          });
        } else {
          singleDayCards.get(startCol)?.push(todo);
        }
      }
    } else {
      // 단일 날짜 할일
      if (todo.scheduledDate >= startDate && todo.scheduledDate <= endDate) {
        const colIndex = differenceInCalendarDays(todo.scheduledDate, startDate);
        singleDayCards.get(colIndex)?.push(todo);
      }
    }
  });

  // 각 날짜의 카드 정렬
  singleDayCards.forEach((cards) => {
    cards.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  });

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
        {days.map((day, index) => {
          const dateString = format(day, dateFormat);
          const todosForDay = singleDayCards.get(index) || [];
          const spanningCard = spanningStarts.get(index);

          // 모든 날짜 셀 렌더링 (스패닝 카드는 각 주의 시작 셀에 표시)
          return (
            <CalendarDayCell
              key={dateString}
              date={day}
              isCurrentMonth={isSameMonth(day, selectedDate)}
              isToday={isSameDay(day, new Date())}
              todos={todosForDay}
              onToggleTodo={onToggleTodo}
              project={project}
              onOpenTodoListModal={onOpenTodoListModal}
              spanningCard={spanningCard?.todo}
              spanDays={spanningCard?.spanDays}
              segmentPosition={spanningCard?.segmentPosition}
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
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
  spanningCard,
  spanDays,
  segmentPosition,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
  spanningCard?: TodoItem;
  spanDays?: number;
  segmentPosition?: 'single' | 'first' | 'middle' | 'last';
}) {
  const dateString = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
    data: { date },
  });

  const isMobile = process.env.BUILD_TARGET === 'mobile';

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (isMobile && todos.length > 0) {
          onOpenTodoListModal(date, todos);
        }
      }}
      className={`
        relative min-h-[100px] p-2 border-2 rounded-lg transition-all duration-200
        ${isOver ? 'bg-primary/30 border-primary shadow-lg scale-105' : 'border-base-300'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        bg-base-100 ${isToday ? 'border-primary' : 'border-base-300'}
        hover:border-primary/50 hover:shadow-md
        ${isMobile && todos.length > 0 ? 'cursor-pointer' : ''}
      `}
    >
      {/* 날짜 헤더 */}
      <div className="text-sm font-medium mb-2">{format(date, 'd')}</div>

      {/* 스패닝 카드 (absolute positioning으로 여러 셀에 걸쳐 표시) */}
      {spanningCard && spanDays && (
        <div
          className="absolute top-[36px] mb-2"
          style={{
            left: segmentPosition === 'first' || segmentPosition === 'single' ? '0.5rem' : '0',
            width: segmentPosition === 'first' || segmentPosition === 'single'
              ? `calc(${spanDays * 100}% + ${(spanDays - 1) * 0.5}rem - 0.5rem)`
              : segmentPosition === 'last'
              ? `calc(${spanDays * 100}% - 0.5rem)`
              : `calc(${spanDays * 100}% + ${(spanDays - 1) * 0.5}rem)`,
            zIndex: 10
          }}
        >
          <MonthTodoCard
            todo={spanningCard}
            onToggle={onToggleTodo}
            project={project}
            isSpanning={true}
            segmentPosition={segmentPosition}
          />
        </div>
      )}

      {/* 할일 표시 영역 */}
      {isMobile ? (
        // Capacitor 환경: 점 + 개수 표시
        todos.length > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project?.color || '#808080' }}
            />
            <span className="text-sm font-medium">{todos.length}</span>
          </div>
        )
      ) : (
        // 웹 환경: 단일 날짜 카드만 렌더링 (스패닝 카드는 overlay에서)
        <div className="space-y-1">
          {todos.map((todo) => (
            <MonthTodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              project={project}
              isSpanning={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 월간 뷰 할일 카드 컴포넌트 ==========
function MonthTodoCard({
  todo,
  onToggle,
  project,
  isSpanning = false,
  segmentPosition = 'single',
}: {
  todo: TodoItem;
  onToggle: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  isSpanning?: boolean;
  segmentPosition?: 'single' | 'first' | 'middle' | 'last';
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `month-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'month-todo' },
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `month-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'month-todo' },
  });

  // 두 개의 ref를 결합
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropNodeRef(node);
  };

  // 세그먼트 위치에 따른 border-radius 결정
  const getBorderRadius = () => {
    if (!isSpanning) return 'rounded';

    switch (segmentPosition) {
      case 'single':
        return 'rounded-lg';
      case 'first':
        return 'rounded-l-lg rounded-r-none';
      case 'middle':
        return 'rounded-none';
      case 'last':
        return 'rounded-l-none rounded-r-lg';
      default:
        return 'rounded-lg';
    }
  };

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      className={`
        transition-colors cursor-pointer text-xs
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'ring-2 ring-primary' : ''}
        ${isSpanning
          ? `bg-primary text-primary-content hover:bg-primary/90 border-2 border-primary ${getBorderRadius()}
             ${segmentPosition === 'first' || segmentPosition === 'single' ? 'pl-1.5' : 'pl-0'}
             ${segmentPosition === 'last' || segmentPosition === 'single' ? 'pr-1.5' : 'pr-0'}
             py-1.5`
          : 'bg-base-200 hover:bg-base-300 rounded p-1.5'}
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-1.5 mb-1">
        <p className={`flex-1 font-medium line-clamp-1 ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.title}
        </p>
        {todo.highlight && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: project?.color || '#808080' }}
          />
        )}
      </div>

      {/* 메타 정보 */}
      {(todo.scheduledTime || todo.place) && (
        <div className="flex items-center gap-2 text-[10px] text-base-content/60">
          {todo.scheduledTime && (
            <div className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              <span>{todo.scheduledTime}</span>
            </div>
          )}
          {todo.place && (
            <div className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              <span className="line-clamp-1">{todo.place}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== 주간 뷰 컴포넌트 ==========
function WeekView({
  selectedDate,
  onDateChange,
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  // 현재 주의 일요일~토요일 계산
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 일요일 시작
  const weekEnd = addDays(weekStart, 6); // 토요일
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 할일을 스패닝 카드와 일반 카드로 분리
  interface SpanningCard {
    todo: TodoItem;
    startDay: number; // 0-6 (일~토)
    spanDays: number; // 1-7
    rowIndex: number;
  }

  const { spanningCards, singleDayCards } = (() => {
    const spanning: SpanningCard[] = [];
    const single: Map<number, TodoItem[]> = new Map();

    // 각 날짜별 일반 카드 초기화
    for (let i = 0; i < 7; i++) {
      single.set(i, []);
    }

    todos.forEach((todo) => {
      if (!todo.scheduledDate) return;

      // 종료일이 있고 범위가 현재 주와 겹치는 경우
      if (todo.includeEndDate && todo.endDate) {
        const start = todo.scheduledDate;
        const end = todo.endDate;

        // 현재 주와 겹치는지 확인
        if (start <= weekEnd && end >= weekStart) {
          // 현재 주 범위 내로 클립
          const clippedStart = start < weekStart ? weekStart : start;
          const clippedEnd = end > weekEnd ? weekEnd : end;

          const startDay = differenceInCalendarDays(clippedStart, weekStart);
          const endDay = differenceInCalendarDays(clippedEnd, weekStart);
          const spanDays = endDay - startDay + 1;

          if (spanDays > 1) {
            spanning.push({
              todo,
              startDay,
              spanDays,
              rowIndex: 0, // 나중에 행 배치 계산
            });
          } else {
            // 1일짜리는 일반 카드로
            single.get(startDay)?.push(todo);
          }
        }
      } else {
        // 종료일 없는 경우: 시작일이 현재 주에 있으면 표시
        if (todo.scheduledDate >= weekStart && todo.scheduledDate <= weekEnd) {
          const dayIndex = differenceInCalendarDays(todo.scheduledDate, weekStart);
          single.get(dayIndex)?.push(todo);
        }
      }
    });

    // 각 날짜의 일반 카드 정렬
    single.forEach((cards) => {
      cards.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    return { spanningCards: spanning, singleDayCards: single };
  })();

  return (
    <div className="w-full">
      {/* 주간 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDateChange(addDays(selectedDate, -7))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">
          {format(weekStart, 'M월 d일')} - {format(addDays(weekStart, 6), 'M월 d일')}
        </h3>
        <button
          onClick={() => onDateChange(addDays(selectedDate, 7))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 7일 컬럼 그리드 + 스패닝 카드 */}
      <div className="relative">
        <div className="grid grid-cols-7 gap-2">
          {/* 날짜 헤더 + 일반 카드 */}
          {weekDays.map((day, dayIndex) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayTodos = singleDayCards.get(dayIndex) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <WeekDayColumn
                key={dateString}
                date={day}
                isToday={isToday}
                todos={dayTodos}
                onToggleTodo={onToggleTodo}
                project={project}
                onOpenTodoListModal={onOpenTodoListModal}
              />
            );
          })}
        </div>

        {/* 스패닝 카드 오버레이 (CSS Grid span 사용) */}
        {spanningCards.length > 0 && (
          <div className="grid grid-cols-7 gap-2 absolute top-0 left-0 right-0 pointer-events-none">
            {/* 헤더 공간 확보 */}
            {weekDays.map((_, i) => (
              <div key={`header-space-${i}`} className="h-[60px]" />
            ))}

            {/* 스패닝 카드들 */}
            {spanningCards.map((card) => (
              <div
                key={`spanning-${card.todo.id}`}
                className="pointer-events-auto"
                style={{
                  gridColumn: `${card.startDay + 1} / span ${card.spanDays}`,
                  gridRow: 2, // 헤더 아래 첫 번째 행
                }}
              >
                <div className="px-1">
                  <WeekTodoCard
                    todo={card.todo}
                    onToggle={onToggleTodo}
                    project={project}
                    isSpanning={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== 주간 뷰 날짜 컬럼 컴포넌트 ==========
function WeekDayColumn({
  date,
  isToday,
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  date: Date;
  isToday: boolean;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  const dateString = format(date, 'yyyy-MM-dd');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  const { setNodeRef, isOver } = useDroppable({
    id: `week-${dateString}`,
    data: { date, type: 'week-column' },
  });

  const isMobile = process.env.BUILD_TARGET === 'mobile';

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (isMobile && todos.length > 0) {
          onOpenTodoListModal(date, todos);
        }
      }}
      className={`
        flex flex-col
        min-h-[400px] p-2 rounded-lg border-2 transition-all
        ${
          isOver
            ? 'bg-primary/20 border-primary'
            : isToday
            ? 'bg-base-100 border-primary'
            : 'bg-base-100 border-base-300'
        }
        ${isMobile && todos.length > 0 ? 'cursor-pointer' : ''}
      `}
    >
      {/* 날짜 헤더 */}
      <div className="flex-shrink-0 mb-2 pb-2 border-b border-base-300">
        <div className="text-sm font-bold text-center">{dayOfWeek}</div>
        <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
      </div>

      {/* 할일 표시 영역 */}
      {isMobile ? (
        // Capacitor 환경: 점 + 개수 표시
        <div className="flex-1 overflow-y-auto">
          {todos.length > 0 ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project?.color || '#808080' }}
              />
              <span className="text-sm font-medium">{todos.length}</span>
            </div>
          ) : (
            <div className="text-xs text-base-content/40 text-center py-4">
              할일 없음
            </div>
          )}
        </div>
      ) : (
        // 웹 환경: 기존 방식 유지
        <div className="flex-1 space-y-2 overflow-y-auto">
          {todos.map((todo) => (
            <WeekTodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              project={project}
            />
          ))}
          {todos.length === 0 && (
            <div className="text-xs text-base-content/40 text-center py-4">
              할일 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== 주간 뷰 할일 카드 컴포넌트 ==========
function WeekTodoCard({
  todo,
  onToggle,
  project,
  isSpanning = false,
}: {
  todo: TodoItem;
  onToggle: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  isSpanning?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `week-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'week-todo' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        p-2 rounded-lg transition-colors cursor-pointer
        ${isDragging ? 'opacity-50' : ''}
        ${isSpanning ? 'bg-primary text-primary-content hover:bg-primary/90 border-2 border-primary' : 'bg-base-200 hover:bg-base-300'}
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-2 mb-1">
        <p className={`text-xs font-medium flex-1 ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.title}
        </p>
        {todo.isHighlight && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
      </div>

      {/* 명료화 */}
      {todo.clarification && (
        <p className="text-xs text-base-content/60 mb-1 line-clamp-2">
          {todo.clarification}
        </p>
      )}

      {/* 날짜/시간 정보 */}
      {todo.scheduledDate && (
        <div className="text-xs text-base-content/60 mb-1">
          <Calendar className="w-3 h-3 inline mr-1" />
          {format(todo.scheduledDate, 'M/d')}
          {todo.includeTime && todo.startTime && ` ${todo.startTime}`}
          {todo.includeEndDate && todo.endDate && (
            <> ~ {format(todo.endDate, 'M/d')}
            {todo.endTime && ` ${todo.endTime}`}</>
          )}
        </div>
      )}

      {/* 프로젝트 배지 */}
      {project && (
        <div className="flex items-center gap-1 mb-1">
          <div className="text-xs bg-base-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            {project.icon && (() => {
              const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey);
              return <IconComponent className="w-3 h-3" />;
            })()}
            <span className="font-medium truncate max-w-[80px]">{project.title}</span>
          </div>
        </div>
      )}

      {/* 완료 체크박스 (제일 하단, 왼쪽 정렬) */}
      <div className="flex items-center justify-start gap-2 mt-1">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}
          className="checkbox checkbox-xs flex-shrink-0"
        />
        <span className="text-xs text-base-content/60">완료</span>
      </div>
    </div>
  );
}

// ========== 완료 타임라인 뷰 컴포넌트 ==========
function CompletedView({
  todos,
  onToggleTodo,
}: {
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
}) {
  // 완료된 할일만 필터링 (시간순 정렬은 나중에 추가)
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">
        완료된 할일 ({completedTodos.length}개)
      </h3>

      {completedTodos.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          완료된 할일이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {completedTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-2 p-3 bg-base-100 rounded-lg"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggleTodo(todo.id)}
                className="checkbox checkbox-sm mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium line-through text-base-content/50">
                  {todo.title}
                </p>
                {todo.clarification && (
                  <p className="text-sm text-base-content/60 mt-1">
                    {todo.clarification}
                  </p>
                )}
                {todo.scheduledDate && (
                  <p className="text-xs text-base-content/40 mt-1">
                    {format(todo.scheduledDate, 'yyyy-MM-dd')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
