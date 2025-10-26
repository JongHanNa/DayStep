'use client';

import { useState, useMemo, useEffect } from 'react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { DndContext } from '@dnd-kit/core';
import { useDndKit } from '@/hooks/useDndKit';
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import ProjectTabs from '@/components/second-brain/plan/ProjectTabs';
import UnscheduledTodosList from '@/components/second-brain/plan/UnscheduledTodosList';
import DateAssignmentArea from '@/components/second-brain/plan/DateAssignmentArea';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import type { Note, InboxItem } from '@/types/second-brain';

// 목 노트 데이터
const MOCK_NOTES: Note[] = [
  {
    id: '1',
    user_id: 'mock-user',
    title: '프로젝트 아이디어',
    content: '',
    memo_type: 'note',
    tags: [],
    is_pinned: false,
    created_at: new Date('2025-01-20').toISOString(),
    updated_at: new Date('2025-01-20').toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user',
    title: '회의록',
    content: '',
    memo_type: 'note',
    tags: [],
    is_pinned: false,
    created_at: new Date('2025-01-22').toISOString(),
    updated_at: new Date('2025-01-22').toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user',
    title: '학습 자료',
    content: '',
    memo_type: 'reference',
    tags: [],
    is_pinned: false,
    created_at: new Date('2025-01-23').toISOString(),
    updated_at: new Date('2025-01-23').toISOString(),
  },
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
  // 프로젝트 스토어에서 데이터 가져오기
  const projects = useProjectStore(state => state.projects);
  const createProject = useProjectStore(state => state.createProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const deleteProject = useProjectStore(state => state.deleteProject);

  // InboxStore에서 할일 데이터 가져오기
  const inboxItems = useInboxStore(state => state.inboxItems);
  const fetchInboxItems = useInboxStore(state => state.fetchInboxItems);
  const updateInboxItem = useInboxStore(state => state.updateInboxItem);

  // 목데이터 상태
  const [notes, setNotes] = useState(MOCK_NOTES);

  // 초기 데이터 로드
  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  // 선택된 프로젝트 상태
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectFilterType, setProjectFilterType] = useState<'active' | 'not_started'>('active');

  // 편집 모달 상태
  const [selectedTodo, setSelectedTodo] = useState<TodoFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 할일 클릭 핸들러
  const handleTodoClick = (item: InboxItem) => {
    // InboxItem을 TodoFormData로 변환
    const formData: TodoFormData = {
      title: item.content || '',
      scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : undefined,
      startTime: undefined, // InboxItem에는 없음
      endTime: undefined,   // InboxItem에는 없음
      isHighlight: item.is_highlight || false,
      completed: item.is_completed || false,
      clarification: item.clarification,
      projectIds: item.project_id ? [item.project_id] : [],
      noteIds: [], // InboxItem에는 없음
      nextActionStatuses: item.next_action_status ? item.next_action_status.split(', ') : [],
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
  const handleSaveTodo = async (updatedTodo: TodoFormData) => {
    // 현재 편집 중인 InboxItem 찾기
    const currentItem = inboxItems.find(item => item.content === selectedTodo?.title);

    if (!currentItem) {
      console.error('편집 중인 할일을 찾을 수 없습니다.');
      handleCloseModal();
      return;
    }

    try {
      // InboxStore 업데이트
      await updateInboxItem(currentItem.id, {
        content: updatedTodo.title,
        scheduled_date: updatedTodo.scheduledDate ? updatedTodo.scheduledDate.toISOString() : undefined,
        is_highlight: updatedTodo.isHighlight,
        is_completed: updatedTodo.completed,
        clarification: updatedTodo.clarification,
        project_id: updatedTodo.projectIds?.[0],
        next_action_status: updatedTodo.nextActionStatuses?.join(', '),
      });

      handleCloseModal();
    } catch (error) {
      console.error('할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 할일 변경 핸들러
  const handleTodoChange = (updatedTodo: TodoFormData) => {
    setSelectedTodo(updatedTodo);
  };

  // 프로젝트 CRUD 핸들러
  const handleCreateProject = async (title: string) => {
    const newProject = await createProject({
      title,
      status: 'active',
      color: '#3B82F6',
      icon: 'lucide-Folder',
      order_index: projects.length, // 마지막 순서로 추가
    });
    return newProject;
  };

  const handleUpdateProject = async (id: string, title: string) => {
    await updateProject(id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
  };

  // 노트 CRUD 핸들러 (목데이터)
  const handleCreateNote = async (title: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      user_id: 'mock-user',
      title,
      content: '',
      memo_type: 'note',
      tags: [],
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

  // 할일 필터링 (InboxItem 기반)
  const overdueTodos = useMemo(() => {
    return inboxItems.filter((item: InboxItem) => {
      if (!item.scheduled_date || item.is_completed) {
        return false;
      }
      const scheduleDate = new Date(item.scheduled_date);
      return isBefore(scheduleDate, startOfDay(new Date()));
    });
  }, [inboxItems]);

  const nextActionTodos = useMemo(() => {
    return inboxItems.filter((item: InboxItem) => item.clarification === '다음행동' && !item.scheduled_date);
  }, [inboxItems]);

  const projectTodos = useMemo(() => {
    return inboxItems.filter((item: InboxItem) => {
      if (item.scheduled_date) {
        return false;
      }
      if (!selectedProjectId) {
        return !item.project_id;
      }
      return item.project_id === selectedProjectId;
    });
  }, [inboxItems, selectedProjectId]);

  const waitingTodos = useMemo(() => {
    return inboxItems.filter((item: InboxItem) => item.clarification === '대기중' && !item.scheduled_date);
  }, [inboxItems]);

  const todayTodos = useMemo(() => {
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    return inboxItems.filter((item: InboxItem) => {
      if (!item.scheduled_date) {
        return false;
      }
      const scheduleDate = new Date(item.scheduled_date);
      return format(scheduleDate, 'yyyy-MM-dd') === today;
    });
  }, [inboxItems]);

  const tomorrowTodos = useMemo(() => {
    const tomorrow = format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');
    return inboxItems.filter((item: InboxItem) => {
      if (!item.scheduled_date) {
        return false;
      }
      const scheduleDate = new Date(item.scheduled_date);
      return format(scheduleDate, 'yyyy-MM-dd') === tomorrow;
    });
  }, [inboxItems]);

  // 드래그 앤 드롭 핸들러
  const { sensors, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps } = useDndKit({
    onDragEnd: async (active, over) => {
      if (!over || !over.id) return;

      const itemId = active.id as string;
      const overIdString = over.id as string;

      // 날짜 형식: yyyy-MM-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(overIdString)) {
        const scheduledDate = new Date(overIdString);
        if (isNaN(scheduledDate.getTime())) {
          return;
        }

        // InboxItem의 날짜 업데이트
        await updateInboxItem(itemId, {
          scheduled_date: scheduledDate.toISOString(),
        });
      }
    },
  });

  // 기한 지난 할일 초기화
  const handleResetOverdueTodos = async () => {
    if (!confirm('기한 지난 할일들의 날짜와 명료화 속성을 초기화하시겠습니까?')) {
      return;
    }

    for (const item of overdueTodos) {
      await updateInboxItem(item.id, {
        scheduled_date: undefined,
        clarification: undefined,
      });
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
              allTodos={inboxItems}
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
