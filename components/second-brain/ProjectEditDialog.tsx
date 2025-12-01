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
import { convertKstDateToUtcRange } from '@/lib/date-utils';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useModalStore } from '@/state/stores/modalStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useAuth } from '@/app/context/AuthContext';
import TodoEditModal from './TodoEditModal';
import TodoListModal from './TodoListModal';
import { updateTodoProjects } from '@/lib/supabase/todo-projects';
import { updateTodoNotes } from '@/lib/supabase/todo-notes';
import { getProjectNotes } from '@/lib/supabase/project-notes';
import CalendarTodoCard from '@/components/shared/CalendarTodoCard';
import MonthlyCalendar from '@/components/calendar/MonthlyCalendar';
import WeeklyCalendar from '@/components/shared/WeeklyCalendar';
import TodoDragPreview from '@/components/shared/TodoDragPreview';

// 프론트엔드 전용 타입 (FormData 타입 + id 필드)
interface TodoItem extends TodoFormData {
  id: string;
}

interface NoteItem extends NoteFormData {
  id: string;
}

// 명료화 레이블 변환 헬퍼 함수
function getClarificationLabel(clarification?: string): string {
  if (!clarification || clarification === 'none') return '선택 안함';

  const labelMap: Record<string, string> = {
    'reminder': '다시알림',
    'someday': '언젠가',
    'waiting': '대기중',
    'next_action': '다음행동',
    'schedule_clear': '일정',
  };

  return labelMap[clarification] || clarification;
}

// InboxItem 확장 타입 (end_date 필드 추가)
type InboxItemWithEndDate = any & {
  end_date?: string | null;
};

// TodoItem을 InboxItemWithEndDate로 변환하는 헬퍼 함수
function convertTodoItemToInboxItem(todoItem: TodoItem): InboxItemWithEndDate {
  return {
    id: todoItem.id,
    content: todoItem.title,
    scheduled_date: todoItem.scheduledDate?.toISOString(),
    schedule_type: todoItem.scheduleType || 'none',
    is_completed: todoItem.completed,
    is_highlight: todoItem.isHighlight,
    clarification: todoItem.clarification,
    color: todoItem.color,
    icon: todoItem.icon,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: '',
    status: 'inbox' as const,
    // 종료일 정보 추가 (스패닝 카드용)
    end_date: todoItem.includeEndDate && todoItem.endDate
      ? todoItem.endDate.toISOString()
      : null,
  };
}

