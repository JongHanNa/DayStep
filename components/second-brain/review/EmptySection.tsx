'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useAuth } from '@/app/context/AuthContext';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import InboxListSection from '@/components/second-brain/clarify/InboxListSection';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import { fetchInboxProjects, fetchInboxGoals } from '@/lib/supabase/inbox';
import type { Project, Goal, UpdateProjectInput, UpdateGoalInput } from '@/types/second-brain';

interface EmptySectionProps {
  isExpanded: boolean;
}

export default function EmptySection({ isExpanded }: EmptySectionProps) {
  const { user } = useAuth();
  const {
    emptyChecklists,
    checklistStates,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
  } = useReviewStore();

  const { inboxItems, fetchInboxItems, deleteInboxItem } = useInboxStore();
  const { projects, updateProject, deleteProject } = useProjectStore();
  const { notes } = useNoteStore();
  const { goals, updateGoal, deleteGoal } = useGoalStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();

  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');

  // 프로젝트 편집 모달 상태
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 목표 편집 모달 상태
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  // 프로젝트/목표 수집함 상태 (DB View에서 로드)
  const [projectItems, setProjectItems] = useState<Project[]>([]);
  const [goalItems, setGoalItems] = useState<Goal[]>([]);

  // 프로젝트/목표 수집함 데이터 로드 (명료화 페이지와 동일한 DB View 사용)
  useEffect(() => {
    const loadInboxData = async () => {
      if (!user) return;
      const [inboxProjects, inboxGoals] = await Promise.all([
        fetchInboxProjects(user.id),
        fetchInboxGoals(user.id),
      ]);
      setProjectItems(inboxProjects);
      setGoalItems(inboxGoals);
    };
    loadInboxData();
  }, [user]);

  // 체크리스트 항목별 체크 상태 확인
  const isChecked = (itemId: string) => {
    return checklistStates.get(itemId)?.is_checked || false;
  };

  // 새 매체 추가 핸들러
  const handleAddSource = async () => {
    if (!user || !newSourceLabel.trim()) return;

    try {
      await addChecklistItem(user.id, 'empty', newSourceLabel.trim());
      setNewSourceLabel('');
      setIsAddingSource(false);
    } catch (error) {
      console.error('Failed to add source:', error);
    }
  };

  // 커스텀 매체 삭제
  const handleRemoveSource = async (itemId: string) => {
    if (!user) return;
    if (!confirm('이 수집 매체를 삭제하시겠습니까?')) return;

    try {
      await removeChecklistItem(user.id, itemId);
    } catch (error) {
      console.error('Failed to remove source:', error);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    // inboxItems와 프로젝트/목표 수집함 모두 새로고침
    await Promise.all([
      fetchInboxItems(user.id),
      (async () => {
        const [inboxProjects, inboxGoals] = await Promise.all([
          fetchInboxProjects(user.id),
          fetchInboxGoals(user.id),
        ]);
        setProjectItems(inboxProjects);
        setGoalItems(inboxGoals);
      })(),
    ]);
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      return dateString.split('T')[0];
    };

    let paraSelection = '';
    if (project.area_resource_id) {
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

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!user || !editingProject) return;

    try {
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

      await updateProject(user.id, editingProject.id, updateData);
      setEditDialogOpen(false);
      setEditingProject(null);
      handleRefresh();
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
    if (!user) return;

    try {
      await deleteProject(user.id, project.id);
      setEditDialogOpen(false);
      setEditingProject(null);
      handleRefresh();
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 목표 클릭 핸들러
  const handleGoalClick = (goal: Goal) => {
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
    if (!user || !editingGoal) return;

    try {
      await updateGoal(user.id, editingGoal.id, {
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

      setGoalDialogOpen(false);
      setEditingGoal(null);
      handleRefresh();
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
    if (!user) return;

    try {
      await deleteGoal(user.id, goal.id);
      setGoalDialogOpen(false);
      setEditingGoal(null);
      handleRefresh();
    } catch (error) {
      console.error('목표 삭제 실패:', error);
      alert('목표 삭제에 실패했습니다.');
    }
  };

  // 수집함 카운트 및 필터링
  const todos = inboxItems.filter((item) => item.item_type === 'todo');
  const noteItems = inboxItems.filter((item) => item.item_type === 'note');

  // projectItems, goalItems는 이제 useState + useEffect로 DB View에서 로드됨 (위 참조)

  if (!isExpanded) return null;
  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* 수집 매체 체크리스트 */}
      <div className="p-4 bg-base-200 rounded-lg">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="text-lg">📥</span>
          어디부터 점검해볼까요
        </h4>

        {/* 체크박스 그리드 (3컬럼) */}
        <div className="grid grid-cols-3 gap-3">
          {emptyChecklists.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked(item.id)}
                  onChange={() => user && toggleChecklistItem(user.id, item.id)}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">{item.label}</span>
              </label>
              {!item.is_default && (
                <button
                  onClick={() => handleRemoveSource(item.id)}
                  className="btn btn-ghost btn-xs text-error"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 새로운 매체 추가 */}
        {isAddingSource ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newSourceLabel}
              onChange={(e) => setNewSourceLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
              placeholder="새로운 수집 매체 입력"
              className="input input-sm flex-1 border-2"
              autoFocus
            />
            <button onClick={handleAddSource} className="btn btn-primary btn-sm rounded-full">
              추가
            </button>
            <button
              onClick={() => {
                setIsAddingSource(false);
                setNewSourceLabel('');
              }}
              className="btn btn-ghost btn-sm rounded-full"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingSource(true)}
            className="btn btn-ghost btn-sm rounded-full mt-3"
          >
            <Plus className="w-4 h-4" />
            새로운 매체 추가
          </button>
        )}
      </div>

      {/* 수집함 비우기 섹션 (명료화 페이지와 동일) */}
      <div className="bg-base-200 rounded-lg p-4">
        <InboxListSection
        todos={todos}
        noteItems={noteItems}
        projects={projectItems}
        goals={goalItems}
        allProjects={projects}
        allNotes={notes}
        areas={areas}
        resources={resources}
        onRefresh={handleRefresh}
        userId={user.id}
        onProjectClick={handleProjectClick}
        onGoalClick={handleGoalClick}
        onSingleDelete={async (itemId, tab) => {
          if (tab === 'todos' || tab === 'notes') {
            await deleteInboxItem(user.id, itemId);
          } else if (tab === 'projects') {
            await deleteProject(user.id, itemId);
          } else if (tab === 'goals') {
            await deleteGoal(user.id, itemId);
          }
          handleRefresh();
        }}
      />
      </div>

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
  );
}
