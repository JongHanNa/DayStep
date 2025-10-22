'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import InboxTabs, { type InboxTabType } from '@/components/second-brain/clarify/InboxTabs';
import TodoInboxList from '@/components/second-brain/clarify/TodoInboxList';
import NoteInboxList from '@/components/second-brain/clarify/NoteInboxList';
import ProjectInboxList from '@/components/second-brain/clarify/ProjectInboxList';
import ActiveProjectsSection from '@/components/second-brain/clarify/ActiveProjectsSection';
import GTDGuideSection from '@/components/second-brain/clarify/GTDGuideSection';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import type { InboxItem, Project, CreateProjectInput } from '@/types/second-brain';

export default function ClarifyPage() {
  const { inboxItems, fetchInboxItems, fetchInboxItemsByType, deleteInboxItem } = useInboxStore();
  const { projects, createProject } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { notes, fetchNotes } = useNoteStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [activeTab, setActiveTab] = useState<InboxTabType>('todos');
  const [todoInbox, setTodoInbox] = useState<InboxItem[]>([]);
  const [noteInbox, setNoteInbox] = useState<InboxItem[]>([]);
  const [projectInbox, setProjectInbox] = useState<InboxItem[]>([]);
  const [goalInbox, setGoalInbox] = useState<InboxItem[]>([]);

  // 프로젝트 편집 모달 상태
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadInboxData();
  }, []);

  const loadInboxData = async () => {
    await fetchInboxItems();
    await fetchAreas();
    await fetchResources();
    await fetchNotes();
    await fetchGoals();
    const todos = await fetchInboxItemsByType('todo');
    const notes = await fetchInboxItemsByType('note');
    const projects = await fetchInboxItemsByType('project');
    const goals = await fetchInboxItemsByType('goal');

    setTodoInbox(todos);
    setNoteInbox(notes);
    setProjectInbox(projects);
    setGoalInbox(goals);
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

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
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
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg font-semibold text-base-content/70 mb-2">
                  목표 수집함
                </p>
                <p className="text-sm text-base-content/50">
                  목표 수집 기능은 추후 구현 예정입니다
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 구분선 */}
        <div className="divider"></div>

        {/* 진행중인 프로젝트 영역 */}
        <section>
          <ActiveProjectsSection
            projects={projects}
            goals={[]}
            onProjectClick={(project) => {
              alert(`프로젝트 상세 보기:\n${project.title}`);
            }}
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
    </div>
  );
}
