'use client';

import { useState, useMemo } from 'react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { DndContext } from '@dnd-kit/core';
import { useDndKit } from '@/hooks/useDndKit';
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import ProjectTabs from '@/components/second-brain/plan/ProjectTabs';
import UnscheduledTodosList from '@/components/second-brain/plan/UnscheduledTodosList';
import DateAssignmentArea from '@/components/second-brain/plan/DateAssignmentArea';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';

// 목 프로젝트 데이터
const MOCK_PROJECTS = [
  { id: '1', title: '홈페이지 리뉴얼', status: 'active' as const, color: '#3B82F6', icon: 'lucide-Laptop' },
  { id: '2', title: '운동 루틴', status: 'active' as const, color: '#10B981', icon: 'lucide-Dumbbell' },
  { id: '3', title: '블로그 글쓰기', status: 'active' as const, color: '#8B5CF6', icon: 'lucide-FileText' },
  { id: '4', title: '여행 계획', status: 'not_started' as const, color: '#F59E0B', icon: 'lucide-Plane' },
  { id: '5', title: '독서 모임', status: 'not_started' as const, color: '#EC4899', icon: 'lucide-Book' },
];

// 목 노트 데이터
const MOCK_NOTES = [
  { id: '1', title: '프로젝트 아이디어', createdAt: new Date('2025-01-20') },
  { id: '2', title: '회의록', createdAt: new Date('2025-01-22') },
  { id: '3', title: '학습 자료', createdAt: new Date('2025-01-23') },
];

// 목 할일 데이터
const MOCK_TODOS = [
  // 기한지남 (scheduledDate < today, !completed)
  { id: '1', title: '디자인 시안 최종 검토', scheduledDate: new Date('2025-01-23'), completed: false, clarification: '다음행동' as const },
  { id: '2', title: '클라이언트 피드백 정리', scheduledDate: new Date('2025-01-24'), completed: false },

  // 다음행동 (clarification='다음행동', !scheduledDate)
  { id: '3', title: '고객 미팅 일정 잡기', clarification: '다음행동' as const, nextActionStatuses: ['전화', '이메일'], completed: false },
  { id: '4', title: '프로젝트 킥오프 준비', clarification: '다음행동' as const, nextActionStatuses: ['자료준비'], completed: false },

  // 프로젝트별 (!scheduledDate, projectIds)
  { id: '5', title: '메인 페이지 개발', projectIds: ['1'], clarification: '프로젝트' as const, completed: false },
  { id: '6', title: '데이터베이스 스키마 설계', projectIds: ['1'], completed: false },
  { id: '7', title: '스쿼트 3세트', projectIds: ['2'], completed: false },
  { id: '8', title: '러닝 30분', projectIds: ['2'], completed: false },
  { id: '9', title: 'React 성능 최적화 글 작성', projectIds: ['3'], completed: false },

  // 대기중 (clarification='대기중', !scheduledDate)
  { id: '10', title: '계약서 법무팀 검토 대기', clarification: '대기중' as const, completed: false },
  { id: '11', title: '디자이너 리소스 확인 대기', clarification: '대기중' as const, completed: false },

  // 오늘
  { id: '12', title: '팀 주간 회의', scheduledDate: new Date(), startTime: '14:00', endTime: '15:00', completed: false, clarification: '다음행동' as const },
  { id: '13', title: '코드 리뷰', scheduledDate: new Date(), completed: false },
  { id: '14', title: '운동하기', scheduledDate: new Date(), completed: false, isHighlight: true },

  // 내일
  { id: '15', title: '월간 보고서 작성', scheduledDate: addDays(new Date(), 1), completed: false, clarification: '다음행동' as const },
  { id: '16', title: '1on1 미팅', scheduledDate: addDays(new Date(), 1), startTime: '15:00', endTime: '16:00', completed: false },

  // 이번주
  { id: '17', title: '분기 계획 수립', scheduledDate: addDays(new Date(), 2), completed: false },
  { id: '18', title: '기술 스터디', scheduledDate: addDays(new Date(), 3), startTime: '19:00', endTime: '21:00', completed: false },
  { id: '19', title: '프로젝트 회고', scheduledDate: addDays(new Date(), 4), completed: false },
  { id: '20', title: '주말 등산', scheduledDate: addDays(new Date(), 5), completed: false, isHighlight: true },
];

