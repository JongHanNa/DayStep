'use client';

import { useEffect, useState } from 'react';
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
import type { InboxItem, Project, CreateProjectInput, Goal, UpdateGoalInput } from '@/types/second-brain';

export default function ClarifyPage() {
  const { inboxItems, fetchInboxItems, fetchInboxItemsByType, deleteInboxItem } = useInboxStore();
  const { projects, createProject } = useProjectStore();
  const { goals, fetchGoals, updateGoal, deleteGoal } = useGoalStore();
  const { notes, fetchNotes } = useNoteStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { todos } = useTodoStore();

  const [activeTab, setActiveTab] = useState<InboxTabType>('todos');
  const [todoInbox, setTodoInbox] = useState<InboxItem[]>([]);
  const [noteInbox, setNoteInbox] = useState<InboxItem[]>([]);
  const [projectInbox, setProjectInbox] = useState<InboxItem[]>([]);
  const [goalInbox, setGoalInbox] = useState<Goal[]>([]);

  // 프로젝트 편집 모달 상태
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 목표 편집 모달 상태
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  useEffect(() => {
    loadInboxData();
  }, []);

  const loadInboxData = async () => {
    await fetchInboxItems();
    await fetchAreas();
    await fetchResources();
    await fetchNotes();
    await fetchGoals();
    const inboxTodos = await fetchInboxItemsByType('todo');
    const inboxNotes = await fetchInboxItemsByType('note');
    const inboxProjects = await fetchInboxItemsByType('project');

    setTodoInbox(inboxTodos);
    setNoteInbox(inboxNotes);
    setProjectInbox(inboxProjects);

    // 목표 수집함: area_id, resource_id, target_date가 모두 없는 목표
    const inboxGoals = goals.filter(
      (goal) => !goal.area_id && !goal.resource_id && !goal.target_date
    );
    setGoalInbox(inboxGoals);
  };

  const handleRefresh = () => {
    loadInboxData();
  };

  // 프로젝트 클릭 핸들러 - InboxItem을 Project 형식으로 변환
  const handleProjectClick = (inboxProject: InboxItem) => {
    const projectData: Project & { isNew?: boolean; paraSelection?: string } = {
      id: inboxProject.id,
      user_id: inboxProject.user_id,
      title: inboxProject.content,
      description: '',
      status: 'not_started',
      icon: 'lucide-FolderOpen',
      color: '#A8DADC',
      order_index: 0,
      total_todos: 0,
      completed_todos: 0,
      progress: 0,
      created_at: inboxProject.created_at,
      updated_at: inboxProject.updated_at,
      isNew: false,
      paraSelection: '',
    };

    setEditingProject(projectData);
    setEditDialogOpen(true);
  };

  // 진행중인 프로젝트 클릭 핸들러
  const handleActiveProjectClick = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>, area_id?: string, resource_id?: string) => {
    try {
      // 1. InboxItem 삭제 (프로젝트 수집함에서 제거)
      await deleteInboxItem(editingProject!.id);

      // 2. 실제 Project로 생성
      const createData: CreateProjectInput = {
        title: projectData.title!,
        description: projectData.description || '',
        icon: projectData.icon || 'lucide-FolderOpen',
        color: projectData.color || '#A8DADC',
        status: projectData.status || 'not_started',
        goal_id: projectData.goal_id,
        area_id,
        resource_id,
        start_date: projectData.start_date,
        target_end_date: projectData.target_end_date,
        order_index: projects.length,
      };

      await createProject(createData);

      // 3. 모달 닫기 및 새로고침
      setEditDialogOpen(false);
      setEditingProject(null);
      await loadInboxData();

      alert('프로젝트가 생성되었습니다.');
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

    try {
      await deleteInboxItem(project.id);
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
    try {
      // 목표 업데이트
      await updateGoal(editingGoal!.id, {
        title: goalData.title!,
        description: goalData.description || '',
        icon: goalData.icon,
        color: goalData.color!,
        status: goalData.status!,
        area_id,
        resource_id,
        start_date: goalData.start_date || undefined,
        target_date: goalData.target_date || undefined,
        timeframe: goalData.timeframe,
        target_year: goalData.target_year || undefined,
        target_quarter: goalData.target_quarter || undefined,
      } as UpdateGoalInput);

      // 모달 닫기 및 새로고침
      setGoalDialogOpen(false);
      setEditingGoal(null);
      await loadInboxData();

      // 수집함 조건 확인
      const hasAreaOrResource = area_id || resource_id;
      const hasTargetDate = goalData.target_date;

      if (hasAreaOrResource || hasTargetDate) {
        alert('목표가 수정되었습니다. 영역/자원 또는 종료일이 배정되어 수집함에서 제거되었습니다.');
      } else {
        alert('목표가 수정되었습니다.');
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

    try {
      await deleteGoal(goal.id);
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
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
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
  );
}
