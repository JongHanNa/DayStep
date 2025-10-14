'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { ArrowLeft, Save, Plus, X, Trash2 } from 'lucide-react';
import type { UpdateProjectInput, Note } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// 임시 할일 타입 (프론트엔드 전용)
interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate?: Date;
}

// 임시 노트 타입 (프론트엔드 전용)
interface NoteItem {
  id: string;
  title: string;
  content: string;
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { projects, updateProject, fetchProjects } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 기본 폼 상태
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    icon: string;
    color: string;
    status: 'not_started' | 'active' | 'on_hold' | 'completed';
    goal_id: string;
    start_date: string;
    target_end_date: string;
    paraSelection: string;
  }>({
    title: '',
    description: '',
    icon: 'lucide-FolderOpen',
    color: '#A8DADC',
    status: 'not_started',
    goal_id: '',
    start_date: '',
    target_end_date: '',
    paraSelection: '',
  });

  // 노트 상태 (프론트엔드 전용)
  const [notes, setNotes] = useState<NoteItem[]>([
    { id: 'note-1', title: '회의 내용', content: '프로젝트 킥오프 미팅 요약' },
    { id: 'note-2', title: '참고 자료', content: '관련 문서 링크 모음' },
  ]);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // 할일 상태 (프론트엔드 전용)
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 'todo-1', title: '요구사항 정리', completed: false },
    { id: 'todo-2', title: '디자인 시안 작성', completed: false },
    { id: 'todo-3', title: '개발 환경 셋업', completed: true },
  ]);
  const [showTodoModal, setShowTodoModal] = useState(false);

  // 달력 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // DnD 설정 (Capacitor 호환)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (터치 스크롤과 구분)
      },
    })
  );

  useEffect(() => {
    fetchProjects();
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchProjects, fetchGoals, fetchAreas, fetchResources]);

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      // paraSelection 생성
      let paraSelection = '';
      if (project.area_id) {
        paraSelection = `area-${project.area_id}`;
      } else if (project.resource_id) {
        paraSelection = `resource-${project.resource_id}`;
      }

      // archived 상태는 편집 화면에서 선택 불가능하므로 active로 변경
      const editableStatus = project.status === 'archived' ? 'active' : project.status;

      setFormData({
        title: project.title,
        description: project.description || '',
        icon: project.icon || 'lucide-FolderOpen',
        color: project.color,
        status: editableStatus,
        goal_id: project.goal_id || '',
        start_date: project.start_date || '',
        target_end_date: project.target_end_date || '',
        paraSelection,
      });
      setLoading(false);
    }
  }, [projects, projectId]);

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    setFormData({ ...formData, icon: iconKey });
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    setFormData({ ...formData, color });
  };

  // 노트 추가
  const handleAddNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '새 노트',
      content: '',
    };
    setNotes([...notes, newNote]);
    setShowNoteModal(false);
  };

  // 노트 제거
  const handleRemoveNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  // 할일 추가
  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '새 할일',
      completed: false,
    };
    setTodos([...todos, newTodo]);
    setShowTodoModal(false);
  };

  // 할일 제거
  const handleRemoveTodo = (todoId: string) => {
    setTodos(todos.filter((todo) => todo.id !== todoId));
  };

  // 할일 완료 토글
  const handleToggleTodo = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const todoId = active.id as string;
    const dateString = over.id as string;

    // 날짜 문자열을 Date 객체로 변환
    const date = new Date(dateString);

    // 할일에 날짜 할당
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, scheduledDate: date } : todo
      )
    );
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (formData.paraSelection) {
        if (formData.paraSelection.startsWith('area-')) {
          area_id = formData.paraSelection.replace('area-', '');
        } else if (formData.paraSelection.startsWith('resource-')) {
          resource_id = formData.paraSelection.replace('resource-', '');
        }
      }

      const updateData: UpdateProjectInput = {
        title: formData.title,
        description: formData.description || '',
        icon: formData.icon,
        color: formData.color,
        status: formData.status,
        goal_id: formData.goal_id || undefined,
        area_id,
        resource_id,
        start_date: formData.start_date || undefined,
        target_end_date: formData.target_end_date || undefined,
      };

      await updateProject(projectId, updateData);
      router.push(`/settings/second-brain/projects/${projectId}`);
    } catch (error) {
      console.error('프로젝트 수정 실패:', error);
      alert('프로젝트 수정에 실패했습니다.');
    }
  };

  // 프로젝트 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const IconComponent = getUnifiedIcon(formData.icon as UnifiedIconKey).component;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">프로젝트 편집</h1>
              </div>
              <button onClick={handleSave} className="btn btn-primary btn-sm">
                <Save className="w-4 h-4" />
                저장
              </button>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* ========== 기본 정보 섹션 ========== */}
          <div className="card bg-base-200">
            <div className="card-body space-y-4">
              <h2 className="text-lg font-semibold">기본 정보</h2>

              {/* 아이콘 및 색상 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">아이콘 및 색상</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIconBrowserOpen(true)}
                  className="btn btn-outline w-full justify-start"
                  style={{
                    backgroundColor: formData.color + '20',
                    borderColor: formData.color,
                  }}
                >
                  <IconComponent className="w-6 h-6 mr-2" />
                  <span>변경하기</span>
                </button>
              </div>

              {/* 제목 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">제목</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input input-bordered"
                  placeholder="예: 웹사이트 리뉴얼"
                />
              </div>

              {/* 설명 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">설명 (선택)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea textarea-bordered h-24"
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                />
              </div>

              {/* 연결할 목표 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">연결할 목표 (선택)</span>
                </label>
                <select
                  value={formData.goal_id}
                  onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                  className="select select-bordered"
                >
                  <option value="">선택 안 함</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.icon} {goal.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 진행상황 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">진행상황</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
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

              {/* 연결할 영역/자원 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">연결할 영역/자원 (선택)</span>
                </label>
                <select
                  value={formData.paraSelection}
                  onChange={(e) => setFormData({ ...formData, paraSelection: e.target.value })}
                  className="select select-bordered"
                >
                  <option value="">선택 안 함</option>
                  <optgroup label="영역">
                    {areas.map((area) => (
                      <option key={area.id} value={`area-${area.id}`}>
                        {area.icon} {area.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="자원">
                    {resources.map((resource) => (
                      <option key={resource.id} value={`resource-${resource.id}`}>
                        {resource.icon} {resource.title}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 시작일/종료일 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">시작일 (선택)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">종료일 (선택)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.target_end_date}
                    onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                    className="input input-bordered"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========== 노트 영역 ========== */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">연결된 노트</h2>
                <button onClick={() => setShowNoteModal(true)} className="btn btn-ghost btn-sm">
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  연결된 노트가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{note.title}</p>
                        <p className="text-sm text-base-content/60 truncate">{note.content}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveNote(note.id)}
                        className="btn btn-ghost btn-sm btn-circle"
                        aria-label="노트 제거"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========== 할일 영역 ========== */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">연결된 할일</h2>
                <button onClick={() => setShowTodoModal(true)} className="btn btn-ghost btn-sm">
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {todos.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  연결된 할일이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <TodoDraggableItem
                      key={todo.id}
                      todo={todo}
                      onToggle={handleToggleTodo}
                      onRemove={handleRemoveTodo}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========== 달력 영역 ========== */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="text-lg font-semibold mb-4">할일 계획</h2>
              <p className="text-sm text-base-content/60 mb-4">
                위 할일을 원하는 날짜로 드래그하여 계획하세요.
              </p>

              <CalendarDropArea
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                todos={todos}
              />
            </div>
          </div>
        </div>

        {/* 아이콘 브라우저 모달 */}
        <EnhancedIconBrowserModal
          open={iconBrowserOpen}
          onClose={() => setIconBrowserOpen(false)}
          onIconSelect={handleIconChange}
          selectedIcon={formData.icon}
          selectedColor={formData.color}
          onColorSelect={handleColorChange}
        />

        {/* 노트 추가 모달 */}
        {showNoteModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">노트 추가</h3>
              <p className="text-sm text-base-content/70 mb-4">
                새 노트를 추가하시겠습니까?
              </p>
              <div className="modal-action">
                <button onClick={() => setShowNoteModal(false)} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleAddNote} className="btn btn-primary">
                  추가
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowNoteModal(false)}></div>
          </div>
        )}

        {/* 할일 추가 모달 */}
        {showTodoModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">할일 추가</h3>
              <p className="text-sm text-base-content/70 mb-4">
                새 할일을 추가하시겠습니까?
              </p>
              <div className="modal-action">
                <button onClick={() => setShowTodoModal(false)} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleAddTodo} className="btn btn-primary">
                  추가
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowTodoModal(false)}></div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