interface ProjectEditDialogProps {
  open: boolean;
  editingProject: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onSave: (projectData: Partial<Project>, area_id?: string, resource_id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (project: Project) => void;
  onProjectChange: (project: (Project & { isNew?: boolean; paraSelection?: string })) => void;
}

export default function ProjectEditDialog({
  open,
  editingProject,
  onSave,
  onCancel,
  onDelete,
  onProjectChange,
}: ProjectEditDialogProps) {
  const { openModal, closeModal } = useModalStore();

  // Store에서 직접 구독 (항상 최신 데이터 사용)
  const { goals } = useGoalStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();

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

  // noteStore에서 모든 노트 가져오기
  const allNotes = useNoteStore(state => state.notes);

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
              icon: todo.icon || 'CheckSquare',
              color: todo.color || '#808080',
              completed: todo.completed || false,
              isHighlight: todo.isHighlight || todo.isTodayHighlight || false,
              scheduledDate: todo.scheduledDate || todo.startTime
                ? new Date(todo.scheduledDate || todo.startTime)
                : undefined,
              displayOrder: todo.displayOrder || todo.orderIndex || 0,
              clarification: todo.clarification,
              nextActionStatuses: todo.nextActionStatuses,
              nextActionContextIds: todo.nextActionContextIds || todo.next_action_context_ids || [],
              // ✅ Fix: scheduleType 필드 매핑 ('none' → undefined 변환)
              scheduleType: todo.scheduleType === 'none' ? undefined : todo.scheduleType,
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

  // 프로젝트 변경 시 해당 프로젝트의 노트 로드
  useEffect(() => {
    if (!editingProject || editingProject.isNew) {
      setNotes([]);
      return;
    }

    // getProjectNotes로 프로젝트 노트 ID 배열 조회
    getProjectNotes(editingProject.id)
      .then((noteIds: string[]) => {
        // Store에서 최신 데이터 직접 조회
        const latestAreas = useAreaStore.getState().areas;
        const latestResources = useResourceStore.getState().resources;

        // noteStore에서 해당 ID의 노트 찾기
        const projectNotes = allNotes
          .filter(note => noteIds.includes(note.id))
          .map(note => {
            // area_resource_id → linkedAreaOrResource 변환
            let linkedAreaOrResource: string | undefined = undefined;
            if (note.area_resource_id) {
              const isArea = latestAreas.some(a => a.id === note.area_resource_id);
              const isResource = latestResources.some(r => r.id === note.area_resource_id);

              if (isArea) {
                linkedAreaOrResource = `area-${note.area_resource_id}`;
              } else if (isResource) {
                linkedAreaOrResource = `resource-${note.area_resource_id}`;
              }
            }

            return {
              id: note.id,
              title: note.title,
              content: note.content,
              note_category: note.note_category,
              linkedAreaOrResource,
              isPinned: note.is_pinned,
              // projects 배열 → projectIds 문자열 배열 변환
              projectIds: note.projects?.map(p => p.id) || [],
              // todos 배열 → todoIds 문자열 배열 변환
              todoIds: note.todos?.map(t => t.id) || [],
              // connectedNotes 배열 → noteIds 문자열 배열 변환
              noteIds: note.connectedNotes?.map(n => n.id) || [],
            };
          });

        setNotes(projectNotes);
      })
      .catch(error => {
        console.error('프로젝트 노트 로드 실패:', error);
        setNotes([]);
      });
  }, [editingProject?.id, editingProject?.isNew, allNotes]);

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

        // KST 날짜를 UTC로 변환
        const kstDate = new Date(dateString + 'T00:00:00');
        if (isNaN(kstDate.getTime())) return;
        const { utcStart } = convertKstDateToUtcRange(kstDate);
        const scheduledDate = new Date(dateString + 'T00:00:00');

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
        const utcEndDate = newEndDate ? convertKstDateToUtcRange(newEndDate).utcStart : undefined;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === dateString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        // clarification, schedule_type 자동 설정 로직
        const shouldUpdateClarification = draggedTodo.clarification === 'none' && draggedTodo.scheduleType === 'none';
        const updatedClarification = shouldUpdateClarification ? 'schedule_clear' : draggedTodo.clarification;
        const updatedScheduleType = shouldUpdateClarification ? 'anytime' : draggedTodo.scheduleType;

        // 로컬 state 업데이트
        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  scheduledDate,
                  endDate: newEndDate,
                  displayOrder: maxOrder + 1,
                  clarification: updatedClarification,
                  scheduleType: updatedScheduleType,
                }
              : todo
          )
        );

        // todoStore 업데이트
        if (userId) {
          const updateFields: any = {
            start_time: utcStart.toISOString(),
            end_time: utcEndDate ? utcEndDate.toISOString() : undefined,
            order_index: maxOrder + 1,
          };

          // none + none 조건일 때만 clarification, schedule_type 업데이트
          if (shouldUpdateClarification) {
            updateFields.clarification = 'schedule_clear';
            updateFields.schedule_type = 'anytime';
          }

          await updateTodo(todoId, updateFields);
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
        // KST 날짜를 UTC로 변환
        const kstDate = new Date(overIdString + 'T00:00:00');
        if (isNaN(kstDate.getTime())) return;
        const { utcStart } = convertKstDateToUtcRange(kstDate);
        const scheduledDate = new Date(overIdString + 'T00:00:00');

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
        const utcEndDate = newEndDate ? convertKstDateToUtcRange(newEndDate).utcStart : undefined;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === overIdString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        // clarification, schedule_type 자동 설정 로직
        const shouldUpdateClarification = draggedTodo.clarification === 'none' && draggedTodo.scheduleType === 'none';
        const updatedClarification = shouldUpdateClarification ? 'schedule_clear' : draggedTodo.clarification;
        const updatedScheduleType = shouldUpdateClarification ? 'anytime' : draggedTodo.scheduleType;

        // 로컬 state 업데이트
        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? {
                  ...todo,
                  scheduledDate,
                  endDate: newEndDate,
                  displayOrder: maxOrder + 1,
                  clarification: updatedClarification,
                  scheduleType: updatedScheduleType,
                }
              : todo
          )
        );

        // todoStore 업데이트
        if (userId) {
          const updateFields: any = {
            start_time: utcStart.toISOString(),
            end_time: utcEndDate ? utcEndDate.toISOString() : undefined,
            order_index: maxOrder + 1,
          };

          // none + none 조건일 때만 clarification, schedule_type 업데이트
          if (shouldUpdateClarification) {
            updateFields.clarification = 'schedule_clear';
            updateFields.schedule_type = 'anytime';
          }

          await updateTodo(todoId, updateFields);
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
      note_category: 'work_in_progress',
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
      // DB에 즉시 저장 (N:N 관계)
      const newTodo = await createTodo({
        title: '새 할일',
        completed: false,
        user_id: userId,
        project_ids: [editingProject.id], // N:N 관계로 변경
        schedule_type: 'none'
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

  // 할일 날짜 변경 (드래그앤드롭)
  const handleTodoDateChange = async (todoId: string, newDate: Date) => {
    if (!userId) return;

    try {
      // 한국시간 자정으로 설정
      const koreaDate = new Date(newDate);
      koreaDate.setHours(0, 0, 0, 0);

      // 로컬 상태 업데이트
      setTodos(todos.map(todo =>
        todo.id === todoId
          ? { ...todo, scheduledDate: koreaDate, scheduleType: 'anytime' }
          : todo
      ));

      // DB 업데이트
      await updateTodo(todoId, {
        start_time: koreaDate.toISOString(),
        schedule_type: 'anytime',
      });
    } catch (error) {
      console.error('할일 날짜 변경 실패:', error);
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
          icon: updatedTodo.icon,
          color: updatedTodo.color,
          clarification: updatedTodo.clarification as any,
          next_action_context_ids: updatedTodo.nextActionContextIds || null,
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

  // 프로젝트 즉시 저장 핸들러 (editingTodo용)
  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!editingTodo?.id || !userId) return;

    try {
      await updateTodoProjects(editingTodo.id, projectIds, userId);
      // 로컬 상태도 업데이트
      setEditingTodo({ ...editingTodo, projectIds });
      setTodos(todos.map(t => t.id === editingTodo.id ? { ...t, projectIds } : t));
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error; // Collapsible 컴포넌트에서 롤백하도록
    }
  };

  // 노트 즉시 저장 핸들러 (editingTodo용)
  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingTodo?.id || !userId) return;

    try {
      await updateTodoNotes(editingTodo.id, noteIds, userId);
      // 로컬 상태도 업데이트
      setEditingTodo({ ...editingTodo, noteIds });
      setTodos(todos.map(t => t.id === editingTodo.id ? { ...t, noteIds } : t));
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error; // Collapsible 컴포넌트에서 롤백하도록
    }
  };

  // 프로젝트 즉시 저장 핸들러 (todoFromList용)
  const handleProjectImmediateSaveFromList = async (projectIds: string[]) => {
    if (!todoFromList?.id || !userId) return;

    try {
      await updateTodoProjects(todoFromList.id, projectIds, userId);
      // 로컬 상태도 업데이트
      setTodoFromList({ ...todoFromList, projectIds });
      setTodos(todos.map(t => t.id === todoFromList.id ? { ...t, projectIds } : t));
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트 즉시 저장 핸들러 (todoFromList용)
  const handleNoteImmediateSaveFromList = async (noteIds: string[]) => {
    if (!todoFromList?.id || !userId) return;

    try {
      await updateTodoNotes(todoFromList.id, noteIds, userId);
      // 로컬 상태도 업데이트
      setTodoFromList({ ...todoFromList, noteIds });
      setTodos(todos.map(t => t.id === todoFromList.id ? { ...t, noteIds } : t));
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error;
    }
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
          icon: updatedTodo.icon,
          color: updatedTodo.color,
          clarification: updatedTodo.clarification as any,
          next_action_context_ids: updatedTodo.nextActionContextIds || null,
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

  // Z-[110] ensures modal appears above AppHeader (z-40) in Capacitor
  return (
    <>
      <dialog open className="modal modal-open z-[110]">
        <div className={`modal-box bg-base-200 w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (취소-제목-삭제-저장) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-200 z-10`}>
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
            {/* 아이콘 및 제목 - TodoFormFields 스타일 적용 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Tag className="h-5 w-5" style={{ color: editingProject.color }} />
                프로젝트 아이콘 및 제목
              </label>

              {/* 아이콘 + 제목 입력 */}
              <div className="rounded-lg bg-base-200">
                <div className="flex items-center gap-3 pl-2 pr-16 pt-2 pb-2">
                  {/* 아이콘 버튼 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIconBrowserOpen(true)}
                      className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group bg-base-100"
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

                  {/* 제목 입력 - TodoFormFields와 동일한 스타일 */}
                  <div className="flex-1">
                    <div className="input-scale-wrapper" style={{
                      transform: 'scale(1.6)',
                      transformOrigin: 'left bottom',
                      WebkitTransform: 'scale(1.6)',
                      WebkitTransformOrigin: 'left bottom',
                      width: '80%',
                      height: '44px',
                      position: 'relative'
                    }}>
                      <input
                        type="text"
                        value={editingProject.title}
                        onChange={(e) => onProjectChange({ ...editingProject, title: e.target.value })}
                        placeholder="프로젝트 제목을 입력하세요"
                        className="bg-base-200 border-0 border-b-2 border-base-300 rounded-none focus:outline-none transition-none text-base-content"
                        style={{
                          fontSize: '20px',
                          outline: 'none',
                          boxShadow: 'none',
                          fontWeight: '600',
                          height: '44px',
                          lineHeight: '0.9',
                          paddingTop: '16px',
                          paddingBottom: '0px',
                          width: '100%',
                        }}
                        required
                      />
                    </div>
                  </div>
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
            <div className="py-3 px-1 rounded-lg bg-base-200">
              <select
                value={editingProject.paraSelection}
                onChange={(e) => onProjectChange({ ...editingProject, paraSelection: e.target.value })}
                className="select select-bordered w-full bg-base-100"
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
            <div className="py-3 px-1 rounded-lg bg-base-200">
              <select
                value={editingProject.goal_id || ''}
                onChange={(e) => onProjectChange({ ...editingProject, goal_id: e.target.value })}
                className="select select-bordered w-full bg-base-100"
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
            <div className="py-3 px-1 rounded-lg bg-base-200">
              <select
                value={editingProject.status}
                onChange={(e) =>
                  onProjectChange({
                    ...editingProject,
                    status: e.target.value as 'not_started' | 'in_progress' | 'paused' | 'completed',
                  })
                }
                className="select select-bordered w-full bg-base-100"
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
              <div className="py-3 px-1 rounded-lg bg-base-200">
                <input
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, start_date: e.target.value })}
                  className="input input-bordered w-full bg-base-100"
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
              <div className="py-3 px-1 rounded-lg bg-base-200">
                <input
                  type="date"
                  value={editingProject.end_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, end_date: e.target.value })}
                  className="input input-bordered w-full bg-base-100"
                />
              </div>
            </div>
          </div>

          {/* ========== 노트 영역 ========== */}
          <div className="card bg-base-100 mb-4">
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
                          className="flex items-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {note.isPinned && <Pin className="w-4 h-4 text-primary" />}
                              <p className="font-medium truncate">{note.title}</p>
                              <span className="badge badge-sm">
                                {note.note_category === 'work_in_progress' ? '중간 작업물' :
                                 note.note_category === 'read_later' ? '나중에 보기' :
                                 note.note_category === 'reference' ? '레퍼런스' : ''}
                              </span>
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
            <div className="card bg-base-100 mb-4">
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
            <div className="card bg-base-100 mb-4">
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

                <div className="flex items-start gap-2 p-3 bg-base-200 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-base-100 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-base-content/70">
                    <strong>드래그 방법:</strong> 할일 카드를 꾹 누른 채 원하는 날짜로 드래그하세요.
                  </p>
                </div>

                {calendarView === 'week' && (
                  <WeeklyCalendar
                    todos={todos.map(convertTodoItemToInboxItem)}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onTodoClick={(todo) => handleToggleTodo(todo.id)}
                    onTodoDateChange={handleTodoDateChange}
                    project={editingProject}
                    showClarification={false}
                    enableDragDrop={true}
                    compact={false}
                    enableSpanning={true}
                  />
                )}

                {calendarView === 'month' && (
                  <MonthlyCalendar
                    todos={todos.map(convertTodoItemToInboxItem)}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onTodoClick={(todo) => handleToggleTodo(todo.id)}
                    onTodoDateChange={handleTodoDateChange}
                    showClarification={false}
                    compact={false}
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
                  <TodoDragPreview
                    title={activeTodo.title}
                    isHighlight={activeTodo.isHighlight}
                    scheduledDate={activeTodo.scheduledDate}
                  />
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

      {/* 노트 편집 모달 - Z-[110] ensures modal appears above AppHeader (z-40) in Capacitor */}
      {showNoteEditModal && editingNote && (
        <dialog open className="modal modal-open z-[110]">
          <div className={`modal-box bg-base-200 w-full max-w-4xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 (취소-제목-저장) */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 sticky top-0 bg-base-200 z-10`}>
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
        onDelete={editingTodo ? () => handleRemoveTodo(editingTodo.id) : undefined}
        onChange={(updatedTodo) => {
          if (editingTodo) {
            setEditingTodo({ ...editingTodo, ...updatedTodo });
          }
        }}
        todoId={editingTodo?.id}
        userId={appUser?.id}
        onProjectImmediateSave={handleProjectImmediateSave}
        onNoteImmediateSave={handleNoteImmediateSave}
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
        onDelete={todoFromList ? () => handleRemoveTodo(todoFromList.id) : undefined}
        onChange={(updated) => setTodoFromList(todoFromList ? { ...todoFromList, ...updated } : null)}
        todoId={todoFromList?.id}
        userId={appUser?.id}
        onProjectImmediateSave={handleProjectImmediateSaveFromList}
        onNoteImmediateSave={handleNoteImmediateSaveFromList}
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
      className={`flex items-start gap-2 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors cursor-pointer ${
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
              <p className="line-clamp-2">{getClarificationLabel(todo.clarification)}</p>
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
              className="flex items-start gap-2 p-3 bg-base-200 rounded-lg"
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
                    {getClarificationLabel(todo.clarification)}
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
