'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { Archive } from 'lucide-react';
import ArchiveSection from '@/components/second-brain/ArchiveSection';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import AreaResourceEditModal from '@/components/ui/AreaResourceEditModal';
import type { Goal, Project, AreaResource } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

export default function ArchivePage() {
  const { appUser } = useAuth();
  const { fetchArchivedGoals, updateGoal, deleteGoal } = useGoalStore();
  const { fetchArchivedProjects, fetchProjects, updateProject, deleteProject, projects: storeProjects } = useProjectStore();
  const { fetchArchivedAreasResources, fetchAreas, updateArea, deleteArea, areas } = useAreaStore();
  const { fetchResources, updateResource, deleteResource, resources } = useResourceStore();
  const { fetchInboxItems, inboxItems } = useInboxStore();

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/archive');
  }, []);

  // 아카이브 데이터
  const [pausedGoals, setPausedGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [pausedProjects, setPausedProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [archivedAreasResources, setArchivedAreasResources] = useState<AreaResource[]>([]);

  // 로딩 상태
  const [loading, setLoading] = useState(true);

  // 섹션 펼침/접힘 상태
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // 편집 모달 상태
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [areaResourceDialogOpen, setAreaResourceDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<(Goal & { paraSelection?: string; isNew?: boolean }) | null>(null);
  const [editingProject, setEditingProject] = useState<(Project & { paraSelection?: string; isNew?: boolean }) | null>(null);
  const [editingAreaResource, setEditingAreaResource] = useState<(AreaResource & { isNew?: boolean }) | null>(null);
  const [areaResourcePageType, setAreaResourcePageType] = useState<'area' | 'resource'>('area');

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'goal' | 'project' | 'area-resource'; id: string; title: string } | null>(null);

  // 데이터 로드
  useEffect(() => {
    if (appUser?.id) {
      loadArchiveData();
    }
  }, [appUser?.id]);

  const loadArchiveData = async () => {
    if (!appUser?.id) return;

    setLoading(true);
    try {
      // 병렬로 데이터 가져오기
      const [goals, projects, archivedItems] = await Promise.all([
        fetchArchivedGoals(appUser.id),
        fetchArchivedProjects(appUser.id),
        fetchArchivedAreasResources(appUser.id),
      ]);

      // 목표 분류 (중단 vs 완료)
      setPausedGoals(goals.filter((g) => g.status === 'paused'));
      setCompletedGoals(goals.filter((g) => g.status === 'completed'));

      // 프로젝트 분류 (중단 vs 완료)
      setPausedProjects(projects.filter((p) => p.status === 'paused'));
      setCompletedProjects(projects.filter((p) => p.status === 'completed'));

      // 아카이브된 영역/자원 (단일 함수로 중복 없이 가져옴)
      setArchivedAreasResources(archivedItems);

      // 할일 데이터, 모든 프로젝트, 영역, 자원 가져오기
      await Promise.all([
        fetchInboxItems(appUser.id),
        fetchProjects(appUser.id),
        fetchAreas(appUser.id),
        fetchResources(appUser.id),
      ]);
    } catch (error) {
      console.error('아카이브 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 목표별 하위 프로젝트 현황 계산
  const projectStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; inProgress: number; notStarted: number }>();

    // 모든 프로젝트 가져오기 (중단/완료 포함)
    const allProjects = [...pausedProjects, ...completedProjects];

    pausedGoals.concat(completedGoals).forEach((goal) => {
      const goalProjects = allProjects.filter((p) => p.goal_id === goal.id);
      map.set(goal.id, {
        total: goalProjects.length,
        inProgress: goalProjects.filter((p) => p.status === 'in_progress').length,
        notStarted: goalProjects.filter((p) => p.status === 'not_started').length,
      });
    });

    return map;
  }, [pausedGoals, completedGoals, pausedProjects, completedProjects]);

  // 프로젝트별 하위 할일 현황 계산
  const todoStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; inProgress: number; completed: number }>();

    pausedProjects.concat(completedProjects).forEach((project) => {
      const projectTodos = inboxItems.filter((todo) => todo.project_id === project.id);
      map.set(project.id, {
        total: projectTodos.length,
        inProgress: projectTodos.filter((t) => !t.is_completed).length,
        completed: projectTodos.filter((t) => t.is_completed).length,
      });
    });

    return map;
  }, [pausedProjects, completedProjects, inboxItems]);

  // 프로젝트별 목표 제목 맵
  const goalTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    const allGoals = [...pausedGoals, ...completedGoals];

    pausedProjects.concat(completedProjects).forEach((project) => {
      if (project.goal_id) {
        const goal = allGoals.find((g) => g.id === project.goal_id);
        if (goal) {
          map.set(project.id, goal.title);
        }
      }
    });

    return map;
  }, [pausedProjects, completedProjects, pausedGoals, completedGoals]);

  // 섹션 토글
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 카드 클릭 핸들러 (편집 모달 표시)
  const handleEditGoal = (item: Goal | Project | AreaResource) => {
    const goal = item as Goal;

    // paraSelection 생성 (목표 페이지와 동일한 패턴)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setGoalDialogOpen(true);
  };

  const handleEditProject = (item: Goal | Project | AreaResource) => {
    const project = item as Project;

    // paraSelection 생성 (프로젝트 페이지와 동일한 패턴)
    let paraSelection = '';

    // goal_id 처리
    if (project.goal_id) {
      paraSelection = `goal-${project.goal_id}`;
    }

    // area_resource_id 처리
    if (project.area_resource_id) {
      const isArea = areas.some(a => a.id === project.area_resource_id);
      const isResource = resources.some(r => r.id === project.area_resource_id);

      if (isArea) {
        paraSelection = `area-${project.area_resource_id}`;
      } else if (isResource) {
        paraSelection = `resource-${project.area_resource_id}`;
      }
    }

    setEditingProject({ ...project, paraSelection, isNew: false });
    setProjectDialogOpen(true);
  };

  const handleEditAreaResource = (item: Goal | Project | AreaResource) => {
    const areaResource = item as AreaResource;

    // Area인지 Resource인지 구분
    const isArea = areas.some(a => a.id === areaResource.id);
    const isResource = resources.some(r => r.id === areaResource.id);

    const pageType = isArea ? 'area' : 'resource';

    setEditingAreaResource({ ...areaResource, isNew: false });
    setAreaResourcePageType(pageType);
    setAreaResourceDialogOpen(true);
  };

  // Area/Resource 저장 핸들러
  const handleSaveAreaResource = async () => {
    if (!appUser?.id || !editingAreaResource) return;

    try {
      // UI 전용 필드(isNew 등)를 제외하고 DB 필드만 추출
      const updateData = {
        title: editingAreaResource.title!,
        icon: editingAreaResource.icon!,
        color: editingAreaResource.color!,
        status: editingAreaResource.status!,
      };

      // Area인지 Resource인지 구분하여 적절한 store 함수 호출
      if (areaResourcePageType === 'area') {
        await updateArea(appUser.id, editingAreaResource.id, updateData);
      } else {
        await updateResource(appUser.id, editingAreaResource.id, updateData);
      }

      await loadArchiveData();
      setAreaResourceDialogOpen(false);
      setEditingAreaResource(null);
    } catch (error) {
      console.error('Area/Resource 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // Area/Resource 편집 취소 핸들러
  const handleCancelAreaResourceEdit = () => {
    setAreaResourceDialogOpen(false);
    setEditingAreaResource(null);
  };

  // Area/Resource 삭제 핸들러 (삭제 확인 다이얼로그 표시)
  const handleDeleteAreaResource = () => {
    if (!editingAreaResource) return;

    setItemToDelete({
      type: 'area-resource',
      id: editingAreaResource.id,
      title: editingAreaResource.title,
    });
    setDeleteConfirmOpen(true);
    setAreaResourceDialogOpen(false);
    setEditingAreaResource(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !appUser?.id) return;

    try {
      if (itemToDelete.type === 'goal') {
        await deleteGoal(appUser.id, itemToDelete.id);
      } else if (itemToDelete.type === 'project') {
        await deleteProject(appUser.id, itemToDelete.id);
      } else if (itemToDelete.type === 'area-resource') {
        const item = archivedAreasResources.find((ar) => ar.id === itemToDelete.id);
        if (item?.status === 'archived') {
          // 영역과 자원을 구분
          const isArea = true; // TODO: 실제로는 areas 배열에서 찾아야 함
          if (isArea) {
            await deleteArea(appUser.id, itemToDelete.id);
          } else {
            await deleteResource(appUser.id, itemToDelete.id);
          }
        }
      }

      // 데이터 새로고침
      await loadArchiveData();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60 mt-1">
                  완료되거나 중단된 항목들
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto">
          {/* 중단된 목표 */}
          <ArchiveSection
            title="중단된 목표"
            items={pausedGoals}
            type="goal"
            isExpanded={expandedSections.has('paused-goals')}
            onToggle={() => toggleSection('paused-goals')}
            onEditItem={handleEditGoal}
            projectStatsMap={projectStatsMap}
            iconColor="#f59e0b"
          />

          {/* 중단된 프로젝트 */}
          <ArchiveSection
            title="중단된 프로젝트"
            items={pausedProjects}
            type="project"
            isExpanded={expandedSections.has('paused-projects')}
            onToggle={() => toggleSection('paused-projects')}
            onEditItem={handleEditProject}
            todoStatsMap={todoStatsMap}
            goalTitleMap={goalTitleMap}
            iconColor="#f59e0b"
          />

          {/* 완료된 목표 */}
          <ArchiveSection
            title="완료된 목표"
            items={completedGoals}
            type="goal"
            isExpanded={expandedSections.has('completed-goals')}
            onToggle={() => toggleSection('completed-goals')}
            onEditItem={handleEditGoal}
            projectStatsMap={projectStatsMap}
            iconColor="#10b981"
          />

          {/* 완료된 프로젝트 */}
          <ArchiveSection
            title="완료된 프로젝트"
            items={completedProjects}
            type="project"
            isExpanded={expandedSections.has('completed-projects')}
            onToggle={() => toggleSection('completed-projects')}
            onEditItem={handleEditProject}
            todoStatsMap={todoStatsMap}
            goalTitleMap={goalTitleMap}
            iconColor="#10b981"
          />

          {/* 아카이브된 영역/자원 */}
          <ArchiveSection
            title="아카이브된 영역·자원"
            items={archivedAreasResources}
            type="area-resource"
            isExpanded={expandedSections.has('archived-areas-resources')}
            onToggle={() => toggleSection('archived-areas-resources')}
            onEditItem={handleEditAreaResource}
            iconColor="#6b7280"
          />
        </div>


        {/* 목표 편집 모달 */}
        {goalDialogOpen && editingGoal && (
          <GoalEditDialog
            open={goalDialogOpen}
            editingGoal={editingGoal}
            areas={areas}
            resources={resources}
            projects={storeProjects}
            onSave={async (goalData, area_id, resource_id) => {
              if (!appUser?.id) return;

              // UI 전용 필드(isNew, paraSelection 등)를 제외하고 DB 필드만 추출
              const updateData = {
                title: goalData.title!,
                icon: goalData.icon!,
                color: goalData.color!,
                status: goalData.status!,
                area_id: area_id || undefined,
                resource_id: resource_id || undefined,
                start_date: goalData.start_date || undefined,
                end_date: goalData.end_date || undefined,
                year_goal: goalData.year_goal ?? null,
                quarter_goal: goalData.quarter_goal ?? null,
              };

              await updateGoal(appUser.id, editingGoal.id, updateData);
              await loadArchiveData();
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onCancel={() => {
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onDelete={async (goal) => {
              if (!appUser?.id) return;
              await deleteGoal(appUser.id, goal.id);
              await loadArchiveData();
              setGoalDialogOpen(false);
              setEditingGoal(null);
            }}
            onGoalChange={(goal) => {
              setEditingGoal(goal);
            }}
          />
        )}

        {/* 프로젝트 편집 모달 */}
        {projectDialogOpen && editingProject && (
          <ProjectEditDialog
            open={projectDialogOpen}
            editingProject={editingProject}
            onSave={async (projectData) => {
              if (!appUser?.id) return;

              // UI 전용 필드(isNew, paraSelection 등)를 제외하고 DB 필드만 추출
              const updateData = {
                title: projectData.title!,
                description: projectData.description || '',
                icon: projectData.icon!,
                color: projectData.color!,
                status: projectData.status!,
                goal_id: projectData.goal_id || undefined,
                area_resource_id: projectData.area_resource_id || undefined,
                start_date: projectData.start_date || undefined,
                end_date: projectData.end_date || undefined,
              };

              await updateProject(appUser.id, editingProject.id, updateData);
              await loadArchiveData();
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onCancel={() => {
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onDelete={async (project) => {
              if (!appUser?.id) return;
              await deleteProject(appUser.id, project.id);
              await loadArchiveData();
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            onProjectChange={(project) => {
              setEditingProject(project);
            }}
          />
        )}

        {/* 영역/자원 편집 모달 */}
        {areaResourceDialogOpen && editingAreaResource && (
          <AreaResourceEditModal
            open={areaResourceDialogOpen}
            editingItem={editingAreaResource}
            itemType="archive"
            pageType={areaResourcePageType}
            onCancel={handleCancelAreaResourceEdit}
            onSave={handleSaveAreaResource}
            onDelete={handleDeleteAreaResource}
            onItemChange={setEditingAreaResource}
            onItemTypeChange={(newType) => {
              // itemType 변경은 archive 고정이므로 무시
            }}
          />
        )}

        {/* 삭제 확인 다이얼로그 */}
        {deleteConfirmOpen && itemToDelete && (
          <dialog open className="modal modal-bottom sm:modal-middle">
            <div className="modal-box">
              <h3 className="font-bold text-lg">삭제 확인</h3>
              <p className="py-4">
                &quot;{itemToDelete.title}&quot;을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="modal-action">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setItemToDelete(null);
                  }}
                  className="btn"
                >
                  취소
                </button>
                <button onClick={handleDeleteConfirm} className="btn btn-error">
                  삭제
                </button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setDeleteConfirmOpen(false)} />
          </dialog>
        )}
      </div>
    </AuthGuard>
  );
}