// ========== 할일 드래그 가능 아이템 컴포넌트 ==========
import { useDraggable } from '@dnd-kit/core';

function TodoDraggableItem({
  todo,
  onToggle,
  onRemove,
}: {
  todo: TodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
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
      className={`flex items-center gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="checkbox checkbox-sm"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.title}
        </p>
        {todo.scheduledDate && (
          <p className="text-xs text-base-content/60">
            📅 {todo.scheduledDate.toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(todo.id);
        }}
        className="btn btn-ghost btn-sm btn-circle"
        aria-label="할일 제거"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ========== 달력 드롭 영역 컴포넌트 ==========
import { useDroppable } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';

function CalendarDropArea({
  selectedDate,
  onDateChange,
  todos,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
}) {
  // 달력 날짜 생성
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
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
          onClick={() => onDateChange(addDays(selectedDate, -30))}
          className="btn btn-ghost btn-sm"
        >
          이전
        </button>
        <h3 className="text-lg font-semibold">{format(selectedDate, 'yyyy년 M월')}</h3>
        <button
          onClick={() => onDateChange(addDays(selectedDate, 30))}
          className="btn btn-ghost btn-sm"
        >
          다음
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
        min-h-[60px] p-2 border rounded-lg transition-colors
        ${isOver ? 'bg-primary/20 border-primary' : 'border-base-300'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isToday ? 'bg-primary/10 border-primary' : 'bg-base-100'}
      `}
    >
      <div className="text-sm font-medium mb-1">{format(date, 'd')}</div>
      {todosCount > 0 && (
        <div className="text-xs bg-primary text-primary-content rounded-full w-5 h-5 flex items-center justify-center">
          {todosCount}
        </div>
      )}
    </div>
  );
}
