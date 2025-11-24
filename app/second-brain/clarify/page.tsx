'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { fetchInboxProjects, fetchInboxGoals } from '@/lib/supabase/inbox';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import InboxTabs, { type InboxTabType } from '@/components/second-brain/clarify/InboxTabs';
import TodoInboxList from '@/components/second-brain/clarify/TodoInboxList';
import NoteInboxList from '@/components/second-brain/clarify/NoteInboxList';
import ProjectInboxList from '@/components/second-brain/clarify/ProjectInboxList';
import GoalInboxList from '@/components/second-brain/clarify/GoalInboxList';
import ActiveProjectsSection from '@/components/second-brain/clarify/ActiveProjectsSection';
import InboxGuidePopover from '@/components/second-brain/clarify/InboxGuidePopover';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import { AuthGuard } from '@/components/auth/AuthGuard';
import type { InboxItem, Project, UpdateProjectInput, Goal, UpdateGoalInput } from '@/types/second-brain';
import { motion, PanInfo } from 'framer-motion';
import { Trash2, Edit3, X } from 'lucide-react';

export default function ClarifyPage() {
  const { appUser } = useAuth();
  const { inboxItems, loading, fetchInboxItems, fetchInboxItemsByType, deleteInboxItem } = useInboxStore();
  const { projects, fetchProjects, updateProject, deleteProject } = useProjectStore();
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

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // 스와이프 상태
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

  // 드래그/클릭 구분
  const dragStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // ✅ 모든 useEffect를 조건문 위로 이동 (React Hooks 규칙 준수)

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/clarify');
  }, []);

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

  // 외부 클릭 시 스와이프된 카드 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swipedItemId) {
        setSwipedItemId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [swipedItemId]);

  // 현재 활성화된 탭의 항목 배열 반환
  const getCurrentTabItems = (): Array<InboxItem | Project | Goal> => {
    switch (activeTab) {
      case 'todos': return todoInbox;
      case 'notes': return noteInbox;
      case 'projects': return projectInbox;
      case 'goals': return goalInbox;
      default: return [];
    }
  };

  const loadInboxData = async () => {
    if (!appUser?.id) return;

    console.log('🚀 [ClarifyPage] loadInboxData 시작');

    // 기존 데이터 로드 (Store 업데이트)
    await Promise.all([
      fetchProjects(appUser.id),
      fetchInboxItems(appUser.id),
      fetchAreas(appUser.id),
      fetchResources(appUser.id),
      fetchNotes(appUser.id),
      fetchGoals(appUser.id),
    ]);

    // 수집함 데이터 로드 (DB View: 필터링된 데이터만 조회)
    const [inboxProjects, inboxGoals] = await Promise.all([
      fetchInboxProjects(appUser.id), // DB View: 필터링된 프로젝트만 조회
      fetchInboxGoals(appUser.id),    // DB View: 필터링된 목표만 조회
    ]);

    // DB View에서 필터링된 데이터를 직접 사용
    // 클라이언트 필터링 불필요 (DB 레벨에서 이미 처리됨)
    setProjectInbox(inboxProjects);
    setGoalInbox(inboxGoals);

    // ✅ todoInbox와 noteInbox도 명시적으로 업데이트
    const currentInboxItems = useInboxStore.getState().inboxItems;
    const inboxTodos = currentInboxItems.filter((item) => item.item_type === 'todo' && item.status === 'inbox');
    const inboxNotes = currentInboxItems.filter((item) => item.item_type === 'note' && item.status === 'inbox');

    setTodoInbox(inboxTodos);
    setNoteInbox(inboxNotes);
  };

  const handleRefresh = () => {
    loadInboxData();
  };

  // 일괄 삭제 핸들러
  const handleBulkDelete = async () => {
    if (!appUser?.id || selectedIds.size === 0) return;

    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const deleteIds = Array.from(selectedIds);

      // 탭별 삭제 API 호출
      if (activeTab === 'todos' || activeTab === 'notes') {
        // InboxItem 삭제
        await Promise.all(
          deleteIds.map(id => deleteInboxItem(appUser.id!, id))
        );
      } else if (activeTab === 'projects') {
        // Project 삭제
        await Promise.all(
          deleteIds.map(id => deleteProject(appUser.id!, id))
        );
      } else if (activeTab === 'goals') {
        // Goal 삭제
        await Promise.all(
          deleteIds.map(id => deleteGoal(appUser.id!, id))
        );
      }

      // 데이터 재조회
      await loadInboxData();

      // 상태 초기화
      setSelectedIds(new Set());
      setIsEditMode(false);
    } catch (error) {
      console.error('❌ 일괄 삭제 실패:', error);
      alert('일부 항목 삭제에 실패했습니다.');
    }
  };

  // 단일 삭제 핸들러
  const handleSingleDelete = async (itemId: string) => {
    if (!appUser?.id) return;

    try {
      // 탭별 삭제 API 호출
      if (activeTab === 'todos' || activeTab === 'notes') {
        await deleteInboxItem(appUser.id, itemId);
      } else if (activeTab === 'projects') {
        await deleteProject(appUser.id, itemId);
      } else if (activeTab === 'goals') {
        await deleteGoal(appUser.id, itemId);
      }

      // 데이터 재조회
      await loadInboxData();
    } catch (error) {
      console.error('삭제 실패:', error);
      throw error;
    }
  };

  // 스와이프 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (confirm('정말 삭제하시겠습니까?')) {
      handleSingleDelete(itemId);
      setSwipedItemId(null);
    }
  };

  // Shift + 클릭 범위 선택 처리
  const handleRangeSelection = (
    currentIndex: number,
    isChecked: boolean,
    itemId: string
  ) => {
    const currentItems = getCurrentTabItems();

    if (lastSelectedIndex === null) {
      // 첫 선택: 일반 체크/해제
      const newSet = new Set(selectedIds);
      if (isChecked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      setSelectedIds(newSet);
      setLastSelectedIndex(currentIndex);
      return;
    }

    // 범위 선택: lastSelectedIndex와 currentIndex 사이의 모든 아이템
    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    const newSet = new Set(selectedIds);
    for (let i = start; i <= end; i++) {
      if (isChecked) {
        newSet.add(currentItems[i].id);
      } else {
        newSet.delete(currentItems[i].id);
      }
    }

    setSelectedIds(newSet);
    setLastSelectedIndex(currentIndex);
  };

  // 통합 선택 핸들러
  const handleSelectionChange = (
    itemId: string,
    isChecked: boolean,
    shiftKey: boolean,
    index: number
  ) => {
    if (shiftKey) {
      handleRangeSelection(index, isChecked, itemId);
    } else {
      const newSet = new Set(selectedIds);
      if (isChecked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      setSelectedIds(newSet);
      setLastSelectedIndex(index);
    }
  };

  // 프로젝트 클릭 핸들러 - Project 그대로 전달
  const handleProjectClick = (project: Project) => {
    // 날짜 형식 변환: ISO datetime을 YYYY-MM-DD로 변환
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      // ISO datetime 형식 (2025-01-15T00:00:00.000Z)을 date 형식 (2025-01-15)으로 변환
      return dateString.split('T')[0];
    };

    // area_resource_id → paraSelection 변환
    let paraSelection = '';
    if (project.area_resource_id) {
      // area인지 resource인지 구분하기 위해 areas와 resources 배열 체크
      const isArea = areas.some(a => a.id === project.area_resource_id);
      const isResource = resources.some(r => r.id === project.area_resource_id);

      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    const editData = {
      ...project,
      paraSelection,
      isNew: false,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date)
    };

    setEditingProject(editData);
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
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-base-content/70">
                  수집한 항목을 분류하고 처리하세요
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    <Edit3 className="w-4 h-4" />
                    편집
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setSelectedIds(new Set());
                      setLastSelectedIndex(null);
                    }}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 수집함 영역 */}
        <section>
          <h2 className="text-xl font-bold mb-4">수집함 비우기</h2>

          {/* 수집함 탭 */}
          <InboxTabs
            activeTab={activeTab}
            onTabChange={(newTab) => {
              setActiveTab(newTab);
              if (isEditMode) {
                setSelectedIds(new Set());
                setLastSelectedIndex(null);
              }
            }}
            counts={{
              todos: todoInbox.length,
              notes: noteInbox.length,
              projects: projectInbox.length,
              goals: goalInbox.length,
            }}
          />

          {/* 편집 모드 액션 바 */}
          {isEditMode && (
            <div className="mt-3 p-3 bg-base-100 rounded-lg flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selectedIds.size === getCurrentTabItems().length && getCurrentTabItems().length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(getCurrentTabItems().map(item => item.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                <span className="text-sm font-medium">전체 선택</span>
              </label>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="badge badge-primary">
                    {selectedIds.size}개 선택됨
                  </span>
                )}
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-error btn-sm rounded-full"
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </div>
          )}

          {/* 가이드 팝오버 */}
          <InboxGuidePopover activeTab={activeTab} />

          {/* 수집함 리스트 */}
          <div className="mt-4">
            {activeTab === 'todos' && (
              <TodoInboxList
                todos={todoInbox}
                projects={projects}
                notes={notes}
                onRefresh={handleRefresh}
                userId={appUser?.id || ''}
                isEditMode={isEditMode}
                selectedIds={selectedIds}
                swipedItemId={swipedItemId}
                onSelectionChange={handleSelectionChange}
                onSwipe={setSwipedItemId}
                onDeleteClick={handleDeleteClick}
                dragStartX={dragStartX}
                isDragging={isDragging}
              />
            )}
            {activeTab === 'notes' && (
              <NoteInboxList
                notes={noteInbox}
                areas={areas}
                resources={resources}
                projects={projects}
                todos={[]} // TODO: Todo 타입 정리 후 todos 전달
                allNotes={notes}  // 노트-노트 연결을 위한 전체 노트 목록
                onRefresh={handleRefresh}
                isEditMode={isEditMode}
                selectedIds={selectedIds}
                swipedItemId={swipedItemId}
                onSelectionChange={handleSelectionChange}
                onSwipe={setSwipedItemId}
                onDeleteClick={handleDeleteClick}
                dragStartX={dragStartX}
                isDragging={isDragging}
              />
            )}
            {activeTab === 'projects' && (
              <ProjectInboxList
                projects={projectInbox}
                onProjectClick={handleProjectClick}
                isEditMode={isEditMode}
                selectedIds={selectedIds}
                swipedItemId={swipedItemId}
                onSelectionChange={handleSelectionChange}
                onSwipe={setSwipedItemId}
                onDeleteClick={handleDeleteClick}
                dragStartX={dragStartX}
                isDragging={isDragging}
              />
            )}
            {activeTab === 'goals' && (
              <GoalInboxList
                goals={goalInbox}
                onGoalClick={handleGoalClick}
                isEditMode={isEditMode}
                selectedIds={selectedIds}
                swipedItemId={swipedItemId}
                onSelectionChange={handleSelectionChange}
                onSwipe={setSwipedItemId}
                onDeleteClick={handleDeleteClick}
                dragStartX={dragStartX}
                isDragging={isDragging}
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

      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />

      {/* 프로젝트 편집 모달 */}
      <ProjectEditDialog
        open={editDialogOpen}
        editingProject={editingProject}
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
