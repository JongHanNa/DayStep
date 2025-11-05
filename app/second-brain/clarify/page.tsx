'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useTodoStore } from '@/state/stores/todoStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import InboxTabs, { type InboxTabType } from '@/components/second-brain/clarify/InboxTabs';
import TodoInboxList from '@/components/second-brain/clarify/TodoInboxList';
import NoteInboxList from '@/components/second-brain/clarify/NoteInboxList';
import ProjectInboxList from '@/components/second-brain/clarify/ProjectInboxList';
import GoalInboxList from '@/components/second-brain/clarify/GoalInboxList';
import ActiveProjectsSection from '@/components/second-brain/clarify/ActiveProjectsSection';
import GTDGuideSection from '@/components/second-brain/clarify/GTDGuideSection';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import { AuthGuard } from '@/components/auth/AuthGuard';
import type { InboxItem, Project, UpdateProjectInput, Goal, UpdateGoalInput } from '@/types/second-brain';

export default function ClarifyPage() {
  const { appUser } = useAuth();
  const { inboxItems, loading, fetchInboxItems, fetchInboxItemsByType } = useInboxStore();
  const { projects, updateProject, deleteProject } = useProjectStore();
  const { goals, fetchGoals, updateGoal, deleteGoal } = useGoalStore();
  const { notes, fetchNotes } = useNoteStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { todos } = useTodoStore();

  // ✅ 모든 useState를 조건문 위로 이동 (React Hooks 규칙 준수)
  const [activeTab, setActiveTab] = useState<InboxTabType>('todos');
  const [todoInbox, setTodoInbox] = useState<InboxItem[]>([]);
  const [noteInbox, setNoteInbox] = useState<InboxItem[]>([]);
  const [projectInbox, setProjectInbox] = useState<Project[]>([]);
  const [goalInbox, setGoalInbox] = useState<Goal[]>([]);

  // 프로젝트 편집 모달 상태
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 목표 편집 모달 상태
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // ✅ 모든 useEffect를 조건문 위로 이동 (React Hooks 규칙 준수)
  useEffect(() => {
    if (!appUser?.id) return;  // ✅ 내부에서 appUser 체크
    loadInboxData();
  }, [appUser?.id]);  // ✅ 의존성 추가

  // inboxItems가 로드되면 필터링 (Zustand 상태 변경 감지)
  useEffect(() => {
    // ✅ loading 중이거나 데이터가 없으면 스킵
    if (loading || inboxItems.length === 0) return;

    const inboxTodos = inboxItems.filter((item) => item.item_type === 'todo' && item.status === 'inbox');
    const inboxNotes = inboxItems.filter((item) => item.item_type === 'note' && item.status === 'inbox');

    setTodoInbox(inboxTodos);
    setNoteInbox(inboxNotes);
  }, [inboxItems, loading]);

  const loadInboxData = async () => {
    if (!appUser?.id) return;

    console.log('🚀 [ClarifyPage] loadInboxData 시작');

    // 데이터 병렬 로드
    await Promise.all([
      fetchInboxItems(appUser.id),
      fetchAreas(appUser.id),
      fetchResources(appUser.id),
      fetchNotes(appUser.id),
      fetchGoals(appUser.id),
    ]);

    console.log('✅ [ClarifyPage] loadInboxData 완료');

    // 프로젝트 수집함: projects 테이블에서 조건부 필터링
    // 종료일, 할일 중 하나라도 없으면 수집함에 표시
    const inboxProjects = projects.filter((project) => {
      const hasEndDate = !!project.end_date;
      const hasTodos = (project.total_todos || 0) > 0;

      // 둘 중 하나라도 없으면 수집함에 유지
      return !(hasEndDate && hasTodos);
    });
    setProjectInbox(inboxProjects);

    // 목표 수집함: area_id/resource_id AND end_date 둘 다 있어야 제거
    // 즉, 둘 중 하나라도 없으면 수집함에 유지
    const inboxGoals = goals.filter((goal) => {
      const hasAreaOrResource = !!(goal.area_id || goal.resource_id);
      const hasEndDate = !!goal.end_date;
      return !(hasAreaOrResource && hasEndDate); // 둘 다 있으면 제거
    });
    setGoalInbox(inboxGoals);
  };

  const handleRefresh = () => {
    loadInboxData();
  };

  // 프로젝트 클릭 핸들러 - Project 그대로 전달
  const handleProjectClick = (project: Project) => {
    setEditingProject({ ...project, paraSelection: '', isNew: false });
    setEditDialogOpen(true);
  };

  // 진행중인 프로젝트 클릭 핸들러
  const handleActiveProjectClick = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      // GTD 로직: 수집함 제거 조건 체크
      // 할일 1개 이상 AND 종료일 모두 있어야 제거
      const hasTodos = (projectData.total_todos || 0) > 0;
      const hasEndDate = !!projectData.end_date;
      const shouldRemoveFromInbox = hasTodos && hasEndDate;

      // InboxItem 변환 없이 Project 업데이트만 수행
      const updateData: UpdateProjectInput = {
        title: projectData.title!,
        description: projectData.description || '',
        icon: projectData.icon!,
        color: projectData.color!,
        status: projectData.status!,
        goal_id: projectData.goal_id || undefined,
        start_date: projectData.start_date || undefined,
        end_date: projectData.end_date || undefined,
      };

      if (!appUser?.id) return;
      await updateProject(appUser.id, editingProject!.id, updateData);

      setEditDialogOpen(false);
      setEditingProject(null);
      await loadInboxData();

      if (shouldRemoveFromInbox) {
        alert('프로젝트가 수정되었습니다. 모든 조건이 충족되어 수집함에서 제거되었습니다.');
      } else {
        const missing: string[] = [];
        if (!hasTodos) missing.push('할일');
        if (!hasEndDate) missing.push('종료일');

        alert(`프로젝트가 수정되었습니다.\n수집함에서 제거하려면 ${missing.join(', ')}을(를) 배정해야 합니다.`);
      }
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 프로젝트 편집 취소
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`"${project.title}" 프로젝트를 삭제하시겠습니까?`)) return;
    if (!appUser?.id) return;

    try {
      await deleteProject(appUser.id, project.id);
      setEditDialogOpen(false);
      setEditingProject(null);
      await loadInboxData();
      alert('프로젝트가 삭제되었습니다.');
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 목표 클릭 핸들러
  const handleGoalClick = (goal: Goal) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setGoalDialogOpen(true);
  };

  // 목표 저장 핸들러
  const handleSaveGoal = async (goalData: Partial<Goal>, area_id?: string, resource_id?: string) => {
    if (!appUser?.id) return;

    try {
      // 목표 업데이트
      await updateGoal(appUser.id, editingGoal!.id, {
        title: goalData.title!,
        description: goalData.description || '',
        icon: goalData.icon,
        color: goalData.color!,
        status: goalData.status!,
        area_id,
        resource_id,
        start_date: goalData.start_date || undefined,
        end_date: goalData.end_date || undefined,
        year_goal: goalData.year_goal || undefined,
        quarter_goal: goalData.quarter_goal || undefined,
      } as UpdateGoalInput);

      // 모달 닫기 및 새로고침
      setGoalDialogOpen(false);
      setEditingGoal(null);
      await loadInboxData();

      // GTD 로직: 영역/자원 AND 종료일 둘 다 있어야 수집함에서 제거
      const hasAreaOrResource = !!(area_id || resource_id);
      const hasEndDate = !!goalData.end_date;

      if (hasAreaOrResource && hasEndDate) {
        alert('목표가 수정되었습니다. 영역/자원과 종료일이 모두 배정되어 수집함에서 제거되었습니다.');
      } else {
        const missing: string[] = [];
        if (!hasAreaOrResource) missing.push('영역/자원');
        if (!hasEndDate) missing.push('종료일');
        alert(`목표가 수정되었습니다.\n수집함에서 제거하려면 ${missing.join('과 ')}을(를) 배정해야 합니다.`);
      }
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장에 실패했습니다.');
    }
  };

  // 목표 편집 취소
  const handleCancelGoalEdit = () => {
    setGoalDialogOpen(false);
    setEditingGoal(null);
  };

  // 목표 삭제 핸들러
  const handleDeleteGoal = async (goal: Goal) => {
    if (!confirm(`"${goal.title}" 목표를 삭제하시겠습니까?`)) return;
    if (!appUser?.id) return;

    try {
      await deleteGoal(appUser.id, goal.id);
      setGoalDialogOpen(false);
      setEditingGoal(null);
      await loadInboxData();
      alert('목표가 삭제되었습니다.');
    } catch (error) {
      console.error('목표 삭제 실패:', error);
      alert('목표 삭제에 실패했습니다.');
    }
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <h1 className="text-2xl font-bold mb-1">명료화</h1>
            <p className="text-sm text-base-content/70">
              수집한 항목을 분류하고 처리하세요
            </p>
          </div>
        </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 수집함 영역 */}
        <section>
          <h2 className="text-xl font-bold mb-4">수집함 비우기</h2>

          {/* 수집함 탭 */}
          <InboxTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={{
              todos: todoInbox.length,
              notes: noteInbox.length,
              projects: projectInbox.length,
              goals: goalInbox.length,
            }}
          />

          {/* 수집함 리스트 */}
          <div className="mt-4">
            {activeTab === 'todos' && (
              <TodoInboxList
                todos={todoInbox}
                projects={projects}
                notes={notes}
                onRefresh={handleRefresh}
                userId={appUser?.id || ''}
              />
            )}
            {activeTab === 'notes' && (
              <NoteInboxList
                notes={noteInbox}
                areas={areas}
                resources={resources}
                projects={projects}
                todos={[]} // TODO: Todo 타입 정리 후 todos 전달
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'projects' && (
              <ProjectInboxList
                projects={projectInbox}
                onProjectClick={handleProjectClick}
              />
            )}
            {activeTab === 'goals' && (
              <GoalInboxList
                goals={goalInbox}
                onGoalClick={handleGoalClick}
              />
            )}
          </div>
        </section>

        {/* 구분선 */}
        <div className="divider"></div>

        {/* 진행중인 프로젝트 영역 */}
        <section>
          <ActiveProjectsSection
            projects={projects}
            goals={goals}
            onProjectClick={handleActiveProjectClick}
          />
        </section>

        {/* 구분선 */}
        <div className="divider"></div>

        {/* GTD 알고리즘 설명 영역 */}
        <section>
          <GTDGuideSection />
        </section>
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />

      {/* 프로젝트 편집 모달 */}
      <ProjectEditDialog
        open={editDialogOpen}
        editingProject={editingProject}
        goals={goals}
        areas={areas}
        resources={resources}
        onSave={handleSaveProject}
        onCancel={handleCancelEdit}
        onDelete={handleDeleteProject}
        onProjectChange={setEditingProject}
      />

      {/* 목표 편집 모달 */}
      <GoalEditDialog
        open={goalDialogOpen}
        editingGoal={editingGoal}
        areas={areas}
        resources={resources}
        projects={projects}
        onSave={handleSaveGoal}
        onCancel={handleCancelGoalEdit}
        onDelete={handleDeleteGoal}
        onGoalChange={setEditingGoal}
      />
      </div>
    </AuthGuard>
  );
}