export default function PlanPage() {
  // 목데이터 상태
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [todos, setTodos] = useState(MOCK_TODOS);

  // 선택된 프로젝트 상태
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFilterType, setProjectFilterType] = useState<'active' | 'not_started'>('active');

  // 편집 모달 상태
  const [selectedTodo, setSelectedTodo] = useState<TodoFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 로컬 할일 업데이트 함수
  const updateTodo = async (id: string, updates: any) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // 할일 클릭 핸들러
  const handleTodoClick = (todo: any) => {
    // any 타입 todo를 TodoFormData로 변환
    const formData: TodoFormData = {
      title: todo.title || '',
      scheduledDate: todo.scheduledDate,
      startTime: todo.startTime,
      endTime: todo.endTime,
      isHighlight: todo.isHighlight || false,
      isAllDay: todo.isAllDay || false,
      completed: todo.completed || false,
      clarification: todo.clarification,
      projectIds: todo.projectIds || [],
      noteIds: todo.noteIds || [],
      nextActionStatuses: todo.nextActionStatuses || [],
    };
    setSelectedTodo(formData);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTodo(null);
  };

  // 할일 저장 핸들러
  const handleSaveTodo = (updatedTodo: TodoFormData) => {
    if (selectedTodo) {
      // 현재는 목데이터이므로 업데이트는 생략
      // 실제 구현에서는 updateTodo 호출
      console.log('Updated todo:', updatedTodo);
    }
    handleCloseModal();
  };

  // 할일 변경 핸들러
  const handleTodoChange = (updatedTodo: TodoFormData) => {
    setSelectedTodo(updatedTodo);
  };

  // 프로젝트 CRUD 핸들러 (목데이터)
  const handleCreateProject = async (title: string) => {
    const newProject = {
      id: `project-${Date.now()}`,
      title,
      status: 'active' as const,
      color: '#3B82F6',
      icon: 'lucide-Folder' as const,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const handleUpdateProject = async (id: string, title: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
  };

  const handleDeleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // 노트 CRUD 핸들러 (목데이터)
  const handleCreateNote = async (title: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      title,
      createdAt: new Date(),
    };
    setNotes(prev => [...prev, newNote]);
    return newNote;
  };

  const handleUpdateNote = async (id: string, title: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n));
  };

  const handleDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.status === projectFilterType);
  }, [projects, projectFilterType]);

  // 할일 필터링
  const overdueTodos = useMemo(() => {
    return todos.filter((t: any) => {
      if (!t.scheduledDate || t.completed) {
        return false;
      }
      const scheduleDate = typeof t.scheduledDate === 'string' ? new Date(t.scheduledDate) : t.scheduledDate;
      return isBefore(scheduleDate, startOfDay(new Date()));
    });
  }, [todos]);

  const nextActionTodos = useMemo(() => {
    return todos.filter((t: any) => t.clarification === '다음행동' && !t.scheduledDate);
  }, [todos]);

  const projectTodos = useMemo(() => {
    return todos.filter((t: any) => {
      if (t.scheduledDate) {
        return false;
      }
      if (!selectedProjectId) {
        return !t.projectIds || t.projectIds.length === 0;
      }
      return t.projectIds?.includes(selectedProjectId);
    });
  }, [todos, selectedProjectId]);

  const waitingTodos = useMemo(() => {
    return todos.filter((t: any) => t.clarification === '대기중' && !t.scheduledDate);
  }, [todos]);

  const todayTodos = useMemo(() => {
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    return todos.filter((t: any) => {
      if (!t.scheduledDate) {
        return false;
      }
      const scheduleDate = typeof t.scheduledDate === 'string' ? new Date(t.scheduledDate) : t.scheduledDate;
      return format(scheduleDate, 'yyyy-MM-dd') === today;
    });
  }, [todos]);

  const tomorrowTodos = useMemo(() => {
    const tomorrow = format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');
    return todos.filter((t: any) => {
      if (!t.scheduledDate) {
        return false;
      }
      const scheduleDate = typeof t.scheduledDate === 'string' ? new Date(t.scheduledDate) : t.scheduledDate;
      return format(scheduleDate, 'yyyy-MM-dd') === tomorrow;
    });
  }, [todos]);

  // 드래그 앤 드롭 핸들러
  const { sensors, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps } = useDndKit({
    onDragEnd: async (active, over) => {
      if (!over || !over.id) return;

      const todoId = active.id as string;
      const overIdString = over.id as string;

      // 날짜 형식: yyyy-MM-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(overIdString)) {
        const scheduledDate = new Date(overIdString);
        if (isNaN(scheduledDate.getTime())) {
          return;
        }

        // 할일의 날짜 업데이트
        await updateTodo(todoId, { scheduledDate } as any);
      }
    },
  });

  // 기한 지난 할일 초기화
  const handleResetOverdueTodos = async () => {
    if (!confirm('기한 지난 할일들의 날짜와 명료화 속성을 초기화하시겠습니까?')) {
      return;
    }

    for (const todo of overdueTodos) {
      await updateTodo(todo.id, {
        scheduledDate: undefined,
        clarification: undefined,
      } as any);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDndEnd} {...dndContextProps}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className={`max-w-7xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <h1 className="text-2xl font-bold">계획</h1>
            <p className="text-sm text-base-content/70">
              날짜가 없는 할일들에게 날짜를 배정하세요
            </p>
          </div>
        </div>

        {/* 상단 프로젝트 탭 */}
        <ProjectTabs
          projects={filteredProjects}
          selectedProjectId={selectedProjectId}
          projectFilterType={projectFilterType}
          onProjectSelect={setSelectedProjectId}
          onProjectFilterChange={setProjectFilterType}
        />

        {/* 메인 콘텐츠: 좌우 분할 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 날짜 설정 필요 */}
            <UnscheduledTodosList
              overdueTodos={overdueTodos}
              nextActionTodos={nextActionTodos}
              projectTodos={projectTodos}
              waitingTodos={waitingTodos}
              onResetOverdue={handleResetOverdueTodos}
              onTodoClick={handleTodoClick}
            />

            {/* 우측: 날짜 영역 */}
            <DateAssignmentArea
              todayTodos={todayTodos}
              tomorrowTodos={tomorrowTodos}
              allTodos={todos}
              onTodoClick={handleTodoClick}
            />
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />
      </div>

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={isModalOpen}
        todo={selectedTodo}
        onClose={handleCloseModal}
        onSave={handleSaveTodo}
        onChange={handleTodoChange}
        projects={projects}
        notes={notes}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        titlePlaceholder="할일 제목을 입력하세요"
      />
    </DndContext>
  );
}
